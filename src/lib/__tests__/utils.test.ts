import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('combines class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('merges tailwind classes (later overrides)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('merges conflicting tailwind utilities (later wins)', () => {
    expect(cn(
      'px-4 py-2',
      'px-6'
    )).toBe('py-2 px-6');
  });
});
