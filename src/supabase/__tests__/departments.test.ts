import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same mocked-Supabase pattern as forms.test.ts / registerServices.test.ts.
const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
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
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => buildChain(table),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
      },
    },
  };
});

import { dbLoadDepartments, dbSaveDepartment, dbDeleteDepartment } from '../departments';

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

const lastAudit = () => {
  const calls = logAudit.mock.calls as unknown as Array<[{ table: string; action: string }]>[];
  return (calls as unknown as Array<[{ table: string; action: string }]>)[
    (logAudit.mock.calls as unknown[]).length - 1
  ]?.[0];
};

function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  logAudit.mockClear();
});

describe('departments service', () => {
  it('loads ordered by name', async () => {
    resolve([{ id: 'd1', name: 'Literacy' }]);
    const { data, error } = await dbLoadDepartments();
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'd1', name: 'Literacy' }]);
    expect(state.ops[0]).toMatchObject({ op: 'order', table: 'departments' });
  });

  it('inserts with defaults, generates an id and audits', async () => {
    resolve({ id: 'd2', name: 'Planning' });
    const { data, error } = await dbSaveDepartment({ name: 'Planning', code: 'PLN' });
    expect(error).toBeNull();
    expect(data).toEqual({ id: 'd2', name: 'Planning' });

    const insert = state.ops.find(o => o.op === 'insert' && o.table === 'departments');
    expect(insert).toBeDefined();
    const payload = insert!.payload as Record<string, unknown>;
    expect(payload.name).toBe('Planning');
    expect(payload.code).toBe('PLN');
    expect(payload.status).toBe('active');
    expect(payload.description).toBe('');
    expect(payload.head_employee_id).toBeNull();
    expect(typeof payload.id).toBe('string');

    expect(lastAudit()).toMatchObject({ table: 'departments', action: 'create' });
  });

  it('updates by id and audits', async () => {
    resolve({ id: 'd1', name: 'Literacy & Adult Ed' });
    const { error } = await dbSaveDepartment({
      id: 'd1', name: 'Literacy & Adult Ed', head_employee_id: 'e9',
    });
    expect(error).toBeNull();

    const update = state.ops.find(o => o.op === 'update' && o.table === 'departments');
    expect(update).toBeDefined();
    expect(update!.payload).toMatchObject({ name: 'Literacy & Adult Ed', head_employee_id: 'e9' });
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'id' && o.val === 'd1')).toBe(true);
    expect(lastAudit()).toMatchObject({ table: 'departments', action: 'update' });
  });

  it('propagates save errors without auditing', async () => {
    resolve(null, new Error('permission denied'));
    const { data, error } = await dbSaveDepartment({ name: 'X' });
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('deletes by id and audits', async () => {
    resolve(null);
    const { error } = await dbDeleteDepartment('d1');
    expect(error).toBeNull();
    expect(state.ops.find(o => o.op === 'delete' && o.table === 'departments')).toBeDefined();
    expect(state.ops.find(o => o.op === 'eq' && o.col === 'id' && o.val === 'd1')).toBeDefined();
    expect(lastAudit()).toMatchObject({ table: 'departments', action: 'delete' });
  });
});
