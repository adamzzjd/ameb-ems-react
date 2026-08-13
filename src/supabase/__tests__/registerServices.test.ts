import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mutable state the mock reads: the query result the chain resolves to,
// the signed-in session user (for audit logging), and every op performed.
const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
  sessionUser: {
    id: 'u-1',
    email: 'admin@ameb.gov.ng',
    app_metadata: { role: 'super_admin' },
  } as Record<string, unknown>,
  ops: [] as {
    op: string;
    table: string;
    payload?: unknown;
    col?: unknown;
    val?: unknown;
    opts?: unknown;
  }[],
}));

vi.mock('../client', () => {
  // A thenable chain: every query method records its op and returns the chain,
  // and awaiting the chain resolves to `state.result` (like the real PostgREST
  // builder resolves to { data, error }).
  const buildChain = (table: string) => {
    const chain = Object.assign(() => ({}), {}) as Record<string, unknown> & {
      (): unknown;
    };
    const record = (op: string, extra?: { payload?: unknown; col?: unknown; val?: unknown; opts?: unknown }) => {
      state.ops.push({ op, table, ...extra });
      return chain;
    };
    // Thenable: awaiting the chain (e.g. after .delete().eq() with no .single())
    // resolves to the mocked { data, error } result like the real PostgREST
    // builder does.
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

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock('../audit', () => ({ logAudit, dbLoadAuditLog: vi.fn() }));

import { dbSaveCentre, dbDeleteCentre } from '../centres';
import { dbAddFacilitator, dbUpdateFacilitator, dbDeleteFacilitator, dbSetCentreFacilitators } from '../facilitators';
import { dbLoadEnrolmentStats, dbSaveEnrolmentStat, dbDeleteEnrolmentStat } from '../enrolments';

const opsOf = (table: string, op?: string) =>
  state.ops.filter(o => o.table === table && (!op || o.op === op));

function resolve(data: unknown, error: Error | null = null) {
  state.result = { data, error };
}

beforeEach(() => {
  state.ops.length = 0;
  state.result = { data: null, error: null };
  state.sessionUser = {
    id: 'u-1',
    email: 'admin@ameb.gov.ng',
    app_metadata: { role: 'super_admin' },
  };
  logAudit.mockClear();
});

describe('centres service', () => {
  it('dbSaveCentre inserts a new centre and audits a create', async () => {
    resolve({ id: 'c-1', name: 'Yola Adult Literacy Centre', lga: 'Yola North' });
    const { data, error } = await dbSaveCentre({ name: 'Yola Adult Literacy Centre', lga: 'Yola North' });

    expect(error).toBeNull();
    expect(data?.id).toBe('c-1');
    const inserts = opsOf('centres', 'insert');
    expect(inserts).toHaveLength(1);
    expect((inserts[0].payload as Record<string, unknown>).name).toBe('Yola Adult Literacy Centre');
    expect((inserts[0].payload as Record<string, unknown>).id).toBeTruthy();
    expect(logAudit).toHaveBeenCalledWith({
      action: 'create', table: 'centres', rowId: 'c-1',
      details: { name: 'Yola Adult Literacy Centre', lga: 'Yola North' },
    });
  });

  it('dbSaveCentre updates an existing centre and audits an update', async () => {
    resolve({ id: 'c-1', name: 'Renamed Centre' });
    const { error } = await dbSaveCentre({ id: 'c-1', name: 'Renamed Centre', lga: 'Mubi North' });

    expect(error).toBeNull();
    expect(opsOf('centres', 'update')).toHaveLength(1);
    expect(opsOf('centres', 'eq')[0]).toMatchObject({ col: 'id', val: 'c-1' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'update', table: 'centres', rowId: 'c-1',
      details: { name: 'Renamed Centre', lga: 'Mubi North' },
    });
  });

  it('dbDeleteCentre deletes and audits a delete', async () => {
    resolve(null);
    const { error } = await dbDeleteCentre('c-1');
    expect(error).toBeNull();
    expect(opsOf('centres', 'delete')).toHaveLength(1);
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'centres', rowId: 'c-1' });
  });

  it('does not audit when the write fails', async () => {
    resolve(null, new Error('RLS denied'));
    const { error } = await dbDeleteCentre('c-1');
    expect(error?.message).toBe('RLS denied');
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('facilitators service', () => {
  it('dbAddFacilitator inserts and audits a create', async () => {
    resolve({ id: 'f-1', name: 'Aisha Bello' });
    const { data, error } = await dbAddFacilitator('Aisha Bello', { lga: 'Yola North' });

    expect(error).toBeNull();
    expect(data?.id).toBe('f-1');
    const insert = opsOf('facilitators', 'insert')[0].payload as Record<string, unknown>;
    expect(insert.name).toBe('Aisha Bello');
    expect(insert.lga).toBe('Yola North');
    expect(insert.gender).toBeNull();
    expect(logAudit).toHaveBeenCalledWith({
      action: 'create', table: 'facilitators', rowId: 'f-1', details: { name: 'Aisha Bello' },
    });
  });

  it('dbUpdateFacilitator updates and audits', async () => {
    resolve({ id: 'f-1', name: 'Aisha Bello' });
    const { error } = await dbUpdateFacilitator('f-1', 'Aisha Bello', { community: 'Jambutu' });
    expect(error).toBeNull();
    expect(opsOf('facilitators', 'update')).toHaveLength(1);
    expect(opsOf('facilitators', 'eq')[0]).toMatchObject({ col: 'id', val: 'f-1' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'update', table: 'facilitators', rowId: 'f-1', details: { name: 'Aisha Bello' },
    });
  });

  it('dbDeleteFacilitator deletes and audits', async () => {
    resolve(null);
    const { error } = await dbDeleteFacilitator('f-1');
    expect(error).toBeNull();
    expect(opsOf('facilitators', 'delete')).toHaveLength(1);
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'facilitators', rowId: 'f-1' });
  });

  it('dbSetCentreFacilitators replaces assignments and audits the count', async () => {
    resolve(null);
    const { error } = await dbSetCentreFacilitators('c-1', ['f-1', 'f-2']);

    expect(error).toBeNull();
    // delete of old links + insert of the new set
    expect(opsOf('centre_facilitators', 'delete')).toHaveLength(1);
    const insert = opsOf('centre_facilitators', 'insert')[0].payload as { centre_id: string; facilitator_id: string }[];
    expect(insert).toHaveLength(2);
    expect(insert[1]).toEqual({ centre_id: 'c-1', facilitator_id: 'f-2' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'assign', table: 'centre_facilitators', rowId: 'c-1', details: { count: 2 },
    });
  });

  it('dbSetCentreFacilitators does not insert when the delete fails', async () => {
    // First op (delete) fails → no insert, no audit
    resolve(null, new Error('no permission'));
    const { error } = await dbSetCentreFacilitators('c-1', ['f-1']);
    expect(error).toBeTruthy();
    expect(opsOf('centre_facilitators', 'insert')).toHaveLength(0);
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('enrolment stats service', () => {
  it('dbLoadEnrolmentStats reads newest year first', async () => {
    resolve([{ id: 'e-1', year: 2026 }]);
    const { data } = await dbLoadEnrolmentStats();
    expect(data).toHaveLength(1);
    expect(opsOf('enrolment_stats', 'order')[0]).toMatchObject({ col: 'year' });
  });

  it('dbSaveEnrolmentStat inserts with zeroed defaults and audits a create', async () => {
    resolve({ id: 'e-1', year: 2026 });
    const { data, error } = await dbSaveEnrolmentStat({ year: 2026 });

    expect(error).toBeNull();
    expect(data?.id).toBe('e-1');
    const insert = opsOf('enrolment_stats', 'insert')[0].payload as Record<string, unknown>;
    expect(insert.learners_enrolled).toBe(0);
    expect(insert.certified).toBe(0);
    expect(insert.dropped_out).toBe(0);
    expect(insert.no_exam).toBe(0);
    expect(insert.ngos).toEqual([]);
    expect(logAudit).toHaveBeenCalledWith({
      action: 'create', table: 'enrolment_stats', rowId: 'e-1', details: { year: 2026 },
    });
  });

  it('dbSaveEnrolmentStat updates and audits', async () => {
    resolve({ id: 'e-1', year: 2025, learners_enrolled: 100 });
    const { error } = await dbSaveEnrolmentStat({ id: 'e-1', year: 2025, learners_enrolled: 100 });
    expect(error).toBeNull();
    expect(opsOf('enrolment_stats', 'update')).toHaveLength(1);
    expect(opsOf('enrolment_stats', 'eq')[0]).toMatchObject({ col: 'id', val: 'e-1' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'update', table: 'enrolment_stats', rowId: 'e-1', details: { year: 2025 },
    });
  });

  it('dbDeleteEnrolmentStat deletes and audits', async () => {
    resolve(null);
    const { error } = await dbDeleteEnrolmentStat('e-1');
    expect(error).toBeNull();
    expect(opsOf('enrolment_stats', 'delete')).toHaveLength(1);
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'enrolment_stats', rowId: 'e-1' });
  });
});
