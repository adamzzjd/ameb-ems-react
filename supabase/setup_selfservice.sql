-- ============================================================================
-- AMEB EMS — Employee self-service (PSN update portal)
-- ----------------------------------------------------------------------------
-- An officer opens the portal, enters their staff number (PSN), and the
-- register entry is loaded. They edit what needs changing and submit it for
-- review. NOTHING is written to the staff record at that point: the proposed
-- changes go into `employee_update_requests` with status 'pending'.
--
--   OFFICER  self_service_lookup(psn)          — load the record for that PSN.
--   OFFICER  self_service_submit(psn, changes) — queue a change request.
--
--   ADMIN    self_service_requests(status)     — the review queue (pending by
--                                                default, or approved/rejected).
--   ADMIN    self_service_decide(id, decision) — approve (applies the changes
--                                                to the register) or reject
--                                                with a note.
--   ADMIN    reset_self_service_lock(psn)      — clears the post-approval lock
--                                                so the officer can submit again.
--
-- SECURITY MODEL
--   * Lookup is PSN-only (as requested): knowing a staff number reveals that
--     officer's editable record. There is no anonymous write path — submit
--     only queues a request, and only an admin (admin / super_admin) can
--     approve it, so a PSN alone can never change the register.
--   * One pending request per officer, and an officer whose request has been
--     approved cannot submit again until an admin unlocks them.
--   * Every submission and every decision is written to audit_log.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run (or `node
--      scripts/run-sql.mjs supabase/setup_selfservice.sql`).
--   2. Safe to run multiple times.
-- ============================================================================

-- ── 1. Columns used by the portal (idempotent) ─────────────────────────────
alter table public.employees add column if not exists address text;
alter table public.employees add column if not exists self_service_submitted_at timestamptz;

-- ── 2. Superseded designs (pre-production cleanup) ─────────────────────────
drop table if exists public.employee_registrations;
drop function if exists public.check_employee_registration(text);
drop function if exists public.submit_employee_registration(text, jsonb);

-- The token / failed-attempt design is gone: lookup is PSN-only and a submit
-- is reviewed by a human. The old tables are kept (empty in practise) so no
-- production data is destroyed, but nothing reads or writes them any more.
drop function if exists public.self_service_verify(text, text);
drop function if exists public.self_service_note_failure(text);

-- ── 3. Review queue ────────────────────────────────────────────────────────
create table if not exists public.employee_update_requests (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  psn            text not null,
  changes        jsonb not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid,
  reviewer_email text,
  review_note    text
);
alter table public.employee_update_requests enable row level security;

create index if not exists employee_update_requests_status_idx
  on public.employee_update_requests (status, submitted_at desc);

-- At most one request waiting for review per officer.
create unique index if not exists employee_update_requests_one_pending
  on public.employee_update_requests (employee_id)
  where status = 'pending';

-- ── 4. Shared JSON shape (internal only) ───────────────────────────────────
-- One definition of "the editable profile", used by lookup and by the review
-- queue so the admin sees exactly the fields the officer saw.
create or replace function public.self_service_employee_json(p public.employees)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'psn', p.psn,
    'name', p.name,
    'gender', p.gender,
    'grade', p.grade,
    'cadre', p.cadre,
    'date_first_appt', p.date_first_appt,
    'date_present_appt', p.date_present_appt,
    'dob', p.dob,
    'phone', p.phone,
    'lga', p.lga,
    'station', p.station,
    'address', p.address,
    'photo', p.photo,
    'step', p.step,
    'remarks', p.remarks
  );
$$;

revoke all on function public.self_service_employee_json(public.employees) from public;
revoke execute on function public.self_service_employee_json(public.employees)
  from anon, authenticated, service_role;

