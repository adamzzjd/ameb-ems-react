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
    chain.upsert = (payload: unknown, opts: unknown) => record('upsert', { payload, opts });
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
import { dbLoadLgaAreaOfficers, dbSetLgaAreaOfficer, dbRemoveLgaAreaOfficer } from '../lgaOfficers';
import {
  dbLoadPartnerOrganisations, dbSavePartnerOrganisation, dbDeletePartnerOrganisation,
  dbLoadOrganisationMembers, dbSetCentreApproval,
} from '../partners';

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

describe('lga area officers service', () => {
  it('dbLoadLgaAreaOfficers reads the register ordered by LGA', async () => {
    resolve([{ id: 'o-1', lga: 'Yola North', employee_id: 'e-1' }]);
    const { data } = await dbLoadLgaAreaOfficers();
    expect(data).toHaveLength(1);
    expect(opsOf('lga_area_officers', 'order')[0]).toMatchObject({ col: 'lga' });
  });

  it('dbSetLgaAreaOfficer upserts one officer per LGA and audits the assignment', async () => {
    resolve({ id: 'o-1', lga: 'Yola North', employee_id: 'e-1' });
    const { data, error } = await dbSetLgaAreaOfficer('Yola North', 'e-1', 'Zonal lead');

    expect(error).toBeNull();
    expect(data?.lga).toBe('Yola North');
    const upsert = opsOf('lga_area_officers', 'upsert')[0];
    const payload = upsert.payload as Record<string, unknown>;
    expect(payload.id).toBeTruthy();
    expect(payload.lga).toBe('Yola North');
    expect(payload.employee_id).toBe('e-1');
    expect(payload.remarks).toBe('Zonal lead');
    // Conflict target keeps it to a single officer per LGA
    expect(upsert.opts).toMatchObject({ onConflict: 'lga' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'assign', table: 'lga_area_officers', rowId: 'o-1',
      details: { lga: 'Yola North', employee_id: 'e-1' },
    });
  });

  it('dbRemoveLgaAreaOfficer deletes and audits', async () => {
    resolve(null);
    const { error } = await dbRemoveLgaAreaOfficer('o-1');
    expect(error).toBeNull();
    expect(opsOf('lga_area_officers', 'delete')).toHaveLength(1);
    expect(opsOf('lga_area_officers', 'eq')[0]).toMatchObject({ col: 'id', val: 'o-1' });
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'lga_area_officers', rowId: 'o-1' });
  });

  it('does not audit when the upsert fails', async () => {
    resolve(null, new Error('RLS denied'));
    const { error } = await dbSetLgaAreaOfficer('Demsa', 'e-2');
    expect(error?.message).toBe('RLS denied');
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

describe('partner organisations service', () => {
  it('dbLoadPartnerOrganisations lists alphabetically', async () => {
    resolve([{ id: 'p-1', name: 'Hope Initiative', type: 'NGO' }]);
    const { data } = await dbLoadPartnerOrganisations();
    expect(data).toHaveLength(1);
    expect(opsOf('partner_organisations', 'order')[0]).toMatchObject({ col: 'name' });
  });

  it('dbSavePartnerOrganisation inserts a new org with sane defaults and audits a create', async () => {
    resolve({ id: 'p-1', name: 'Hope Initiative' });
    const { data, error } = await dbSavePartnerOrganisation({ name: 'Hope Initiative' });

    expect(error).toBeNull();
    expect(data?.id).toBe('p-1');
    const insert = opsOf('partner_organisations', 'insert')[0].payload as Record<string, unknown>;
    expect(insert.id).toBeTruthy();
    expect(insert.name).toBe('Hope Initiative');
    expect(insert.type).toBe('NGO');
    expect(insert.status).toBe('active');
    expect(insert.remarks).toBe('');
    expect(logAudit).toHaveBeenCalledWith({
      action: 'create', table: 'partner_organisations', rowId: 'p-1',
      details: { name: 'Hope Initiative', type: 'NGO' },
    });
  });

  it('dbSavePartnerOrganisation updates an existing org and audits an update', async () => {
    resolve({ id: 'p-1', name: 'Hope Initiative (Renamed)' });
    const { error } = await dbSavePartnerOrganisation({ id: 'p-1', name: 'Hope Initiative (Renamed)', type: 'LGA' });

    expect(error).toBeNull();
    expect(opsOf('partner_organisations', 'update')).toHaveLength(1);
    expect(opsOf('partner_organisations', 'eq')[0]).toMatchObject({ col: 'id', val: 'p-1' });
    expect(logAudit).toHaveBeenCalledWith({
      action: 'update', table: 'partner_organisations', rowId: 'p-1',
      details: { name: 'Hope Initiative (Renamed)', type: 'LGA' },
    });
  });

  it('dbDeletePartnerOrganisation deletes and audits', async () => {
    resolve(null);
    const { error } = await dbDeletePartnerOrganisation('p-1');
    expect(error).toBeNull();
    expect(opsOf('partner_organisations', 'delete')).toHaveLength(1);
    expect(opsOf('partner_organisations', 'eq')[0]).toMatchObject({ col: 'id', val: 'p-1' });
    expect(logAudit).toHaveBeenCalledWith({ action: 'delete', table: 'partner_organisations', rowId: 'p-1' });
  });

  it('dbLoadOrganisationMembers reads the membership links', async () => {
    resolve([{ id: 'm-1', organisation_id: 'p-1', user_id: 'u-2', org_role: 'org_admin' }]);
    const { data } = await dbLoadOrganisationMembers();
    expect(data).toHaveLength(1);
  });

  it('dbSetCentreApproval approves a centre and audits the decision', async () => {
    resolve({ id: 'c-9', name: 'Partner Centre' });
    const { error } = await dbSetCentreApproval('c-9', 'approved', { approverEmail: 'admin@ameb.gov.ng' });

    expect(error).toBeNull();
    const update = opsOf('centres', 'update')[0].payload as Record<string, unknown>;
    expect(update.approval_status).toBe('approved');
    expect(update.approved_by).toBe('admin@ameb.gov.ng');
    expect(update.approved_at).toBeTruthy();
    expect(logAudit).toHaveBeenCalledWith({
      action: 'approve', table: 'centres', rowId: 'c-9', details: { status: 'approved' },
    });
  });

  it('dbSetCentreApproval rejects a centre with a reason and audits it', async () => {
    resolve({ id: 'c-9' });
    const { error } = await dbSetCentreApproval('c-9', 'rejected', { note: 'No MOU on file' });

    expect(error).toBeNull();
    const update = opsOf('centres', 'update')[0].payload as Record<string, unknown>;
    expect(update.approval_status).toBe('rejected');
    expect(update.rejection_note).toBe('No MOU on file');
    expect(logAudit).toHaveBeenCalledWith({
      action: 'reject', table: 'centres', rowId: 'c-9',
      details: { status: 'rejected', note: 'No MOU on file' },
    });
  });

  it('does not audit when a partner write fails', async () => {
    resolve(null, new Error('RLS denied'));
    const { error } = await dbSavePartnerOrganisation({ name: 'Blocked Org' });
    expect(error?.message).toBe('RLS denied');
    expect(logAudit).not.toHaveBeenCalled();
  });
});
