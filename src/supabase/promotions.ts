import { supabase } from './client';
import { logAudit } from './audit';
import type { PromotionRecord } from '../types';

export interface NewPromotion {
  employee_id: string;
  promoted_on: string;
  from_grade?: string | null;
  to_grade: string;
  reference?: string | null;
  notes?: string;
}

export async function dbListPromotions(): Promise<{ data: PromotionRecord[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('promoted_on', { ascending: false });
  return { data: data as PromotionRecord[] | null, error };
}

export async function dbAddPromotion(input: NewPromotion): Promise<{ data: PromotionRecord | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      id: crypto.randomUUID(),
      employee_id: input.employee_id,
      promoted_on: input.promoted_on,
      from_grade: input.from_grade || null,
      to_grade: input.to_grade,
      reference: input.reference || null,
      notes: input.notes || '',
    })
    .select()
    .single();
  if (!error && data) {
    await logAudit({
      action: 'promotion',
      table: 'promotions',
      rowId: data.id,
      details: { employee_id: data.employee_id, to_grade: data.to_grade, promoted_on: data.promoted_on },
    });
  }
  return { data: data as PromotionRecord | null, error };
}

export async function dbDeletePromotion(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'promotions', rowId: id });
  return { error };
}
