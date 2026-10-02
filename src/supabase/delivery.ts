import { supabase } from './client';
import { logAudit } from './audit';
import type { Cohort, CohortOverviewRow, Learner, Programme, ProgrammeLgaLink } from '../types';

// ── Programme delivery services (programmes / cohorts / learners) ───────────
// RLS is the real gate: board staff see everything, partner users are scoped
// to their own organisation by owner_org_id (see setup_rls.sql §4.7). The app
// layer stamps owner_org_id from a caller-supplied value and audits writes.

const nowIso = () => new Date().toISOString();

// ── Programmes ──────────────────────────────────────────────────────────────
export async function dbLoadProgrammes(): Promise<{
  data: Programme[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('programmes')
    .select('*')
    .order('title', { ascending: true });
  return { data: data as Programme[] | null, error };
}

export type ProgrammeInput = Partial<Programme> & { title: string };

export async function dbSaveProgramme(
  programme: ProgrammeInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: Programme | null; error: Error | null }> {
  const payload = {
    id: programme.id ?? crypto.randomUUID(),
    title: programme.title,
    description: programme.description ?? '',
    category: programme.category ?? null,
    duration_weeks: programme.duration_weeks ?? null,
    status: programme.status ?? 'active',
    owner_org_id: programme.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = programme.id
    ? await supabase.from('programmes').update(payload).eq('id', programme.id).select().single()
    : await supabase.from('programmes').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: programme.id ? 'update' : 'create',
      table: 'programmes', rowId: data.id,
      details: { title: payload.title, status: payload.status },
    });
  }
  return { data: data as Programme | null, error };
}

export async function dbDeleteProgramme(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('programmes').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'programmes', rowId: id });
  return { error };
}

// ── Programme ↔ LGA scope (Phase 28) ────────────────────────────────────────
/** Where a programme is meant to run. Errors degrade to null data (missing
 *  table = setup_hierarchy.sql hasn't run). */
export async function dbLoadProgrammeLgas(): Promise<{
  data: ProgrammeLgaLink[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('programme_lgas')
    .select('*');
  return { data: data as ProgrammeLgaLink[] | null, error };
}

/**
 * Replace a programme's LGA scope with the given set: upserts the wanted rows
 * and deletes the rest. An empty set clears the scope (programme runs anywhere
 * / unspecified).
 */
export async function dbSetProgrammeLgaScope(
  programmeId: string,
  lgas: string[],
): Promise<{ error: Error | null }> {
  const want = lgas.map(l => l.trim()).filter(l => !!l);

  if (want.length > 0) {
    const { error } = await supabase
      .from('programme_lgas')
      .upsert(
        want.map(lga => ({ programme_id: programmeId, lga })),
        { onConflict: 'programme_id,lga' },
      );
    if (error) return { error };
  }

  // Drop rows no longer in the set (or everything when the set is empty).
  const { error } =
    want.length === 0
      ? await supabase.from('programme_lgas').delete().eq('programme_id', programmeId)
      : await supabase
          .from('programme_lgas')
          .delete()
          .eq('programme_id', programmeId)
          .not('lga', 'in', `(${want.map(l => `"${l}"`).join(',')})`);

  if (!error) {
    await logAudit({
      action: 'assign', table: 'programme_lgas', rowId: programmeId,
      details: { lgas: want },
    });
  }
  return { error };
}

// ── Cohorts ─────────────────────────────────────────────────────────────────
/** Joined cohort+programme+centre rows (the cohort_overview view). */
export async function dbLoadCohorts(): Promise<{
  data: CohortOverviewRow[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('cohort_overview')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false });
  return { data: data as CohortOverviewRow[] | null, error };
}

export type CohortInput = Partial<Cohort> & {
  programme_id: string; centre_id: string; name: string;
};

