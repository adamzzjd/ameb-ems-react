import { supabase } from './client';
import { logAudit } from './audit';
import type { Department } from '../types';

export async function dbLoadDepartments(): Promise<{ data: Department[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Department[] | null, error };
}

export async function dbSaveDepartment(
  dept: Partial<Department> & { name: string },
): Promise<{ data: Department | null; error: Error | null }> {
  const payload = {
    name: dept.name,
    code: dept.code || null,
    description: dept.description || '',
    head_employee_id: dept.head_employee_id || null,
    status: dept.status || 'active',
    updated_at: new Date().toISOString(),
  };

  if (dept.id) {
    const { data, error } = await supabase
      .from('departments')
      .update(payload)
      .eq('id', dept.id)
      .select()
      .single();
    if (!error) await logAudit({ action: 'update', table: 'departments', rowId: dept.id, details: { name: dept.name } });
    return { data: data as Department | null, error };
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({ ...payload, id: crypto.randomUUID() })
    .select()
    .single();
  if (!error && data) await logAudit({ action: 'create', table: 'departments', rowId: data.id, details: { name: dept.name } });
  return { data: data as Department | null, error };
}

export async function dbDeleteDepartment(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'departments', rowId: id });
  return { error };
}
