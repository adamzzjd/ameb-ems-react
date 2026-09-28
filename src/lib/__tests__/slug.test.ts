import { describe, it, expect } from 'vitest';
import { slugify, findBySlug, paths } from '../slug';

describe('slugify', () => {
  it('lowercases and hyphenates arbitrary titles', () => {
    expect(slugify('Adult Literacy & Numeracy')).toBe('adult-literacy-numeracy');
    expect(slugify('Vocational Skills Training')).toBe('vocational-skills-training');
  });

  it('trims leading/trailing hyphens and collapses separators', () => {
    expect(slugify('  Hello -- World!  ')).toBe('hello-world');
    expect(slugify('---')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('strips accents', () => {
    expect(slugify('Café Français')).toBe('cafe-francais');
  });

  it('caps the length at 80 characters', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('findBySlug', () => {
  const items = [
    { id: '1', title: 'Adult Literacy' },
    { id: '2', title: 'Vocational Skills' },
  ];

  it('matches by derived slug', () => {
    expect(findBySlug(items, 'adult-literacy', i => i.title)?.id).toBe('1');
    expect(findBySlug(items, 'vocational-skills', i => i.title)?.id).toBe('2');
  });

  it('falls back to the raw id so old links keep working', () => {
    expect(findBySlug(items, '2', i => i.title)?.id).toBe('2');
  });

  it('returns undefined for unknown slugs', () => {
    expect(findBySlug(items, 'nope', i => i.title)).toBeUndefined();
  });
});

describe('paths', () => {
  it('builds detail URLs from slugs', () => {
    expect(paths.program('adult-literacy')).toBe('/programs/adult-literacy');
    expect(paths.newsArticle('board-meeting')).toBe('/news/board-meeting');
    expect(paths.portal()).toBe('/portal/dashboard');
  });
});
