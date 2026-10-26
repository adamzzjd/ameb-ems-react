-- ============================================================================
-- AMEB EMS — Contact form guard
-- ----------------------------------------------------------------------------
-- The public contact and learning-centre enquiry forms insert straight into
-- cms_contacts with the anon key, and every accepted row triggers an email to
-- the admin team. With `cms_contacts_insert` open (`with check (true)`) that is
-- an open tap: a script could fill the inbox and flood the Board's mail.
--
-- This trigger enforces the limits on the server, so it protects both the
-- current site and anything else that posts to the table:
--   * field lengths (and a non-empty name / message / plausible email)
--   * at most 3 messages per email address per hour
--   * at most 30 messages a minute in total
--
-- Rejections raise an exception, which PostgREST returns as a 400. The forms
-- already show a generic "could not send" message, so visitors see nothing
-- technical and the inbox stays usable.
--
-- Safe to run multiple times. Run after setup.sql / setup_ems.sql.
-- ============================================================================

create or replace function public.cms_contacts_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_per_email   integer;
  v_last_minute integer;
begin
  new.name    := nullif(trim(coalesce(new.name, '')), '');
  new.email   := lower(nullif(trim(coalesce(new.email, '')), ''));
  new.subject := nullif(trim(coalesce(new.subject, '')), '');
  new.message := nullif(trim(coalesce(new.message, '')), '');
  new.created_at := coalesce(new.created_at, now());

  if new.name is null or length(new.name) < 2 then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;

  if new.email is null or new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;

  if new.message is null or length(new.message) < 5 then
    raise exception 'Please enter a message.' using errcode = '22023';
  end if;

  if length(new.name) > 120 or length(new.email) > 254
     or length(coalesce(new.subject, '')) > 200 or length(new.message) > 4000 then
    raise exception 'Message is too long.' using errcode = '22023';
  end if;

  select count(*) into v_per_email
    from public.cms_contacts
   where lower(email) = new.email
     and created_at > now() - interval '1 hour';

  if v_per_email >= 3 then
    raise exception 'Too many messages from this address. Please try again later.'
      using errcode = '42901';
  end if;

  select count(*) into v_last_minute
    from public.cms_contacts
   where created_at > now() - interval '1 minute';

  if v_last_minute >= 30 then
    raise exception 'The inbox is busy. Please try again in a moment.'
      using errcode = '42901';
  end if;

  return new;
end;
$$;

revoke all on function public.cms_contacts_guard() from public;

drop trigger if exists cms_contacts_guard on public.cms_contacts;
create trigger cms_contacts_guard
  before insert on public.cms_contacts
  for each row execute function public.cms_contacts_guard();
