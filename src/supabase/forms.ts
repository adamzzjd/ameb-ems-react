import { supabase } from './client';
import { logAudit } from './audit';
import type { FormAssignment, FormField, FormSubmission, FormTemplate } from '../types';

// ── Data collection services (templates / assignments / submissions) ────────
// RLS is the real gate (setup_rls.sql §4.9):
//   • templates — board (forms.manage) writes; any signed-in user reads
//   • assignments — board writes; field staff see their own or open ones
//   • submissions — Decision A: field staff see ONLY their own; board
//     reviewers (reports.view) see all and approve/reject (Decision B).
// The app layer stamps owner_org_id from a caller-supplied value and audits
// every write. Mirrors the delivery.ts patterns.

const nowIso = () => new Date().toISOString();

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Templates ───────────────────────────────────────────────────────────────
export async function dbLoadFormTemplates(): Promise<{
  data: FormTemplate[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .order('title', { ascending: true });
  return {
    data: (data ?? []).map(r => ({ ...r, fields: (r.fields ?? []) as FormField[] })) as FormTemplate[] | null,
    error,
  };
}

export type FormTemplateInput = Partial<FormTemplate> & {
  title: string; fields: FormField[];
};

export async function dbSaveFormTemplate(
  template: FormTemplateInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: FormTemplate | null; error: Error | null }> {
  const payload = {
    id: template.id ?? crypto.randomUUID(),
    title: template.title,
    description: template.description ?? '',
    status: template.status ?? 'draft',
    version: template.version ?? 1,
    fields: template.fields,
    owner_org_id: template.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = template.id
    ? await supabase.from('form_templates').update(payload).eq('id', template.id).select().single()
    : await supabase.from('form_templates').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: template.id ? 'update' : 'create',
      table: 'form_templates', rowId: data.id,
      details: { title: payload.title, status: payload.status, fields: payload.fields.length },
    });
  }
  return { data: data as FormTemplate | null, error };
}

export async function dbDeleteFormTemplate(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('form_templates').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'form_templates', rowId: id });
  return { error };
}

// ── Assignments ─────────────────────────────────────────────────────────────
export async function dbLoadFormAssignments(): Promise<{
  data: FormAssignment[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('form_assignments')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as FormAssignment[] | null, error };
}

export type FormAssignmentInput = Partial<FormAssignment> & {
  template_id: string;
};

export async function dbSaveFormAssignment(
  assignment: FormAssignmentInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: FormAssignment | null; error: Error | null }> {
  const payload = {
    id: assignment.id ?? crypto.randomUUID(),
    template_id: assignment.template_id,
    assigned_to: assignment.assigned_to ?? null,
    centre_id: assignment.centre_id ?? null,
    cohort_id: assignment.cohort_id ?? null,
    due_date: assignment.due_date ?? null,
    status: assignment.status ?? 'open',
    owner_org_id: assignment.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = assignment.id
    ? await supabase.from('form_assignments').update(payload).eq('id', assignment.id).select().single()
    : await supabase.from('form_assignments').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: 'assign',
      table: 'form_assignments', rowId: data.id,
      details: { template_id: payload.template_id, assigned_to: payload.assigned_to },
    });
  }
  return { data: data as FormAssignment | null, error };
}

export async function dbDeleteFormAssignment(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('form_assignments').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'form_assignments', rowId: id });
  return { error };
}

// ── Submissions ─────────────────────────────────────────────────────────────
/**
 * Load submissions. RLS scopes the result per caller: field staff get only
 * their own rows (Decision A); board reviewers get everything (Decision B).
 */
export async function dbLoadSubmissions(): Promise<{
  data: FormSubmission[] | null; error: Error | null;
}> {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .order('updated_at', { ascending: false });
  return { data: data as FormSubmission[] | null, error };
}

export type FormSubmissionInput = Partial<FormSubmission> & {
  template_id: string; answers: Record<string, unknown>;
};

/**
 * Save a draft or submit answers (status 'draft' | 'submitted'). Enumerators
 * can only create/update their own draft/submitted rows (RLS); the
 * approved/rejected transitions go through dbReviewSubmission.
 */
export async function dbSaveSubmission(
  submission: FormSubmissionInput,
  opts: { ownerOrgId?: string | null } = {}
): Promise<{ data: FormSubmission | null; error: Error | null }> {
  const uid = await currentUserId();
  const submitting = submission.status === 'submitted';
  const payload = {
    id: submission.id ?? crypto.randomUUID(),
    template_id: submission.template_id,
    assignment_id: submission.assignment_id ?? null,
    answers: submission.answers,
    status: submission.status ?? 'draft',
    submitted_by: submission.submitted_by ?? uid,
    submitted_at: submitting ? (submission.submitted_at ?? nowIso()) : (submission.submitted_at ?? null),
    centre_id: submission.centre_id ?? null,
    cohort_id: submission.cohort_id ?? null,
    owner_org_id: submission.owner_org_id ?? opts.ownerOrgId ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = submission.id
    ? await supabase.from('form_submissions').update(payload).eq('id', submission.id).select().single()
    : await supabase.from('form_submissions').insert(payload).select().single();

  if (!error && data) {
    await logAudit({
      action: submission.id ? 'update' : 'create',
      table: 'form_submissions', rowId: data.id,
      details: { template_id: payload.template_id, status: payload.status },
    });
  }
  return { data: data as FormSubmission | null, error };
}

/** Approve or reject a submitted form (reports.view roles; audited). */
export async function dbReviewSubmission(
  id: string,
  decision: 'approved' | 'rejected',
  reviewNote: string | null
): Promise<{ data: FormSubmission | null; error: Error | null }> {
  const uid = await currentUserId();
  const payload = {
    status: decision,
    reviewed_by: uid,
    reviewed_at: nowIso(),
    review_note: reviewNote,
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from('form_submissions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await logAudit({
      action: decision === 'approved' ? 'approve' : 'reject',
      table: 'form_submissions', rowId: id,
      details: { note: reviewNote },
    });
  }
  return { data: data as FormSubmission | null, error };
}

export async function dbDeleteSubmission(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('form_submissions').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'form_submissions', rowId: id });
  return { error };
}
