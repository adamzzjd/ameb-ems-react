import { supabase } from './client';
import type { AuditLog } from '../types';

// Actions recorded in the audit trail. Keep this list in sync with the
// `action` column docs in supabase/setup_audit.sql.
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'import'
  | 'reset'
  | 'assign'
  | 'mark_read'
  | 'promotion'
  | 'document'
  | 'leave'
  | 'payroll';

interface LogAuditInput {
  action: AuditAction;
  table: string;
  rowId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Append one row to the audit trail (who did what, when, on which record).
 * The user is taken from the current session — no need to pass it around.
 *
 * ⚠️ Audit logging is best-effort: any failure (e.g. the audit_log table
 * hasn't been created yet) is swallowed so it can never break the primary
 * operation it is attached to.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(),
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      user_role: (user?.app_metadata?.role as string | undefined) ?? null,
      action: input.action,
      table_name: input.table,
      row_id: input.rowId ?? null,
      details: input.details ?? {},
    });
  } catch {
    // Never propagate — audit logging must not break the write it follows.
  }
}

// Load the most recent audit entries (newest first) for the Audit Log page.
export async function dbLoadAuditLog(): Promise<{ data: AuditLog[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data: data as AuditLog[] | null, error };
}
