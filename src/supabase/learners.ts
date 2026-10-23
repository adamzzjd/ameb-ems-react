import { supabase } from './client';
import { logAudit } from './audit';
import type { Learner } from '../types';

// The centre name is joined in so the register can show where a learner
// attends without a second round trip.
const SELECT = '*, centres(name)';

export async function dbLoadLearners(): Promise<{ data: Learner[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('learners')
    .select(SELECT)
    .order('full_name', { ascending: true });
  return { data: data as Learner[] | null, error };
}

/** Every centre a learner is attached to, for the per-centre counts. */
export async function dbLoadLearnerCentreIds(): Promise<{ data: { centre_id: string | null }[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('learners')
    .select('centre_id');
  return { data: data as { centre_id: string | null }[] | null, error };
}

export async function dbSaveLearner(
  learner: Partial<Learner> & { full_name: string }
): Promise<{ data: Learner | null; error: Error | null }> {
  const payload = {
    full_name: learner.full_name.trim(),
    reference_no: learner.reference_no?.trim().toUpperCase() || null,
    gender: learner.gender || null,
    age_group: learner.age_group || null,
    phone: learner.phone?.trim() || null,
    lga: learner.lga || null,
    community: learner.community?.trim() || null,
    centre_id: learner.centre_id || null,
    status: learner.status || 'active',
    enrolled_on: learner.enrolled_on || null,
    completed_on: learner.completed_on || null,
    notes: learner.notes?.trim() || null,
  };

  if (learner.id) {
    const { data, error } = await supabase
      .from('learners')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', learner.id)
      .select(SELECT)
      .single();
    if (!error) {
      await logAudit({
        action: 'update', table: 'learners', rowId: learner.id,
        details: { name: payload.full_name, reference: payload.reference_no },
      });
    }
    return { data: data as Learner | null, error };
  }

  const { data, error } = await supabase
    .from('learners')
    .insert({ id: crypto.randomUUID(), ...payload })
    .select(SELECT)
    .single();
  if (!error && data) {
    await logAudit({
      action: 'create', table: 'learners', rowId: (data as Learner).id,
      details: { name: payload.full_name, reference: payload.reference_no },
    });
  }
  return { data: data as Learner | null, error };
}

/**
 * Bulk insert used by CSV import. One statement per batch, one audit entry per
 * batch rather than per learner — a 300-row import should not write 300 audit
 * rows.
 */
export async function dbImportLearners(
  learners: Array<Partial<Learner> & { full_name: string }>
): Promise<{ data: Learner[] | null; error: Error | null }> {
  if (learners.length === 0) return { data: [], error: null };

  const rows = learners.map(l => ({
    id: crypto.randomUUID(),
    full_name: l.full_name.trim(),
    reference_no: l.reference_no?.trim().toUpperCase() || null,
    gender: l.gender || null,
    age_group: l.age_group || null,
    phone: l.phone?.trim() || null,
    lga: l.lga || null,
    community: l.community?.trim() || null,
    centre_id: l.centre_id || null,
    status: l.status || 'active',
    enrolled_on: l.enrolled_on || null,
    completed_on: l.completed_on || null,
    notes: l.notes?.trim() || null,
  }));

  const { data, error } = await supabase.from('learners').insert(rows).select(SELECT);
  if (!error) {
    await logAudit({
      action: 'import', table: 'learners',
      details: { count: rows.length, first: rows[0]?.full_name },
    });
  }
  return { data: data as Learner[] | null, error };
}

export async function dbDeleteLearner(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('learners').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'learners', rowId: id });
  return { error };
}
