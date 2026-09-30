import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same mocked-Supabase pattern as registerServices.test.ts: a thenable chain
// that records ops and resolves to `state.result`.
const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
  sessionUser: {
    id: 'u-1',
    email: 'admin@ameb.gov.ng',
    app_metadata: { role: 'super_admin' },
  } as Record<string, unknown>,
  ops: [] as { op: string; table: string; payload?: unknown; col?: unknown; val?: unknown; opts?: unknown; }[],
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
    chain.upsert = (payload: unknown, opts: unknown) => record('upsert', { payload, opts });
    chain.update = (payload: unknown) => record('update', { payload });
    chain.delete = () => record('delete');
    chain.not = (col: unknown, op: unknown, val: unknown) => record('not', { col, val: `${op} ${val}` });
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
  dbSaveProgramme, dbDeleteProgramme,
  dbSaveCohort, dbDeleteCohort,
  dbSaveLearner, dbDeleteLearner,
  dbSetProgrammeLgaScope,
} from '../delivery';

// logAudit is mocked (same pattern as registerServices.test.ts) so tests can
// assert audit calls without a real session.
const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

const lastAudit = () => {
  const calls = logAudit.mock.calls as unknown as Array<[{ table: string; action: string; details?: Record<string, unknown> }]>;
  return calls[calls.length - 1]?.[0];
};

/** Make the mocked chain resolve to a successful row (like the real builder). */
function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  logAudit.mockClear();
});

