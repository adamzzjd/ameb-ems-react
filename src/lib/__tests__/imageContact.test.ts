import { describe, it, expect } from 'vitest';
import { cdnImage, cdnSrcSet, isCloudinaryImage } from '../image';
import { telHref, mailtoHref, cleanAddress } from '../contact';

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/v1234/ameb/photo.jpg';
const PRESET = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/ameb/photo.jpg';

describe('cdnImage', () => {
  it('asks Cloudinary for the width it will be shown at', () => {
    const url = cdnImage(PHOTO, 600);
    expect(url).toContain('/image/upload/w_600,c_limit,f_auto,q_auto,dpr_auto/');
    expect(url).toContain('/v1234/ameb/photo.jpg');
  });

  it('replaces the f_auto,q_auto the CMS already stored rather than stacking it', () => {
    const url = cdnImage(PRESET, 400);
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,dpr_auto/v1234/ameb/photo.jpg');
    // No second transformation group left behind.
    expect(url.match(/\/image\/upload\//g)).toHaveLength(1);
  });

  it('honours an optional height', () => {
    expect(cdnImage(PHOTO, 400, { height: 225 })).toContain('w_400,c_limit,h_225');
  });

  it('leaves other hosts and data URIs untouched', () => {
    expect(cdnImage('https://example.com/a.jpg', 400)).toBe('https://example.com/a.jpg');
    expect(cdnImage('data:image/svg+xml;base64,AAAA', 400)).toBe('data:image/svg+xml;base64,AAAA');
    expect(cdnImage('', 400)).toBe('');
    expect(isCloudinaryImage('https://example.com/a.jpg')).toBe(false);
  });
});

describe('cdnSrcSet', () => {
  it('sorts widths and labels each candidate', () => {
    expect(cdnSrcSet(PHOTO, [800, 320, 480]))
      .toBe(`${cdnImage(PHOTO, 320)} 320w, ${cdnImage(PHOTO, 480)} 480w, ${cdnImage(PHOTO, 800)} 800w`);
  });

  it('returns nothing for a source it cannot resize', () => {
    expect(cdnSrcSet('https://example.com/a.jpg', [320, 480])).toBeUndefined();
  });
});

describe('telHref', () => {
  it('keeps the international prefix and drops the spacing', () => {
    expect(telHref('+234 803 577 8419')).toBe('tel:+2348035778419');
    expect(telHref('0803 577 8419')).toBe('tel:08035778419');
  });

  it('ignores anything with too few digits to dial', () => {
    expect(telHref('12345')).toBeNull();
    expect(telHref('')).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});

describe('mailtoHref', () => {
  it('accepts a real address and rejects a sentence', () => {
    expect(mailtoHref(' directoradsmeb@gmail.com ')).toBe('mailto:directoradsmeb@gmail.com');
    expect(mailtoHref('email us at the office')).toBeNull();
    expect(mailtoHref('a@b')).toBeNull();
    expect(mailtoHref(null)).toBeNull();
  });
});

describe('cleanAddress', () => {
  it('drops the empty comma segments the CMS stores', () => {
    expect(cleanAddress('Yola, Adamawa, , , NIGERIA')).toBe('Yola, Adamawa, NIGERIA');
    expect(cleanAddress('  PMB 2062 ,  Yola ')).toBe('PMB 2062, Yola');
    expect(cleanAddress(null)).toBe('');
  });
});
