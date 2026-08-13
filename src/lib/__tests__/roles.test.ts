import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_LABELS, normalizeRole, can, roleAtLeast } from '../roles';

describe('normalizeRole', () => {
  it('accepts every known role', () => {
    for (const role of ROLES) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  it('returns null for unknown values', () => {
    expect(normalizeRole('boss')).toBeNull();
    expect(normalizeRole('')).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(42)).toBeNull();
    expect(normalizeRole({ role: 'admin' })).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(normalizeRole('ADMIN')).toBeNull();
    expect(normalizeRole('Super_Admin')).toBeNull();
  });
});

describe('can', () => {
  it('denies everything to a null/undefined role', () => {
    expect(can(null, 'employees.view')).toBe(false);
    expect(can(undefined, 'employees.view')).toBe(false);
  });

  it('staff can only view', () => {
    expect(can('staff', 'employees.view')).toBe(true);
    expect(can('staff', 'employees.create')).toBe(false);
    expect(can('staff', 'employees.edit')).toBe(false);
    expect(can('staff', 'employees.delete')).toBe(false);
    expect(can('staff', 'employees.import')).toBe(false);
    expect(can('staff', 'employees.export')).toBe(false);
    expect(can('staff', 'settings.manage')).toBe(false);
    expect(can('staff', 'cms.edit')).toBe(false);
    expect(can('staff', 'users.manage')).toBe(false);
    expect(can('staff', 'audit.view')).toBe(false);
  });

  it('data collector can view/create/edit employees only', () => {
    expect(can('data_collector', 'employees.view')).toBe(true);
    expect(can('data_collector', 'employees.create')).toBe(true);
    expect(can('data_collector', 'employees.edit')).toBe(true);
    expect(can('data_collector', 'employees.delete')).toBe(false);
    expect(can('data_collector', 'employees.import')).toBe(false);
    expect(can('data_collector', 'employees.export')).toBe(false);
    expect(can('data_collector', 'settings.manage')).toBe(false);
    expect(can('data_collector', 'cms.edit')).toBe(false);
    expect(can('data_collector', 'users.manage')).toBe(false);
    expect(can('data_collector', 'audit.view')).toBe(false);
  });

  it('admin has full operational access but no user management', () => {
    expect(can('admin', 'employees.view')).toBe(true);
    expect(can('admin', 'employees.create')).toBe(true);
    expect(can('admin', 'employees.edit')).toBe(true);
    expect(can('admin', 'employees.delete')).toBe(true);
    expect(can('admin', 'employees.import')).toBe(true);
    expect(can('admin', 'employees.export')).toBe(true);
    expect(can('admin', 'settings.manage')).toBe(true);
    expect(can('admin', 'cms.edit')).toBe(true);
    expect(can('admin', 'users.manage')).toBe(false);
    expect(can('admin', 'audit.view')).toBe(false);
  });

  it('super_admin has everything', () => {
    for (const permission of [
      'employees.view',
      'employees.create',
      'employees.edit',
      'employees.delete',
      'employees.import',
      'employees.export',
      'settings.manage',
      'cms.edit',
      'users.manage',
      'audit.view',
    ] as const) {
      expect(can('super_admin', permission)).toBe(true);
    }
  });
});

describe('roleAtLeast', () => {
  it('compares the hierarchy', () => {
    expect(roleAtLeast('super_admin', 'admin')).toBe(true);
    expect(roleAtLeast('admin', 'admin')).toBe(true);
    expect(roleAtLeast('admin', 'staff')).toBe(true);
    expect(roleAtLeast('data_collector', 'admin')).toBe(false);
    expect(roleAtLeast('staff', 'data_collector')).toBe(false);
    expect(roleAtLeast(null, 'staff')).toBe(false);
    expect(roleAtLeast(undefined, 'staff')).toBe(false);
  });
});

describe('ROLE_LABELS', () => {
  it('labels every role', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