describe('dbSaveProgramme', () => {
  it('inserts with defaults and stamps owner_org_id from opts', async () => {
    resolve({ id: 'p-1', title: 'Adult Literacy' });
    const { error } = await dbSaveProgramme(
      { title: 'Adult Literacy' },
      { ownerOrgId: 'org-9' }
    );
    expect(error).toBeNull();
    const insert = state.ops.find(o => o.op === 'insert');
    expect(insert?.table).toBe('programmes');
    const payload = insert?.payload as Record<string, unknown>;
    expect(payload.title).toBe('Adult Literacy');
    expect(payload.status).toBe('active');
    expect(payload.owner_org_id).toBe('org-9');
    expect(typeof payload.id).toBe('string');
    // audited
    expect(lastAudit()?.table).toBe('programmes');
  });

  it('updates an existing programme without changing owner', async () => {
    resolve({ id: 'p1', title: 'Renamed' });
    await dbSaveProgramme({ id: 'p1', title: 'Renamed', owner_org_id: 'org-1' });
    const update = state.ops.find(o => o.op === 'update');
    expect(update?.table).toBe('programmes');
    const payload = update?.payload as Record<string, unknown>;
    expect(payload.title).toBe('Renamed');
    expect(payload.owner_org_id).toBe('org-1');
    expect(lastAudit()?.table).toBe('programmes');
    expect(lastAudit()?.action).toBe('update');
  });

  it('does not audit when the write fails', async () => {
    state.result = { data: null, error: { message: 'RLS violation' } };
    await dbSaveProgramme({ title: 'X' });
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('dbSetProgrammeLgaScope', () => {
  it('upserts the wanted LGAs and prunes the rest', async () => {
    resolve(null);
    const { error } = await dbSetProgrammeLgaScope('p1', ['Ganye', 'Mubi North']);
    expect(error).toBeNull();

    const upsert = state.ops.find(o => o.op === 'upsert');
    expect(upsert?.table).toBe('programme_lgas');
    expect(upsert?.payload).toEqual([
      { programme_id: 'p1', lga: 'Ganye' },
      { programme_id: 'p1', lga: 'Mubi North' },
    ]);
    expect(upsert?.opts).toEqual({ onConflict: 'programme_id,lga' });

    const del = state.ops.filter(o => o.op === 'delete' && o.table === 'programme_lgas');
    expect(del).toHaveLength(1);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'programme_id' && o.val === 'p1')).toBe(true);
    expect(state.ops.some(o => o.op === 'not' && o.col === 'lga' && o.val === 'in ("Ganye","Mubi North")')).toBe(true);
    expect(lastAudit()).toMatchObject({ table: 'programme_lgas', action: 'assign' });
  });

  it('clears the whole scope when given an empty set', async () => {
    resolve(null);
    const { error } = await dbSetProgrammeLgaScope('p2', []);
    expect(error).toBeNull();
    expect(state.ops.some(o => o.op === 'upsert')).toBe(false);
    const del = state.ops.filter(o => o.op === 'delete' && o.table === 'programme_lgas');
    expect(del).toHaveLength(1);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'programme_id' && o.val === 'p2')).toBe(true);
    expect(state.ops.some(o => o.op === 'not')).toBe(false);
  });

  it('filters empty LGA values and audits with the cleaned list', async () => {
    resolve(null);
    await dbSetProgrammeLgaScope('p3', ['Ganye', '', '  ']);
    const upsert = state.ops.find(o => o.op === 'upsert');
    expect(upsert?.payload).toEqual([{ programme_id: 'p3', lga: 'Ganye' }]);
    expect(lastAudit()?.details).toMatchObject({ lgas: ['Ganye'] });
  });

  it('propagates the upsert error and skips the audit', async () => {
    state.result = { data: null, error: { message: 'FK violation' } };
    const { error } = await dbSetProgrammeLgaScope('p1', ['Ganye']);
    expect(error).not.toBeNull();
    expect((error as Error | null)?.message).toBe('FK violation');
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('dbDeleteProgramme', () => {
  it('deletes by id and audits', async () => {
    resolve(null);
    await dbDeleteProgramme('p-42');
    const del = state.ops.find(o => o.op === 'delete');
    expect(del?.table).toBe('programmes');
    const eq = state.ops.find(o => o.op === 'eq');
    expect(eq?.col).toBe('id');
    expect(eq?.val).toBe('p-42');
    expect(lastAudit()?.table).toBe('programmes');
    expect(lastAudit()?.action).toBe('delete');
  });
});

describe('dbSaveCohort', () => {
  it('requires programme, centre and name in the payload', async () => {
    resolve({ id: 'c-1', name: '2026 Intake A' });
    await dbSaveCohort(
      { programme_id: 'prog-1', centre_id: 'cent-1', name: '2026 Intake A', capacity: 40 },
      { ownerOrgId: 'org-9' }
    );
    const insert = state.ops.find(o => o.op === 'insert');
    const payload = insert?.payload as Record<string, unknown>;
    expect(payload.programme_id).toBe('prog-1');
    expect(payload.centre_id).toBe('cent-1');
    expect(payload.name).toBe('2026 Intake A');
    expect(payload.status).toBe('planned');
    expect(payload.capacity).toBe(40);
    expect(payload.owner_org_id).toBe('org-9');
    expect(lastAudit()?.table).toBe('cohorts');
    expect(lastAudit()?.action).toBe('create');
  });
});

describe('dbSaveLearner', () => {
  it('inserts a learner with defaults and trims empty reference to null', async () => {
    resolve({ id: 'l-1', full_name: 'Bala Danladi' });
    await dbSaveLearner({ full_name: 'Bala Danladi', reference_no: '   ' });
    const insert = state.ops.find(o => o.op === 'insert');
    const payload = insert?.payload as Record<string, unknown>;
    expect(payload.full_name).toBe('Bala Danladi');
    expect(payload.reference_no).toBeNull();
    expect(payload.status).toBe('active');
    expect(lastAudit()?.table).toBe('learners');
    expect(lastAudit()?.action).toBe('create');
  });

  it('stamps completed_on automatically when status becomes completed', async () => {
    resolve({ id: 'l-2' });
    await dbSaveLearner({ full_name: 'Bala', status: 'completed' });
    const payload = state.ops.find(o => o.op === 'insert')?.payload as Record<string, unknown>;
    expect(typeof payload.completed_on).toBe('string');
    expect(payload.completed_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clears completed_on for non-completed statuses', async () => {
    resolve({ id: 'l-3' });
    await dbSaveLearner({ full_name: 'Bala', status: 'dropped_out', completed_on: '2026-05-01' });
    const payload = state.ops.find(o => o.op === 'insert')?.payload as Record<string, unknown>;
    expect(payload.completed_on).toBeNull();
  });

  it('does not audit a failed enrolment', async () => {
    state.result = { data: null, error: { message: 'unique violation' } };
    await dbSaveLearner({ full_name: 'Dup', reference_no: 'R-1' });
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('dbDeleteLearner', () => {
  it('deletes by id and audits', async () => {
    resolve(null);
    await dbDeleteLearner('l-7');
    const del = state.ops.find(o => o.op === 'delete');
    expect(del?.table).toBe('learners');
    const eq = state.ops.find(o => o.op === 'eq');
    expect(eq?.val).toBe('l-7');
    expect(lastAudit()?.table).toBe('learners');
    expect(lastAudit()?.action).toBe('delete');
  });
});

describe('dbDeleteCohort', () => {
  it('deletes by id and audits', async () => {
    resolve(null);
    await dbDeleteCohort('c-3');
    const del = state.ops.find(o => o.op === 'delete');
    expect(del?.table).toBe('cohorts');
    expect(lastAudit()?.table).toBe('cohorts');
  });
});
