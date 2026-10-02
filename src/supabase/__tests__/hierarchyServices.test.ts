import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same mocked-Supabase pattern as forms.test.ts / delivery.test.ts.
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
    chain.upsert = (payload: unknown, opts: unknown) => record('upsert', { payload, opts });
    chain.update = (payload: unknown) => record('update', { payload });
    chain.delete = () => record('delete');
    chain.not = (col: unknown, op: unknown, val: unknown) => record('not', { col, val: `${op} ${val}` });
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
  dbSetCentreOrganisations,
  dbLinkCentreToOrg,
  dbLoadOrgLgaCoverage,
  dbSetOrgLgaCoverage,
} from '../partners';

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

describe('dbSetCentreOrganisations', () => {
  it('replaces the link set: one lead plus partners', async () => {
    resolve(null);
    const { error } = await dbSetCentreOrganisations('c1', [
      { org_id: 'o1', role: 'lead' },
      { org_id: 'o2', role: 'partner' },
    ]);
    expect(error).toBeNull();

    expect(opsOf('centre_organisations', 'delete')).toHaveLength(1);
    expect(state.ops.some(o => o.op === 'eq' && o.col === 'centre_id' && o.val === 'c1')).toBe(true);

    const insert = opsOf('centre_organisations', 'insert')[0];
    expect(insert?.payload).toEqual([
      { centre_id: 'c1', org_id: 'o1', role: 'lead' },
      { centre_id: 'c1', org_id: 'o2', role: 'partner' },
    ]);
    expect(lastAudit()).toMatchObject({ table: 'centre_organisations', action: 'assign' });
  });

  it('deletes all links when given an empty set and audits it', async () => {
    resolve(null);
    const { error } = await dbSetCentreOrganisations('c2', []);
    expect(error).toBeNull();
    expect(opsOf('centre_organisations', 'delete')).toHaveLength(1);
    expect(opsOf('centre_organisations', 'insert')).toHaveLength(0);
    expect(lastAudit()?.details).toMatchObject({ orgs: [] });
  });

  it('propagates the delete error and stops before inserting', async () => {
    state.result = { data: null, error: { message: 'RLS violation' } };
    const { error } = await dbSetCentreOrganisations('c1', [{ org_id: 'o1', role: 'lead' }]);
    expect(error).not.toBeNull();
    expect((error as Error | null)?.message).toBe('RLS violation');
    expect(opsOf('centre_organisations', 'insert')).toHaveLength(0);
    expect(logAudit).not.toHaveBeenCalled();
  });
});

describe('dbLoadOrgLgaCoverage', () => {
  it('returns rows on success', async () => {
    resolve([{ org_id: 'o1', lga: 'Ganye' }]);
    const { data, error } = await dbLoadOrgLgaCoverage();
    expect(error).toBeNull();
    expect(data).toEqual([{ org_id: 'o1', lga: 'Ganye' }]);
  });

  it('returns the error when the table is missing (setup_hierarchy.sql not run)', async () => {
    state.result = { data: null, error: { message: 'Could not find the table' } };
    const { data, error } = await dbLoadOrgLgaCoverage();
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe('dbLinkCentreToOrg', () => {
  it('registers one centre to one org without touching other links', async () => {
    resolve([]);
    const { error } = await dbLinkCentreToOrg('c1', 'o1', 'partner');
    expect(error).toBeNull();
    // Crucially: no delete — a centre that already serves other orgs keeps them.
    expect(opsOf('centre_organisations', 'delete')).toHaveLength(0);
    const insert = opsOf('centre_organisations', 'insert')[0];
    expect(insert?.payload).toMatchObject({ centre_id: 'c1', org_id: 'o1', role: 'partner' });
    expect(lastAudit()).toMatchObject({ action: 'assign', table: 'centre_organisations' });
  });

  it('defaults the role to lead', async () => {
    resolve([]);
    await dbLinkCentreToOrg('c1', 'o1');
    expect(opsOf('centre_organisations', 'insert')[0]?.payload).toMatchObject({ role: 'lead' });
  });

  it('is idempotent — an existing link is a no-op, not a duplicate row', async () => {
    resolve([{ id: 'existing' }]);
    const { error } = await dbLinkCentreToOrg('c1', 'o1');
    expect(error).toBeNull();
    expect(opsOf('centre_organisations', 'insert')).toHaveLength(0);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('surfaces a read error without writing', async () => {
    resolve(null, new Error('permission denied'));
    const { error } = await dbLinkCentreToOrg('c1', 'o1');
    expect(error?.message).toBe('permission denied');
    expect(opsOf('centre_organisations', 'insert')).toHaveLength(0);
  });
});

describe('dbSetOrgLgaCoverage', () => {
  it('replaces coverage rows for an org', async () => {
    resolve(null);
    const { error } = await dbSetOrgLgaCoverage('o1', ['Ganye', 'Hong']);
    expect(error).toBeNull();
    expect(opsOf('organisation_lga_coverage', 'delete')).toHaveLength(1);
    const insert = opsOf('organisation_lga_coverage', 'insert')[0];
    expect(insert?.payload).toEqual([
      { org_id: 'o1', lga: 'Ganye' },
      { org_id: 'o1', lga: 'Hong' },
    ]);
    expect(lastAudit()?.details).toMatchObject({ lgas: ['Ganye', 'Hong'] });
  });

  it('clears coverage with an empty set', async () => {
    resolve(null);
    const { error } = await dbSetOrgLgaCoverage('o1', []);
    expect(error).toBeNull();
    expect(opsOf('organisation_lga_coverage', 'insert')).toHaveLength(0);
    expect(lastAudit()?.details).toMatchObject({ lgas: [] });
  });
});
