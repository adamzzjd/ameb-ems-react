import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const load = vi.fn();

vi.mock('../../supabase/employees', () => ({
  dbLoadAll: (...args: unknown[]) => load(...args),
  dbSave: vi.fn(),
  dbDelete: vi.fn(),
  dbBulkInsert: vi.fn(),
}));

import { useEmployees } from '../useEmployees';

beforeEach(() => {
  load.mockReset();
  load.mockResolvedValue({ data: [{ id: 'e-1', name: 'Aisha Bello' }], error: null });
});

describe('useEmployees', () => {
  it('never fetches the register when disabled (the public website)', () => {
    const { result } = renderHook(() => useEmployees(false));

    expect(load).not.toHaveBeenCalled();
    // Nothing is stuck on a spinner that would never resolve.
    expect(result.current.loading).toBe(false);
    expect(result.current.employees).toEqual([]);
  });

  it('loads the register once it is enabled (a signed-in member of staff)', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useEmployees(enabled), {
      initialProps: { enabled: false },
    });

    expect(load).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.employees).toHaveLength(1));
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a failed load instead of spinning forever', async () => {
    load.mockResolvedValue({ data: null, error: new Error('permission denied') });

    const { result } = renderHook(() => useEmployees(true));

    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.loading).toBe(false);
  });
});
