import { supabase } from './client';
import { logAudit } from './audit';
import type { EmployeeDocument } from '../types';

export interface NewDocument {
  employee_id: string;
  title: string;
  category: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string;
}

export async function dbListDocuments(employeeId: string): Promise<{ data: EmployeeDocument[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data as EmployeeDocument[] | null, error };
}

export async function dbAddDocument(input: NewDocument): Promise<{ data: EmployeeDocument | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('employee_documents')
    .insert({
      id: crypto.randomUUID(),
      employee_id: input.employee_id,
      title: input.title,
      category: input.category,
      file_name: input.file_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      url: input.url,
    })
    .select()
    .single();
  if (!error && data) {
    await logAudit({
      action: 'document',
      table: 'employee_documents',
      rowId: data.id,
      details: { employee_id: data.employee_id, title: data.title, category: data.category },
    });
  }
  return { data: data as EmployeeDocument | null, error };
}

export async function dbDeleteDocument(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('employee_documents').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'employee_documents', rowId: id });
  return { error };
}
