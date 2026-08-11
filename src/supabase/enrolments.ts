import { supabase } from './client';
import type { EnrolmentStat, PublicCentre } from '../types';

export async function dbLoadEnrolmentStats(): Promise<{ data: EnrolmentStat[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('enrolment_stats')
    .select('*')
    .order('year', { ascending: false });
  return { data: data as EnrolmentStat[] | null, error };
}

export async function dbSaveEnrolmentStat(
  stat: Partial<EnrolmentStat> & { year: number }
): Promise<{ data: EnrolmentStat | null; error: Error | null }> {
  const payload = {
    year: stat.year,
    learners_enrolled: stat.learners_enrolled ?? 0,
    certified: stat.certified ?? 0,
    dropped_out: stat.dropped_out ?? 0,
    no_exam: stat.no_exam ?? 0,
    ngos: stat.ngos ?? [],
  };
  if (stat.id) {
    const { data, error } = await supabase
      .from('enrolment_stats')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', stat.id)
      .select()
      .single();
    return { data: data as EnrolmentStat | null, error };
  }
  const { data, error } = await supabase
    .from('enrolment_stats')
    .insert({ id: crypto.randomUUID(), ...payload })
    .select()
    .single();
  return { data: data as EnrolmentStat | null, error };
}

export async function dbDeleteEnrolmentStat(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('enrolment_stats').delete().eq('id', id);
  return { error };
}

// ── Public centre directory (safe `public_centres` view) ─────────────────────
export async function dbLoadPublicCentres(): Promise<{ data: PublicCentre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('public_centres')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as PublicCentre[] | null, error };
}
