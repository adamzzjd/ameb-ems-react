import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same mocked-Supabase pattern as hierarchyServices.test.ts.
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
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
  };
});

import {
  dbSaveAsset, dbDeleteAsset,
  dbSaveCorrespondence, dbDeleteCorrespondence,
} from '../assets';

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

const lastAudit = () => {
  const calls = logAudit.mock.calls as unknown as Array<[{ table: string; action: string; details?: Record<string, unknown> }]>;
  return calls[calls.length - 1]?.[0];
};

const opsOf = (table: string, op: string) => state.ops.filter(o => o.table === table && o.op === op);

function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  logAudit.mockClear();
});

describe('dbSaveAsset', () => {
  it('inserts a new asset with a generated id and audits it', async () => {
    resolve({ id: 'a1' });
    const { error } = await dbSaveAsset({ tag: 'AMEB-ICT-001', name: 'Desktop PC', category: 'ICT' });
    expect(error).toBeNull();

    const insert = opsOf('board_assets', 'insert')[0];
    expect(insert).toBeTruthy();
    expect((insert?.payload as Record<string, unknown>).tag).toBe('AMEB-ICT-001');
    expect((insert?.payload as Record<string, unknown>).quantity).toBe(1);
    expect((insert?.payload as Record<string, unknown>).condition).toBe('good');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', table: 'board_assets' }));
  });

  it('keeps location pointers mutually exclusive', async () => {
    resolve({ id: 'a2' });
    await dbSaveAsset({
      tag: 'AMEB-FUR-002', name: 'Desk', category: 'Furniture',
      station_id: 's1', department_id: 'd1', centre_id: 'c1',
    });
    const payload = opsOf('board_assets', 'insert')[0]?.payload as Record<string, unknown>;
    // station wins — the others must be nulled, never all set at once
    expect(payload.station_id).toBe('s1');
    expect(payload.department_id).toBeNull();
    expect(payload.centre_id).toBeNull();
  });

  it('updates in place and audits with the asset tag', async () => {
    resolve({ id: 'a1' });
    const { error } = await dbSaveAsset({ id: 'a1', tag: 'AMEB-ICT-001', name: 'Desktop PC (upgraded)', condition: 'fair' });
    expect(error).toBeNull();

    expect(opsOf('board_assets', 'update')).toHaveLength(1);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'id' && o.val === 'a1')).toBe(true);
    expect(lastAudit()).toMatchObject({ action: 'update', table: 'board_assets' });
  });
});

describe('dbDeleteAsset', () => {
  it('deletes by id and audits', async () => {
    resolve(null);
    const { error } = await dbDeleteAsset('a1');
    expect(error).toBeNull();
    expect(state.ops.some(o => o.op === 'delete' && o.table === 'board_assets')).toBe(true);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'id' && o.val === 'a1')).toBe(true);
    expect(lastAudit()).toMatchObject({ action: 'delete', table: 'board_assets' });
  });

  it('does not audit when the delete fails', async () => {
    resolve(null, new Error('RLS violation'));
    const { error } = await dbDeleteAsset('a1');
    expect(error).toBeTruthy();
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('dbSaveCorrespondence', () => {
  it('inserts with defaults (memo / internal / filed) and audits', async () => {
    resolve({ id: 'c1' });
    const { error } = await dbSaveCorrespondence({ ref_no: 'AMEB/ADM/2026/014', title: 'Resumption circular' });
    expect(error).toBeNull();

    const payload = opsOf('correspondence', 'insert')[0]?.payload as Record<string, unknown>;
    expect(payload.kind).toBe('memo');
    expect(payload.direction).toBe('internal');
    expect(payload.status).toBe('filed');
    expect(payload.date_issued).toBeNull();
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', table: 'correspondence' }));
  });

  it('nulls optional document fields when absent', async () => {
    resolve({ id: 'c2' });
    await dbSaveCorrespondence({ ref_no: 'AMEB/FIN/2026/001', title: 'Minutes', kind: 'minutes' });
    const payload = opsOf('correspondence', 'insert')[0]?.payload as Record<string, unknown>;
    expect(payload.file_name).toBeNull();
    expect(payload.url).toBeNull();
    expect(payload.size_bytes).toBeNull();
  });

  it('updates in place and audits the ref no', async () => {
    resolve({ id: 'c1' });
    const { error } = await dbSaveCorrespondence({ id: 'c1', ref_no: 'AMEB/ADM/2026/014', title: 'Updated title', status: 'archived' });
    expect(error).toBeNull();

    expect(opsOf('correspondence', 'update')).toHaveLength(1);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'id' && o.val === 'c1')).toBe(true);
    expect(lastAudit()).toMatchObject({ action: 'update', table: 'correspondence', details: { ref_no: 'AMEB/ADM/2026/014' } });
  });
});

describe('dbDeleteCorrespondence', () => {
  it('deletes by id and audits', async () => {
    resolve(null);
    const { error } = await dbDeleteCorrespondence('c1');
    expect(error).toBeNull();
    expect(state.ops.some(o => o.op === 'delete' && o.table === 'correspondence')).toBe(true);
    expect(lastAudit()).toMatchObject({ action: 'delete', table: 'correspondence' });
  });
});