-- ── 5. Officer step 1 — load the record for a PSN ──────────────────────────
drop function if exists public.self_service_lookup(text);
create or replace function public.self_service_lookup(psn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_psn     text := upper(trim(coalesce(psn, '')));
  v_emp     public.employees%rowtype;
  v_pending boolean;
begin
  if v_psn = '' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_emp
    from public.employees e
   where upper(trim(e.psn)) = v_psn
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select exists (
    select 1 from public.employee_update_requests r
     where r.employee_id = v_emp.id and r.status = 'pending'
  ) into v_pending;

  return jsonb_build_object(
    'ok', true,
    'already_submitted', v_emp.self_service_submitted_at is not null,
    'pending', v_pending,
    'profile', public.self_service_employee_json(v_emp)
  );
end;
$$;

revoke all on function public.self_service_lookup(text) from public;
grant execute on function public.self_service_lookup(text) to anon;
grant execute on function public.self_service_lookup(text) to authenticated;

-- ── 6. Officer step 2 — queue the changes for review ───────────────────────
-- The old direct-apply signature; drop it so it can never be called again.
drop function if exists public.self_service_submit(uuid, jsonb);
drop function if exists public.self_service_submit(text, jsonb);
create or replace function public.self_service_submit(psn text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_psn       text := upper(trim(coalesce(psn, '')));
  v_emp       public.employees%rowtype;
  v_allowed   text[] := array[
    'name', 'gender', 'grade', 'cadre',
    'date_first_appt', 'date_present_appt', 'dob',
    'phone', 'lga', 'station', 'address', 'photo',
    'step', 'remarks'
  ];
  v_date_keys text[] := array['date_first_appt', 'date_present_appt', 'dob'];
  v_key       text;
  v_value     text;
  v_id        uuid;
begin
  if v_psn = '' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_emp
    from public.employees e
   where upper(trim(e.psn)) = v_psn
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_emp.self_service_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_submitted');
  end if;

  if exists (
    select 1 from public.employee_update_requests r
     where r.employee_id = v_emp.id and r.status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'pending_review');
  end if;

  if changes is null or jsonb_typeof(changes) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  for v_key in select jsonb_object_keys(changes) loop
    if not (v_key = any (v_allowed)) then
      return jsonb_build_object('ok', false, 'error', 'field_not_allowed', 'field', v_key);
    end if;
    if jsonb_typeof(changes -> v_key) not in ('string', 'null') then
      return jsonb_build_object('ok', false, 'error', 'invalid_value', 'field', v_key);
    end if;
    v_value := coalesce(changes ->> v_key, '');
    -- Dates arrive from an <input type="date">; reject anything else now so an
    -- approval can never fail on a bad cast.
    if v_key = any (v_date_keys) and v_value <> ''
       and v_value !~ '^\d{4}-\d{2}-\d{2}$' then
      return jsonb_build_object('ok', false, 'error', 'invalid_value', 'field', v_key);
    end if;
  end loop;

  if (changes ? 'name') and nullif(changes ->> 'name', '') is null then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  insert into public.employee_update_requests (employee_id, psn, changes)
  values (v_emp.id, v_emp.psn, changes)
  returning id into v_id;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), null, null, null, 'update', 'employees', v_emp.id,
          jsonb_build_object('source', 'self_service_submitted',
                             'request_id', v_id, 'changes', changes));

  return jsonb_build_object('ok', true, 'request_id', v_id);
exception
  when unique_violation then
    -- A second request raced the first one in.
    return jsonb_build_object('ok', false, 'error', 'pending_review');
end;
$$;

revoke all on function public.self_service_submit(text, jsonb) from public;
grant execute on function public.self_service_submit(text, jsonb) to anon;
grant execute on function public.self_service_submit(text, jsonb) to authenticated;

-- ── 7. Admin — the review queue ────────────────────────────────────────────
drop function if exists public.self_service_requests(text);
create or replace function public.self_service_requests(p_status text default 'pending')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := coalesce(nullif(trim(p_status), ''), 'pending');
begin
  if public.auth_role() not in ('admin', 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Only administrators can review self-service updates.');
  end if;

  if v_status not in ('pending', 'approved', 'rejected', 'all') then
    return jsonb_build_object('ok', false, 'error', 'Unknown status filter.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'psn', r.psn,
        'employee_name', e.name,
        'employee_photo', e.photo,
        'changes', r.changes,
        'current', public.self_service_employee_json(e),
        'status', r.status,
        'submitted_at', r.submitted_at,
        'reviewed_at', r.reviewed_at,
        'reviewer_email', r.reviewer_email,
        'review_note', r.review_note
      ) order by r.submitted_at desc)
      from public.employee_update_requests r
      join public.employees e on e.id = r.employee_id
      where v_status = 'all' or r.status = v_status
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.self_service_requests(text) from public;
revoke execute on function public.self_service_requests(text) from anon;
grant execute on function public.self_service_requests(text) to authenticated;

-- Cheap count for the sidebar badge (does not ship the queue payload).
drop function if exists public.self_service_pending_count();
create or replace function public.self_service_pending_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_role() not in ('admin', 'super_admin') then
    return 0;
  end if;

  return (
    select count(*)::integer
      from public.employee_update_requests r
     where r.status = 'pending'
  );
end;
$$;

revoke all on function public.self_service_pending_count() from public;
revoke execute on function public.self_service_pending_count() from anon;
grant execute on function public.self_service_pending_count() to authenticated;

