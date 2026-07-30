import { supabase } from './client';
import type { Cadre } from '../types';

export async function dbLoadCadres(): Promise<{ data: Cadre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cadres')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Cadre[] | null, error };
}

export async function dbAddCadre(
  name: string,
  category?: string
): Promise<{ data: Cadre | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cadres')
    .insert({ id: crypto.randomUUID(), name, category: category || null })
    .select()
    .single();
  return { data: data as Cadre | null, error };
}

export async function dbUpdateCadre(
  id: string,
  name: string,
  category?: string
): Promise<{ data: Cadre | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cadres')
    .update({ name, category: category || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Cadre | null, error };
}

export async function dbDeleteCadre(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('cadres').delete().eq('id', id);
  return { error };
}

export async function dbBulkInsertCadres(
  records: Partial<Cadre>[]
): Promise<{ data: Cadre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cadres')
    .insert(records.map(r => ({ ...r, id: r.id || crypto.randomUUID() })))
    .select();
  return { data: data as Cadre[] | null, error };
}
