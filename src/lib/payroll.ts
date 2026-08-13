// ── Payroll helpers (pure — unit tested) ────────────────────────────────────
// Monthly payroll sheet generation from the staff register. Basic salary is
// stored per officer (editable in the employee form / CSV import); allowance
// is currently a flat 0 and gross = basic + allowance, so the sheet is ready
// for the state's IPPS (Integrated Personnel and Payroll Information System)
// import format.
import type { Employee } from '../types';

export interface PayrollRow {
  employeeId: string;
  name: string;
  psn: string | null;
  grade: string | null;
  step: string | null;
  station: string | null;
  lga: string | null;
  basicSalary: number;
  allowance: number;
  gross: number;
}

export function computePayrollRow(emp: Employee): PayrollRow {
  const basicSalary = typeof emp.basic_salary === 'number' && !isNaN(emp.basic_salary)
    ? Math.max(0, emp.basic_salary)
    : 0;
  const allowance = 0;
  return {
    employeeId: emp.id,
    name: emp.name,
    psn: emp.psn,
    grade: emp.grade,
    step: emp.step,
    station: emp.station,
    lga: emp.lga,
    basicSalary,
    allowance,
    gross: basicSalary + allowance,
  };
}

export function buildPayrollRows(employees: Employee[]): PayrollRow[] {
  return employees.map(computePayrollRow);
}

/** "₦485,200.00" — no Intl dependency (node test envs may lack en-NG data). */
export function fmtNaira(n: number | null | undefined): string {
  const v = typeof n === 'number' && !isNaN(n) ? n : 0;
  return `₦${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "August 2026" for a month index (1–12). */
export function monthLabel(month: number, year: number): string {
  const d = new Date(year, (month - 1) % 12, 1);
  return `${d.toLocaleDateString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
}

function csvCell(v: string | number | null | undefined): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/**
 * Build an IPPS-style CSV export of a payroll sheet. The first row is a
 * comment line naming the sheet; totals are appended as the final row.
 */
export function buildIppsCsv(rows: PayrollRow[], month: number, year: number): string {
  const headers = [
    'S/N', 'PSN', 'FULLNAME', 'SEX', 'GRADE LEVEL', 'STEP',
    'STATION', 'LGA', 'BASIC SALARY (NGN)', 'ALLOWANCE (NGN)', 'GROSS (NGN)',
  ];
  const lines = rows.map((r, i) => [
    i + 1, r.psn, r.name, '', r.grade, r.step,
    r.station, r.lga, r.basicSalary, r.allowance, r.gross,
  ].map(csvCell).join(','));

  const totalBasic = rows.reduce((s, r) => s + r.basicSalary, 0);
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totals = [csvCell('TOTAL'), '', '', '', '', '', '', '', csvCell(totalBasic), csvCell(totalGross), csvCell(totalGross)].join(',');

  return [
    `# Adamawa State Mass Education Board — Monthly Payroll — ${monthLabel(month, year)}`,
    headers.map(csvCell).join(','),
    ...lines,
    totals,
  ].join('\n');
}