-- ── 8. Admin — approve (apply) or reject ───────────────────────────────────
drop function if exists public.self_service_decide(uuid, text, text);
create or replace function public.self_service_decide(
  p_request uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req   public.employee_update_requests%rowtype;
  v_emp   public.employees%rowtype;
  v_note  text := nullif(trim(coalesce(p_note, '')), '');
  v_email text := nullif(auth.jwt() ->> 'email', '');
begin
  if public.auth_role() not in ('admin', 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Only administrators can review self-service updates.');
  end if;

  if p_decision is null or p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'error', 'Decision must be approve or reject.');
  end if;

  select * into v_req
    from public.employee_update_requests r
   where r.id = p_request
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That request no longer exists.');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'That request has already been reviewed.');
  end if;

  select * into v_emp from public.employees e where e.id = v_req.employee_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'The officer record no longer exists.');
  end if;

  if p_decision = 'reject' then
    update public.employee_update_requests
       set status = 'rejected',
           reviewed_at = now(),
           reviewed_by = auth.uid(),
           reviewer_email = v_email,
           review_note = v_note
     where id = v_req.id;

    insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
    values (gen_random_uuid(), auth.uid(), v_email, public.auth_role(),
            'update', 'employees', v_req.employee_id,
            jsonb_build_object('source', 'self_service_rejected',
                               'request_id', v_req.id, 'note', v_note,
                               'changes', v_req.changes));

    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  -- Approve: apply exactly the fields the officer submitted.
  update public.employees e set
    name              = case when v_req.changes ? 'name'              then v_req.changes ->> 'name'              else e.name end,
    gender            = case when v_req.changes ? 'gender'            then nullif(v_req.changes ->> 'gender', '')            else e.gender end,
    grade             = case when v_req.changes ? 'grade'             then nullif(v_req.changes ->> 'grade', '')             else e.grade end,
    cadre             = case when v_req.changes ? 'cadre'             then nullif(v_req.changes ->> 'cadre', '')             else e.cadre end,
    date_first_appt   = case when v_req.changes ? 'date_first_appt'   then nullif(v_req.changes ->> 'date_first_appt', '')::date   else e.date_first_appt end,
    date_present_appt = case when v_req.changes ? 'date_present_appt' then nullif(v_req.changes ->> 'date_present_appt', '')::date else e.date_present_appt end,
    dob               = case when v_req.changes ? 'dob'               then nullif(v_req.changes ->> 'dob', '')::date               else e.dob end,
    phone             = case when v_req.changes ? 'phone'             then nullif(v_req.changes ->> 'phone', '')             else e.phone end,
    lga               = case when v_req.changes ? 'lga'               then nullif(v_req.changes ->> 'lga', '')               else e.lga end,
    station           = case when v_req.changes ? 'station'           then nullif(v_req.changes ->> 'station', '')           else e.station end,
    address           = case when v_req.changes ? 'address'           then nullif(v_req.changes ->> 'address', '')           else e.address end,
    photo             = case when v_req.changes ? 'photo'             then nullif(v_req.changes ->> 'photo', '')             else e.photo end,
    step              = case when v_req.changes ? 'step'              then nullif(v_req.changes ->> 'step', '')              else e.step end,
    remarks           = case when v_req.changes ? 'remarks'           then nullif(v_req.changes ->> 'remarks', '')           else e.remarks end,
    updated_at                = now(),
    self_service_submitted_at = now()
  where e.id = v_req.employee_id;

  update public.employee_update_requests
     set status = 'approved',
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         reviewer_email = v_email,
         review_note = v_note
   where id = v_req.id;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), auth.uid(), v_email, public.auth_role(),
          'update', 'employees', v_req.employee_id,
          jsonb_build_object('source', 'self_service_approved',
                             'request_id', v_req.id, 'note', v_note,
                             'changes', v_req.changes));

  return jsonb_build_object('ok', true, 'status', 'approved');
end;
$$;

revoke all on function public.self_service_decide(uuid, text, text) from public;
revoke execute on function public.self_service_decide(uuid, text, text) from anon;
grant execute on function public.self_service_decide(uuid, text, text) to authenticated;

-- ── 9. Admin escape hatch (admin+ only, audited) ───────────────────────────
-- Clears the post-approval lock so an officer can submit another request.
drop function if exists public.reset_self_service_lock(text);
create or replace function public.reset_self_service_lock(psn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
begin
  if public.auth_role() not in ('admin', 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Only administrators can unlock an officer.');
  end if;

  select * into v_emp from public.employees e
   where lower(e.psn) = lower(reset_self_service_lock.psn) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No employee found with that PSN.');
  end if;

  if v_emp.self_service_submitted_at is null then
    return jsonb_build_object('ok', false, 'error', 'This officer has not had an update approved yet — nothing to unlock.');
  end if;

  update public.employees set self_service_submitted_at = null where id = v_emp.id;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), auth.uid(), nullif(auth.jwt() ->> 'email', ''), public.auth_role(),
          'update', 'employees', v_emp.id,
          jsonb_build_object('action', 'reset_self_service_lock', 'psn', v_emp.psn));

  return jsonb_build_object('ok', true, 'psn', v_emp.psn);
end;
$$;

revoke all on function public.reset_self_service_lock(text) from public;
revoke execute on function public.reset_self_service_lock(text) from anon;
grant execute on function public.reset_self_service_lock(text) to authenticated;

-- ── 10. Retire the anonymous PSN-only write endpoint ───────────────────────
drop function if exists public.submit_self_service_update(uuid, jsonb);
