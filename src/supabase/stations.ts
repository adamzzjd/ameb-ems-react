import { supabase } from './client';
import type { Station } from '../types';

export async function dbLoadStations(): Promise<{ data: Station[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Station[] | null, error };
}

export async function dbAddStation(
  name: string,
  lga?: string,
  type?: string
): Promise<{ data: Station | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('stations')
    .insert({ id: crypto.randomUUID(), name, lga: lga || null, type: type || null })
    .select()
    .single();
  return { data: data as Station | null, error };
}

export async function dbUpdateStation(
  id: string,
  name: string,
  lga?: string,
  type?: string
): Promise<{ data: Station | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('stations')
    .update({ name, lga: lga || null, type: type || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Station | null, error };
}

export async function dbDeleteStation(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('stations').delete().eq('id', id);
  return { error };
}

export async function dbBulkInsertStations(
  records: Partial<Station>[]
): Promise<{ data: Station[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('stations')
    .insert(records.map(r => ({ ...r, id: r.id || crypto.randomUUID() })))
    .select();
  return { data: data as Station[] | null, error };
}
