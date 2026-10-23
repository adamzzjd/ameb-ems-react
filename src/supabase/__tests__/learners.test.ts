import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
  sessionUser: {
    id: 'u-1',
    email: 'admin@ameb.gov.ng',
    app_metadata: { role: 'super_admin' },
  } as Record<string, unknown>,
  ops: [] as { op: string; table: string; payload?: unknown; col?: unknown; val?: unknown }[],
}));

vi.mock('../client', () => {
  const buildChain = (table: string) => {
    const chain = Object.assign(() => ({}), {}) as Record<string, unknown> & { (): unknown };
    const record = (op: string, extra?: { payload?: unknown; col?: unknown; val?: unknown }) => {
      state.ops.push({ op, table, ...extra });
      return chain;
    };
    chain.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(state.result).then(onFulfilled);
    chain.select = () => record('select');
    chain.order = () => record('order');
    chain.single = () => Promise.resolve(state.result);
    chain.eq = (col: unknown, val: unknown) => record('eq', { col, val });
    chain.insert = (payload: unknown) => record('insert', { payload });
    chain.update = (payload: unknown) => record('update', { payload });
    chain.delete = () => record('delete');
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => buildChain(table),
      auth: {
        getSession: () => Promise.resolve({ data: { session: state.sessionUser ? { user: state.sessionUser } : null } }),
      },
    },
  };
});

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

import { dbLoadLearners, dbSaveLearner, dbDeleteLearner, dbImportLearners } from '../learners';

const opsOf = (table: string, op?: string) =>
  state.ops.filter(o => o.table === table && (!op || o.op === op));

function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  logAudit.mockClear();
});

describe('learners service', () => {
  it('dbLoadLearners selects the centre name with each learner', async () => {
    resolve([{ id: 'l-1', full_name: 'Aisha Bello', centres: { name: 'GSS Girei' } }]);
    const { data, error } = await dbLoadLearners();

    expect(error).toBeNull();
    expect(data?.[0].centres?.name).toBe('GSS Girei');
    expect(opsOf('learners', 'select')).toHaveLength(1);
    expect(opsOf('learners', 'order')).toHaveLength(1);
  });

  it('dbSaveLearner inserts a new learner with a normalised payload', async () => {
    resolve({ id: 'l-2', full_name: 'Aisha Bello' });
    const { data, error } = await dbSaveLearner({
      full_name: '  Aisha Bello ',
      reference_no: ' am/001 ',
      centre_id: 'c-9',
      gender: 'Female',
      status: 'active',
    });

    expect(error).toBeNull();
    expect(data?.id).toBe('l-2');
    const insert = opsOf('learners', 'insert')[0].payload as Record<string, unknown>;
    expect(insert).toMatchObject({
      full_name: 'Aisha Bello',
      reference_no: 'AM/001',
      centre_id: 'c-9',
      gender: 'Female',
      status: 'active',
    });
    expect(insert.id).toBeTruthy();
    expect(insert.notes).toBeNull();
    expect(logAudit).toHaveBeenCalledWith({
      action: 'create', table: 'learners', rowId: 'l-2',
      details: { name: 'Aisha Bello', reference: 'AM/001' },
    });
  });

  it('dbSaveLearner updates an existing learner and audits it', async () => {
    resolve({ id: 'l-1', full_name: 'Renamed Learner' });
    const { error } = await dbSaveLearner({ id: 'l-1', full_name: 'Renamed Learner' });

    expect(error).toBeNull();
    expect(opsOf('learners', 'update')).toHaveLength(1);
    expect(opsOf('learners', 'eq')[0]).toMatchObject({ col: 'id', val: 'l-1' });
    const update = opsOf('learners', 'update')[0].payload as Record<string, unknown>;
    expect(update.updated_at).toBeTruthy();
    expect(logAudit).toHaveBeenCalledWith({
      action: 'update', table: 'learners', rowId: 'l-1',
      details: { name: 'Renamed Learner', reference: null },
    });
  });

  it('does not audit a failed write', async () => {
    resolve(null, new Error('duplicate key value violates unique constraint'));
    const { error } = await dbSaveLearner({ full_name: 'Aisha Bello', reference_no: 'AM/001' });

    expect(error?.message).toMatch(/duplicate key/);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('dbImportLearners does nothing for an empty batch', async () => {
    const { data, error } = await dbImportLearners([]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(opsOf('learners', 'insert')).toHaveLength(0);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('dbImportLearners inserts the batch and audits once with the count', async () => {
    resolve([{ id: 'l-1' }, { id: 'l-2' }]);
    const { error } = await dbImportLearners([
      { full_name: 'Aisha Bello', reference_no: 'am/001', centre_id: 'c-1' },
      { full_name: 'Musa Adamu', reference_no: 'am/002', status: 'completed' },
    ]);

    expect(error).toBeNull();
    const payload = opsOf('learners', 'insert')[0].payload as Record<string, unknown>[];
    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({ full_name: 'Aisha Bello', reference_no: 'AM/001', centre_id: 'c-1' });
    expect(payload[1]).toMatchObject({ full_name: 'Musa Adamu', status: 'completed', centre_id: null });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'import', table: 'learners',
      details: { count: 2, first: 'Aisha Bello' },
    });
  });

  it('dbDeleteLearner deletes and audits a delete', async () => {
    const { error } = await dbDeleteLearner('l-7');
    expect(error).toBeNull();
    expect(opsOf('learners', 'delete')).toHaveLength(1);
    expect(opsOf('learners', 'eq')[0]).toMatchObject({ col: 'id', val: 'l-7' });
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'learners', rowId: 'l-7' });
  });
});
