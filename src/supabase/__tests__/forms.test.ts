import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same mocked-Supabase pattern as delivery.test.ts / registerServices.test.ts.
const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
  sessionUser: {
    id: 'u-1',
    email: 'admin@ameb.gov.ng',
    app_metadata: { role: 'super_admin' },
  } as Record<string, unknown>,
  ops: [] as { op: string; table: string; payload?: unknown; col?: unknown; val?: unknown; opts?: unknown }[],
}));

vi.mock('../client', () => {
  const buildChain = (table: string) => {
    const chain = Object.assign(() => ({}), {}) as Record<string, unknown> & { (): unknown };
    const record = (op: string, extra?: { payload?: unknown; col?: unknown; val?: unknown; opts?: unknown }) => {
      state.ops.push({ op, table, ...extra });
      return chain;
    };
    chain.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(state.result).then(onFulfilled);
    chain.select = () => chain;
    chain.order = (col: unknown, opts: unknown) => record('order', { col, opts });
    chain.limit = () => chain;
    chain.single = () => Promise.resolve(state.result);
    chain.eq = (col: unknown, val: unknown) => record('eq', { col, val });
    chain.insert = (payload: unknown) => record('insert', { payload });
    chain.update = (payload: unknown) => record('update', { payload });
    chain.delete = () => record('delete');
    chain.not = () => chain;
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => buildChain(table),
      auth: {
        getSession: () =>
          Promise.resolve({
            data: { session: state.sessionUser ? { user: state.sessionUser } : null },
          }),
      },
    },
  };
});

import {
  dbLoadFormTemplates,
  dbSaveFormTemplate, dbDeleteFormTemplate,
  dbSaveFormAssignment, dbDeleteFormAssignment,
  dbSaveSubmission, dbReviewSubmission, dbDeleteSubmission,
} from '../forms';

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

const lastAudit = () => {
  const calls = logAudit.mock.calls as unknown as Array<[{ table: string; action: string; details?: Record<string, unknown> }]>;
  return calls[calls.length - 1]?.[0];
};

function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

const lastInsert = (table: string) => {
  const found = state.ops.filter(o => o.op === 'insert' && o.table === table);
  return found[found.length - 1]?.payload as Record<string, unknown> | undefined;
};

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  logAudit.mockClear();
});

describe('form templates', () => {
  it('inserts with defaults, stamps owner_org_id and audits with the field count', async () => {
    resolve({ id: 't-1', title: 'Facility check' });
    const fields = [{ key: 'rooms', label: 'Classrooms', type: 'number' as const }];
    const { error } = await dbSaveFormTemplate(
      { title: 'Facility check', fields },
      { ownerOrgId: 'org-9' }
    );
    expect(error).toBeNull();
    const payload = lastInsert('form_templates');
    expect(payload).toMatchObject({
      title: 'Facility check', status: 'draft', version: 1, owner_org_id: 'org-9',
    });
    expect(lastAudit()).toMatchObject({ table: 'form_templates', action: 'create' });
    expect(lastAudit()?.details).toMatchObject({ fields: 1, status: 'draft' });
  });

  it('updates via update().eq(id) when an id is passed', async () => {
    resolve({ id: 't-1', title: 'Renamed' });
    const { error } = await dbSaveFormTemplate({
      id: 't-1', title: 'Renamed', fields: [],
    });
    expect(error).toBeNull();
    const updateOp = state.ops.find(o => o.op === 'update' && o.table === 'form_templates');
    expect(updateOp).toBeTruthy();
    expect(lastAudit()?.action).toBe('update');
  });

  it('audits template deletes', async () => {
    resolve(null);
    const { error } = await dbDeleteFormTemplate('t-1');
    expect(error).toBeNull();
    expect(lastAudit()).toMatchObject({ table: 'form_templates', action: 'delete', rowId: 't-1' });
  });

  it('loads templates and maps the fields jsonb', async () => {
    resolve([{ id: 't-1', title: 'A', fields: [{ key: 'x', label: 'X', type: 'text' }] }]);
    const { data } = await dbLoadFormTemplates();
    expect(data?.[0].fields[0].key).toBe('x');
  });
});

describe('form assignments', () => {
  it('inserts an open assignment (assigned_to null) and audits with action assign', async () => {
    resolve({ id: 'a-1' });
    const { error } = await dbSaveFormAssignment({ template_id: 't-1' });
    expect(error).toBeNull();
    expect(lastInsert('form_assignments')).toMatchObject({
      template_id: 't-1', assigned_to: null, status: 'open',
    });
    expect(lastAudit()).toMatchObject({ table: 'form_assignments', action: 'assign' });
  });

  it('audits assignment deletes', async () => {
    resolve(null);
    const { error } = await dbDeleteFormAssignment('a-1');
    expect(error).toBeNull();
    expect(lastAudit()).toMatchObject({ table: 'form_assignments', action: 'delete' });
  });
});

describe('form submissions', () => {
  it('saves a draft without submitted_at, attributing submitted_by from the session', async () => {
    resolve({ id: 's-1' });
    const { error } = await dbSaveSubmission({
      template_id: 't-1', answers: { full_name: 'Ada' }, status: 'draft',
    });
    expect(error).toBeNull();
    const payload = lastInsert('form_submissions');
    expect(payload).toMatchObject({
      template_id: 't-1', status: 'draft', submitted_by: 'u-1',
    });
    expect(payload?.submitted_at).toBeNull();
  });

  it('stamps submitted_at when submitting', async () => {
    resolve({ id: 's-1' });
    await dbSaveSubmission({
      template_id: 't-1', answers: {}, status: 'submitted',
    });
    const payload = lastInsert('form_submissions');
    expect(payload?.status).toBe('submitted');
    expect(typeof payload?.submitted_at).toBe('string');
  });

  it('approves with reviewer stamp and audit action approve', async () => {
    resolve({ id: 's-1', status: 'approved' });
    const { data, error } = await dbReviewSubmission('s-1', 'approved', 'Looks good');
    expect(error).toBeNull();
    expect(data?.status).toBe('approved');
    const updateOp = state.ops.find(o => o.op === 'update' && o.table === 'form_submissions');
    expect((updateOp?.payload as Record<string, unknown>)).toMatchObject({
      status: 'approved', reviewed_by: 'u-1', review_note: 'Looks good',
    });
    expect(lastAudit()).toMatchObject({ table: 'form_submissions', action: 'approve' });
  });

  it('rejects with audit action reject', async () => {
    resolve({ id: 's-1', status: 'rejected' });
    await dbReviewSubmission('s-1', 'rejected', 'Duplicate');
    expect(lastAudit()).toMatchObject({ action: 'reject' });
  });

  it('never audits when the write fails', async () => {
    resolve(null, new Error('rls denied'));
    const { error } = await dbSaveSubmission({ template_id: 't-1', answers: {} });
    expect(error).toBeTruthy();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('audits submission deletes', async () => {
    resolve(null);
    const { error } = await dbDeleteSubmission('s-1');
    expect(error).toBeNull();
    expect(lastAudit()).toMatchObject({ table: 'form_submissions', action: 'delete' });
  });
});
