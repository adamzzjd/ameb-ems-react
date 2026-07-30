import { supabase } from './client';
import type { Centre } from '../types';

export async function dbLoadCentres(): Promise<{ data: Centre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Centre[] | null, error };
}

export async function dbGetCentre(id: string): Promise<{ data: Centre | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Centre | null, error };
}

export async function dbSaveCentre(
  centre: Partial<Centre> & { name: string; lga: string }
): Promise<{ data: Centre | null; error: Error | null }> {
  if (centre.id) {
    // Update
    const { data, error } = await supabase
      .from('centres')
      .update({
        name: centre.name,
        lga: centre.lga,
        ward: centre.ward || null,
        community: centre.community || null,
        type: centre.type || null,
        status: centre.status || 'Active',
        capacity: centre.capacity != null ? centre.capacity : null,
        phone: centre.phone || null,
        facilitator: centre.facilitator || null,
        ngo_partner: centre.ngo_partner || null,
        remarks: centre.remarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', centre.id)
      .select()
      .single();
    return { data: data as Centre | null, error };
  } else {
    // Insert
    const { data, error } = await supabase
      .from('centres')
      .insert({
        id: crypto.randomUUID(),
        name: centre.name,
        lga: centre.lga,
        ward: centre.ward || null,
        community: centre.community || null,
        type: centre.type || null,
        status: centre.status || 'Active',
        capacity: centre.capacity != null ? centre.capacity : null,
        phone: centre.phone || null,
        facilitator: centre.facilitator || null,
        ngo_partner: centre.ngo_partner || null,
        remarks: centre.remarks || null,
      })
      .select()
      .single();
    return { data: data as Centre | null, error };
  }
}

export async function dbDeleteCentre(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('centres').delete().eq('id', id);
  return { error };
}
