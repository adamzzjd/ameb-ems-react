import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  calls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock('../client', () => ({
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      return Promise.resolve(state.result);
    },
  },
}));

import {
  lookupProfile, submitUpdate, listRequests, decideRequest,
} from '../selfService';

const PROFILE = {
  id: 'e-1', psn: 'PS/AM/0123', name: 'Aisha Bello', gender: 'Female', grade: '07',
  cadre: 'Teaching', date_first_appt: null, date_present_appt: null, dob: '1990-05-17',
  phone: '08031234567', lga: 'Yola', station: 'Yola', address: null, photo: null,
  step: '3', remarks: null,
};

const rpcCall = (fn: string) => state.calls.find(c => c.fn === fn);

beforeEach(() => {
  state.calls.length = 0;
  state.result = { data: null, error: null };
});

describe('self-service lookup', () => {
  it('loads the record for a trimmed PSN', async () => {
    state.result = {
      data: { ok: true, already_submitted: false, pending: false, profile: PROFILE },
      error: null,
    };

    const res = await lookupProfile('  PS/AM/0123 ');

    expect(res).toEqual({
      ok: true, alreadySubmitted: false, pending: false, profile: PROFILE,
    });
    expect(rpcCall('self_service_lookup')?.args).toEqual({ psn: 'PS/AM/0123' });
  });

  it('reports an update already waiting for review', async () => {
    state.result = {
      data: { ok: true, already_submitted: false, pending: true, profile: PROFILE },
      error: null,
    };

    const res = await lookupProfile('PS/AM/0123');
    expect(res.ok && res.pending).toBe(true);
  });

  it('reports an already-approved officer', async () => {
    state.result = {
      data: { ok: true, already_submitted: true, pending: false, profile: PROFILE },
      error: null,
    };

    const res = await lookupProfile('PS/AM/0123');
    expect(res.ok && res.alreadySubmitted).toBe(true);
  });

  it('explains an unknown PSN', async () => {
    state.result = { data: { ok: false, error: 'not_found' }, error: null };
    const res = await lookupProfile('ZZ/NOPE/9999');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('not_found');
    expect(res.message).toMatch(/not in the register/i);
  });

  it('explains an unmigrated database instead of showing a raw error', async () => {
    state.result = {
      data: null,
      error: { message: "Could not find the function public.self_service_lookup(psn) in the schema cache" },
    };
    const res = await lookupProfile('PS/AM/0123');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('unavailable');
    expect(res.message).toMatch(/contact the Board Office/i);
  });
});

describe('self-service submit', () => {
  it('queues the changes by PSN — no employee id, no factor', async () => {
    state.result = { data: { ok: true, request_id: 'req-1' }, error: null };
    const changes = { name: 'Aisha Bello', phone: '08030000000' };

    const res = await submitUpdate(' PS/AM/0123 ', changes);

    expect(res).toEqual({ ok: true });
    const call = rpcCall('self_service_submit');
    expect(call?.args).toEqual({ psn: 'PS/AM/0123', changes });
    expect(Object.keys(call?.args ?? {})).not.toContain('employee_id');
  });

  it('maps each rejection to its own message', async () => {
    const cases: [string, RegExp][] = [
      ['not_found', /not in the register/i],
      ['already_submitted', /already been approved/i],
      ['pending_review', /waiting for review/i],
      ['name_required', /name cannot be empty/i],
      ['field_not_allowed', /cannot be updated/i],
      ['invalid_value', /not valid/i],
    ];
    for (const [error, expected] of cases) {
      state.result = { data: { ok: false, error }, error: null };
      const res = await submitUpdate('PS/AM/0123', { name: 'x' });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.message).toMatch(expected);
    }
  });

  it('falls back to a generic message for an unknown rejection', async () => {
    state.result = { data: { ok: false, error: 'something_new' }, error: null };
    const res = await submitUpdate('PS/AM/0123', { name: 'x' });
    expect(!res.ok && res.message).toMatch(/could not be saved/i);
  });
});

describe('admin review queue', () => {
  it('asks for the requested status and returns the queue', async () => {
    const requests = [{ id: 'req-1', psn: 'PS/AM/0123', employee_name: 'Aisha Bello' }];
    state.result = { data: { ok: true, requests }, error: null };

    const res = await listRequests('approved');

    expect(res).toEqual({ ok: true, requests });
    expect(rpcCall('self_service_requests')?.args).toEqual({ p_status: 'approved' });
  });

  it('defaults to pending and passes the server refusal through', async () => {
    state.result = { data: { ok: false, error: 'Only administrators can review self-service updates.' }, error: null };

    const res = await listRequests();

    expect(rpcCall('self_service_requests')?.args).toEqual({ p_status: 'pending' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/only administrators/i);
  });

  it('sends an approval with the trimmed note', async () => {
    state.result = { data: { ok: true, status: 'approved' }, error: null };

    const res = await decideRequest('req-1', 'approve', '  checked against file  ');

    expect(res).toEqual({ ok: true, status: 'approved' });
    expect(rpcCall('self_service_decide')?.args).toEqual({
      p_request: 'req-1', p_decision: 'approve', p_note: 'checked against file',
    });
  });

  it('sends null when there is no note, and reports a rejection', async () => {
    state.result = { data: { ok: true, status: 'rejected' }, error: null };

    const res = await decideRequest('req-2', 'reject', '   ');

    expect(res).toEqual({ ok: true, status: 'rejected' });
    expect(rpcCall('self_service_decide')?.args).toEqual({
      p_request: 'req-2', p_decision: 'reject', p_note: null,
    });
  });

  it('passes a server error message back to the reviewer', async () => {
    state.result = { data: { ok: false, error: 'That request has already been reviewed.' }, error: null };
    const res = await decideRequest('req-1', 'approve');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/already been reviewed/i);
  });
});
