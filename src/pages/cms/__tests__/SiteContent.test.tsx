import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SiteContent as SiteContentType } from '@/types';

const { dbLoadSiteContent, dbSaveSiteContent } = vi.hoisted(() => ({
  dbLoadSiteContent: vi.fn(),
  dbSaveSiteContent: vi.fn(),
}));

vi.mock('@/supabase/cms', () => ({ dbLoadSiteContent, dbSaveSiteContent }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { SiteContent } from '../SiteContent';

const fullContent: SiteContentType = {
  hero_badge: 'Welcome',
  hero_title_1: 'Adult Education',
  hero_title_2: 'for All',
  hero_title_sub: '',
  hero_desc: '',
  about_tag: 'About',
  about_title: '',
  about_sub: '',
  vision_text: '',
  mission_text: '',
  about_body: '',
  address: '',
  phone: '',
  phone_2: '',
  email: '',
  email_2: '',
  hours: '',
  hours_sat: '',
  programs_tag: '',
  programs_title: '',
  programs_sub: '',
  news_tag: '',
  news_title: '',
  news_sub: '',
  gallery_tag: '',
  gallery_title: '',
  gallery_sub: '',
  downloads_tag: '',
  downloads_title: '',
  downloads_sub: '',
  contact_tag: '',
  contact_title: '',
  contact_sub: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  dbLoadSiteContent.mockResolvedValue({ data: { ...fullContent }, error: null });
  dbSaveSiteContent.mockResolvedValue({ data: null, error: null });
});

describe('SiteContent editor', () => {
  it('keeps input focus while typing (no remount per keystroke)', async () => {
    const user = userEvent.setup();
    render(<SiteContent onNavigate={vi.fn()} />);

    // Wait for the content to load and the first field (Badge Text) to appear.
    const badgeInput = (await screen.findAllByRole('textbox'))[0];
    badgeInput.focus();

    // Type a whole phrase — if the input were remounted on every keystroke
    // (the "Field defined inside render" bug), focus would be lost after the
    // first character and only 'H' would land. The field loads with the
    // existing value ("Welcome"), so typing appends to it.
    await user.type(badgeInput, 'Hello World');

    expect(badgeInput).toHaveFocus();
    expect(badgeInput).toHaveValue('WelcomeHello World');
  });

  it('keeps typing in textareas too', async () => {
    const user = userEvent.setup();
    render(<SiteContent onNavigate={vi.fn()} />);

    // hero_desc is the first textarea (4th textbox overall).
    const desc = (await screen.findAllByRole('textbox'))[3];
    desc.focus();
    await user.type(desc, 'A multi-word description');

    expect(desc).toHaveFocus();
    expect(desc).toHaveValue('A multi-word description');
  });
});
