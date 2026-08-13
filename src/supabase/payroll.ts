import { supabase } from './client';
import { logAudit } from './audit';
import type { PayrollRow } from '../lib/payroll';

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  label: string;
  total: number;
  count: number;
  created_by: string | null;
  created_at?: string;
}

export interface PayrollLine {
  id: string;
  run_id: string;
  employee_id: string;
  name: string;
  psn: string | null;
  grade: string | null;
  step: string | null;
  basic_salary: number;
  allowance: number;
  gross: number;
}

export async function dbListPayrollRuns(): Promise<{ data: PayrollRun[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  return { data: data as PayrollRun[] | null, error };
}

export async function dbLoadRunLines(runId: string): Promise<{ data: PayrollLine[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*')
    .eq('run_id', runId);
  return { data: data as PayrollLine[] | null, error };
}

/**
 * Publish (or re-publish) a month's payroll. Upserts the run row keyed on
 * (month, year), replaces that run's lines, and audits the action.
 */
export async function dbPublishPayroll(month: number, year: number, rows: PayrollRow[]): Promise<{ data: PayrollRun | null; error: Error | null }> {
  const label = `${['January','February','March','April','May','June','July','August','September','October','November','December'][month - 1]} ${year}`;
  const total = rows.reduce((s, r) => s + r.gross, 0);

  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .upsert(
      { id: crypto.randomUUID(), month, year, label, total, count: rows.length },
      { onConflict: 'month,year', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (runError || !run) return { data: null, error: runError ?? new Error('Failed to save payroll run.') };

  // Replace the month's lines (re-publishing overwrites the snapshot).
  await supabase.from('payroll_lines').delete().eq('run_id', run.id);
  if (rows.length > 0) {
    const { error: linesError } = await supabase.from('payroll_lines').insert(
      rows.map(r => ({
        id: crypto.randomUUID(),
        run_id: run.id,
        employee_id: r.employeeId,
        name: r.name,
        psn: r.psn,
        grade: r.grade,
        step: r.step,
        basic_salary: r.basicSalary,
        allowance: r.allowance,
        gross: r.gross,
      }))
    );
    if (linesError) return { data: null, error: linesError };
  }

  await logAudit({ action: 'payroll', table: 'payroll_runs', rowId: run.id, details: { label, count: rows.length, total } });
  return { data: run as PayrollRun, error: null };
}