export async function dbSaveCohort(
  cohort: CohortInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: Cohort | null; error: Error | null }> {
  const payload = {
    id: cohort.id ?? crypto.randomUUID(),
    programme_id: cohort.programme_id,
    centre_id: cohort.centre_id,
    name: cohort.name,
    start_date: cohort.start_date ?? null,
    end_date: cohort.end_date ?? null,
    status: cohort.status ?? 'planned',
    capacity: cohort.capacity ?? null,
    owner_org_id: cohort.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = cohort.id
    ? await supabase.from('cohorts').update(payload).eq('id', cohort.id).select().single()
    : await supabase.from('cohorts').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: cohort.id ? 'update' : 'create',
      table: 'cohorts', rowId: data.id,
      details: { name: payload.name, status: payload.status },
    });
  }
  return { data: data as Cohort | null, error };
}

export async function dbDeleteCohort(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('cohorts').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'cohorts', rowId: id });
  return { error };
}

// ── Learners ────────────────────────────────────────────────────────────────
export async function dbLoadLearners(): Promise<{
  data: Learner[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .order('full_name', { ascending: true });
  return { data: data as Learner[] | null, error };
}

export type LearnerInput = Partial<Learner> & { full_name: string };

export async function dbSaveLearner(
  learner: LearnerInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: Learner | null; error: Error | null }> {
  const payload = {
    id: learner.id ?? crypto.randomUUID(),
    reference_no: learner.reference_no?.trim() || null,
    full_name: learner.full_name,
    gender: learner.gender ?? null,
    age_group: learner.age_group ?? null,
    phone: learner.phone ?? null,
    lga: learner.lga ?? null,
    community: learner.community ?? null,
    cohort_id: learner.cohort_id ?? null,
    status: learner.status ?? 'active',
    enrolled_on: learner.enrolled_on ?? null,
    completed_on: learner.status === 'completed' ? (learner.completed_on ?? nowIso().slice(0, 10)) : null,
    notes: learner.notes ?? null,
    owner_org_id: learner.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = learner.id
    ? await supabase.from('learners').update(payload).eq('id', learner.id).select().single()
    : await supabase.from('learners').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: learner.id ? 'update' : 'create',
      table: 'learners', rowId: data.id,
      details: { name: payload.full_name, status: payload.status },
    });
  }
  return { data: data as Learner | null, error };
}

export async function dbDeleteLearner(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('learners').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'learners', rowId: id });
  return { error };
}

// ── Learner CSV import (Phase 30.2) ─────────────────────────────────────────

/**
 * Bulk-create learners from a CSV sheet. Every row is stamped with the
 * caller's organisation when there is one, so a partner's import lands in
 * their own world and RLS scopes it there. Returns how many were written and
 * the rows the database rejected, rather than failing the whole sheet.
 */
export async function dbImportLearners(
  rows: LearnerInput[],
  opts: { ownerOrgId?: string | null } = {},
): Promise<{ inserted: number; failed: { row: number; reason: string }[]; error: Error | null }> {
  const failed: { row: number; reason: string }[] = [];
  if (rows.length === 0) return { inserted: 0, failed, error: null };

  const now = nowIso();
  const payload = rows.map((l, i) => {
    if (!l.full_name?.trim()) {
      failed.push({ row: i + 1, reason: 'Full name is required.' });
      return null;
    }
    return {
      id: crypto.randomUUID(),
      reference_no: l.reference_no?.trim() || null,
      full_name: l.full_name.trim(),
      gender: l.gender ?? null,
      age_group: l.age_group ?? null,
      phone: l.phone ?? null,
      lga: l.lga ?? null,
      community: l.community ?? null,
      cohort_id: l.cohort_id ?? null,
      status: l.status ?? 'active',
      enrolled_on: l.enrolled_on ?? null,
      notes: l.notes ?? null,
      owner_org_id: opts.ownerOrgId ?? null,
      updated_at: now,
    };
  }).filter(Boolean) as Record<string, unknown>[];

  if (payload.length === 0) return { inserted: 0, failed, error: null };

  const { error } = await supabase.from('learners').insert(payload);
  if (error) return { inserted: 0, failed, error };

  await logAudit({
    action: 'import', table: 'learners', rowId: null,
    details: { count: payload.length, owner_org_id: opts.ownerOrgId ?? null },
  });
  return { inserted: payload.length, failed, error: null };
}
