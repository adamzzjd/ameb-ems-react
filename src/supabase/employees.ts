import { supabase } from './client';
import { logAudit } from './audit';
import type { Employee } from '../types';

export async function dbCheckTable(): Promise<boolean> {
  const { error } = await supabase.from('employees').select('id').limit(1);
  if (error && error.code === '42P01') return false;
  return true;
}

export async function dbLoadAll(): Promise<{ data: Employee[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Employee[] | null, error };
}

export async function dbSave(emp: Partial<Employee> & { name: string }): Promise<{ data: Employee | null; error: Error | null }> {
  const payload = {
    name: emp.name,
    gender: emp.gender || null,
    grade: emp.grade || null,
    cadre: emp.cadre || null,
    date_first_appt: emp.date_first_appt || null,
    date_present_appt: emp.date_present_appt || null,
    dob: emp.dob || null,
    phone: emp.phone || null,
    lga: emp.lga || null,
    psn: emp.psn || null,
    station: emp.station || null,
    photo: emp.photo || null,
    remarks: emp.remarks || '',
    updated_at: new Date().toISOString(),
  };

  if (emp.id) {
    const { data, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', emp.id)
      .select()
      .single();
    if (!error) await logAudit({ action: 'update', table: 'employees', rowId: emp.id, details: { name: emp.name, psn: emp.psn || null } });
    return { data: data as Employee | null, error };
  } else {
    const { data, error } = await supabase
      .from('employees')
      .insert({ ...payload, id: crypto.randomUUID() })
      .select()
      .single();
    if (!error && data) await logAudit({ action: 'create', table: 'employees', rowId: data.id, details: { name: emp.name, psn: emp.psn || null } });
    return { data: data as Employee | null, error };
  }
}

export async function dbDelete(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'employees', rowId: id });
  return { error };
}

export async function dbBulkInsert(records: Partial<Employee>[]): Promise<{ data: Employee[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('employees')
    .insert(records.map(r => ({ ...r, id: r.id || crypto.randomUUID() })))
    .select();
  if (!error && data) await logAudit({ action: 'import', table: 'employees', details: { count: data.length } });
  return { data: data as Employee[] | null, error };
}
