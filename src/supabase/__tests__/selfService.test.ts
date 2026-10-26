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

import { verifyIdentity, submitUpdate, lockedMessage } from '../selfService';

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

describe('self-service verify', () => {
  it('returns the token and profile on a successful check', async () => {
    state.result = {
      data: { ok: true, token: 'tok-1', already_submitted: false, profile: PROFILE },
      error: null,
    };

    const res = await verifyIdentity('  PS/AM/0123 ', ' 17051990 ');

    expect(res).toEqual({ ok: true, token: 'tok-1', alreadySubmitted: false, profile: PROFILE });
    // Whitespace is trimmed before it leaves the browser.
    expect(rpcCall('self_service_verify')?.args).toEqual({ psn: 'PS/AM/0123', factor: '17051990' });
  });

  it('flags an officer who has already used their one-time update', async () => {
    state.result = {
      data: { ok: true, token: 'tok-2', already_submitted: true, profile: PROFILE },
      error: null,
    };

    const res = await verifyIdentity('PS/AM/0123', '4567');
    expect(res.ok && res.alreadySubmitted).toBe(true);
  });

  it('gives the same answer for an unknown PSN and a wrong factor', async () => {
    state.result = { data: { ok: false, error: 'verify_failed' }, error: null };
    const unknownPsn = await verifyIdentity('ZZ/NOPE/9999', '17051990');
    const wrongFactor = await verifyIdentity('PS/AM/0123', '01011999');

    expect(unknownPsn.ok).toBe(false);
    expect(wrongFactor.ok).toBe(false);
    // Indistinguishable on purpose: the endpoint must not reveal which staff
    // numbers exist.
    expect(unknownPsn).toEqual(wrongFactor);
    expect(!unknownPsn.ok && unknownPsn.kind).toBe('mismatch');
  });

  it('reports a lockout with the remaining minutes from the server', async () => {
    state.result = { data: { ok: false, error: 'locked', retry_after_seconds: 900 }, error: null };
    const res = await verifyIdentity('PS/AM/0123', '0000');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('locked');
    expect(res.message).toContain('15 minutes');
  });

  it('explains an unmigrated database instead of showing a raw error', async () => {
    state.result = {
      data: null,
      error: { message: "Could not find the function public.self_service_verify(psn, factor) in the schema cache" },
    };
    const res = await verifyIdentity('PS/AM/0123', '17051990');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('unavailable');
    expect(res.message).toMatch(/contact the Board Office/i);
  });

  it('never sends an employee id or a bare PSN to the write endpoint', async () => {
    state.result = { data: { ok: true }, error: null };
    await submitUpdate('tok-1', { name: 'Aisha Bello', phone: '08030000000' });

    const call = rpcCall('self_service_submit');
    expect(call?.args).toEqual({ p_token: 'tok-1', changes: { name: 'Aisha Bello', phone: '08030000000' } });
    expect(Object.keys(call?.args ?? {})).not.toContain('employee_id');
  });

  it('maps each rejection to its own message', async () => {
    const cases: [string, RegExp][] = [
      ['session_expired', /expired/i],
      ['already_submitted', /already been submitted/i],
      ['name_required', /name cannot be empty/i],
      ['field_not_allowed', /cannot be updated/i],
      ['invalid_value', /not valid/i],
    ];
    for (const [error, expected] of cases) {
      state.result = { data: { ok: false, error }, error: null };
      const res = await submitUpdate('tok-1', { name: 'x' });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.message).toMatch(expected);
    }
  });

  it('falls back to a generic message for an unknown rejection', async () => {
    state.result = { data: { ok: false, error: 'something_new' }, error: null };
    const res = await submitUpdate('tok-1', { name: 'x' });
    expect(!res.ok && res.message).toMatch(/could not be saved/i);
  });

  it('rounds the lockout up to whole minutes', () => {
    expect(lockedMessage(1)).toContain('1 minute.');
    expect(lockedMessage(61)).toContain('2 minutes');
    expect(lockedMessage(undefined)).toContain('15 minutes');
  });
});
