import type { FormField, Learner } from '../types';

// ── Data-collection form helpers (pure, testable) ───────────────────────────
// Used by the form builder, the field-capture screen and the review queue.
// No Supabase imports — everything here is pure.

/** Generate a stable, unique field key from a label ("Full name" → "full_name"). */
export function generateFieldKey(fields: FormField[], label: string): string {
  const base =
    label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  const taken = new Set(fields.map(f => f.key));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * Validate answers against the template's fields.
 * Returns a map of field key → human error message (empty when valid).
 */
export function validateAnswers(
  fields: FormField[],
  answers: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = answers[f.key];
    const empty =
      v === undefined || v === null ||
      (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0);

    if (empty) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }

    if (f.type === 'number') {
      const n = typeof v === 'number' ? v : Number(String(v).trim());
      if (Number.isNaN(n)) { errors[f.key] = `${f.label} must be a number.`; continue; }
      if (f.min != null && n < f.min) errors[f.key] = `${f.label} must be at least ${f.min}.`;
      else if (f.max != null && n > f.max) errors[f.key] = `${f.label} must be at most ${f.max}.`;
    } else if (f.type === 'select') {
      if (f.options && !f.options.includes(String(v))) {
        errors[f.key] = `${f.label} must be one of the listed options.`;
      }
    } else if (f.type === 'multi') {
      const list = Array.isArray(v) ? v : [v];
      if (f.options && list.some(x => !f.options!.includes(String(x)))) {
        errors[f.key] = `${f.label} contains an option not in the list.`;
      }
    }
    // text / textarea / date / boolean: presence is the only check we make.
  }
  return errors;
}

/** Clean answers before save: trim strings, coerce numbers, drop empties to null. */
export function normalizeAnswers(
  fields: FormField[],
  answers: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = answers[f.key];
    if (v === undefined) continue;
    if (f.type === 'number') {
      const s = String(v).trim();
      out[f.key] = s === '' ? null : Number(s);
    } else if (f.type === 'multi') {
      const list = Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
      out[f.key] = list.map(String);
    } else if (f.type === 'boolean') {
      out[f.key] = v === true || v === 'true';
    } else {
      const s = typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v);
      out[f.key] = s === '' ? null : s;
    }
  }
  return out;
}

export interface SubmissionCsvRow {
  id: string;
  status: string;
  submitted_at: string | null;
  answers: Record<string, unknown>;
}

/** Flatten submissions into a CSV-ready table: meta columns + one per field. */
export function answersToCsvRows(
  fields: FormField[],
  submissions: SubmissionCsvRow[]
): { header: string[]; rows: (string | null)[][] } {
  const header = ['submission_id', 'status', 'submitted_at', ...fields.map(f => f.label)];
  const rows = submissions.map(s => [
    s.id,
    s.status,
    s.submitted_at,
    ...fields.map(f => {
      const v = s.answers?.[f.key];
      if (v == null) return null;
      return Array.isArray(v) ? v.join('; ') : String(v);
    }),
  ]);
  return { header, rows };
}

/** Escape a value for CSV (quotes, commas, newlines) — mirrors learnerCsv. */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a downloadable CSV string from answersToCsvRows output. */
export function csvFromRows(
  rows: { header: string[]; rows: (string | null)[][] }
): string {
  return [rows.header, ...rows.rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

// ── Promotion: a filled enrolment-style form becomes a learner register row ──
// Matches common field keys; unmatched fields are ignored. Returns null when
// no full name could be found (the learner register requires one).
const LEARNER_KEY_ALIASES: Record<string, string[]> = {
  full_name: ['full_name', 'fullname', 'name'],
  reference_no: ['reference_no', 'reference', 'ref_no', 'enrolment_no'],
  gender: ['gender', 'sex'],
  age_group: ['age_group', 'age'],
  phone: ['phone', 'phone_number', 'mobile'],
  lga: ['lga', 'local_government'],
  community: ['community', 'village', 'settlement'],
  notes: ['notes', 'remarks', 'comment'],
};

export function promoteToLearner(
  fields: FormField[],
  answers: Record<string, unknown>
): (Partial<Learner> & { full_name: string }) | null {
  const byKey: Record<string, unknown> = {};
  for (const f of fields) {
    const canonical = Object.keys(LEARNER_KEY_ALIASES).find(k =>
      LEARNER_KEY_ALIASES[k].includes(f.key.toLowerCase())
    );
    if (canonical && byKey[canonical] === undefined) {
      byKey[canonical] = answers[f.key];
    }
  }
  const full_name = String(byKey.full_name ?? '').trim();
  if (!full_name) return null;
  return {
    full_name,
    reference_no: String(byKey.reference_no ?? '').trim() || null,
    gender: String(byKey.gender ?? '').trim() || null,
    age_group: String(byKey.age_group ?? '').trim() || null,
    phone: String(byKey.phone ?? '').trim() || null,
    lga: String(byKey.lga ?? '').trim() || null,
    community: String(byKey.community ?? '').trim() || null,
    notes: String(byKey.notes ?? '').trim() || null,
  };
}
