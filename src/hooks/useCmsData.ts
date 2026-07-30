import { useState, useEffect, useCallback, useRef } from 'react';
import {
  dbLoadSiteContent,
  dbLoadPrograms,
  dbLoadNews,
  dbLoadTeam,
  dbLoadGallery,
  dbLoadDownloads,
} from '@/supabase/cms';
import type { SiteContent, CmsProgram, CmsNews, CmsTeam, CmsGallery, CmsDownload } from '@/types';

interface CmsData {
  site_content: SiteContent;
  programs: CmsProgram[];
  news: CmsNews[];
  team: CmsTeam[];
  gallery: CmsGallery[];
  downloads: CmsDownload[];
}

const CACHE_KEY = 'ameb_cms_cache';

const defaultContent: SiteContent = {
  hero_badge: 'Adamawa State Government — Ministry of Education',
  hero_title_1: 'Mass Education',
  hero_title_2: 'for All',
  hero_title_sub: 'Adamawa State Mass Education Board',
  hero_desc: 'Dedicated to providing quality literacy, vocational, and continuing education to every citizen across all 21 Local Government Areas of Adamawa State.',
  about_tag: 'About the Board',
  about_title: 'Our Mandate & Leadership',
  about_sub: 'A parastatal under the Adamawa State Ministry of Education, delivering mass education services since inception.',
  vision_text: 'A fully literate and skilled Adamawa State where every citizen has access to quality mass education.',
  mission_text: 'To provide accessible, equitable, and functional mass education services that transform lives and communities.',
  about_body: 'We coordinate and deliver adult literacy, vocational training, home economics, nomadic education, and continuing education programmes across all 21 LGAs.',
  address: 'Adamawa State Mass Education Board, Jimeta-Yola, Adamawa State, Nigeria',
  phone: '+234 803 220 0011',
  phone_2: '+234 803 320 0122',
  email: 'info@ameb.adamawa.gov.ng',
  email_2: 'support@ameb.adamawa.gov.ng',
  hours: 'Monday — Friday: 8:00 AM — 4:00 PM',
  hours_sat: 'Saturday: 9:00 AM — 1:00 PM',
  programs_tag: 'What We Offer',
  programs_title: 'Our Programs',
  programs_sub: 'Comprehensive mass education programs designed for all citizens of Adamawa State',
  news_tag: 'Latest Updates',
  news_title: 'News & Announcements',
  news_sub: 'Latest updates, circulars, and announcements from the Board',
  gallery_tag: 'Moments',
  gallery_title: 'Photo Gallery',
  gallery_sub: 'Moments from our programs, events, and learning centres across Adamawa State',
  downloads_tag: 'Resources',
  downloads_title: 'Downloads & Resources',
  downloads_sub: 'Important documents, forms, and publications for staff and the public',
  contact_tag: 'Get in Touch',
  contact_title: 'Contact Us',
  contact_sub: 'Reach out to the Adamawa State Mass Education Board — we are here to serve',
};

const defaultData: CmsData = {
  site_content: defaultContent,
  programs: [
    { id: 'p1', title: 'Adult Literacy', icon: '📖', description: 'Basic literacy and numeracy programs for adults who missed formal education. Classes held at learning centres across all LGAs.', sort_order: 0 },
    { id: 'p2', title: 'Vocational Training', icon: '🔧', description: 'Skills acquisition in tailoring, carpentry, electronics, agriculture, and other trades for self-reliance and economic empowerment.', sort_order: 1 },
    { id: 'p3', title: 'Home Economics', icon: '🏠', description: 'Training in home management, nutrition, childcare, and family health for improved household wellbeing and community development.', sort_order: 2 },
    { id: 'p4', title: 'Nomadic Education', icon: '🏕', description: 'Specialized education for nomadic communities with flexible schedules, mobile learning centres, and culturally adapted curricula.', sort_order: 3 },
    { id: 'p5', title: 'Continuing Education', icon: '📚', description: 'Opportunities for adults to complete basic and secondary education through evening classes, weekend programs, and distance learning.', sort_order: 4 },
    { id: 'p6', title: 'NGO Partnerships', icon: '🤝', description: 'Collaborative programs with UNICEF, Save the Children, and other development partners to expand educational access across the state.', sort_order: 5 },
  ],
  news: [
    { id: 'n1', title: 'Board Announces New Learning Centres', excerpt: 'Five new adult literacy centres to be established in underserved communities across three LGAs.', date: 'March 15, 2026', icon: '📰', sort_order: 0 },
    { id: 'n2', title: 'Staff Verification Exercise', excerpt: 'All staff required to complete biometric verification at designated centres by April 15, 2026.', date: 'February 28, 2026', icon: '📋', sort_order: 1 },
    { id: 'n3', title: 'Vocational Training Graduation', excerpt: 'Over 200 graduands received certificates in various vocational trades at the annual graduation ceremony.', date: 'January 10, 2026', icon: '🎓', sort_order: 2 },
  ],
  team: [
    { id: 't1', name: 'Bulus A. Dauda', initials: 'BD', role: 'Executive Secretary', sort_order: 0 },
    { id: 't2', name: 'Hajara M. Bello', initials: 'HB', role: 'Director, Literacy Education', sort_order: 1 },
    { id: 't3', name: 'Yusuf I. Musa', initials: 'YM', role: 'Director, Planning & Statistics', sort_order: 2 },
    { id: 't4', name: 'Grace A. Adamu', initials: 'GA', role: 'Director, Home Economics', sort_order: 3 },
    { id: 't5', name: 'Ibrahim U. Garba', initials: 'IG', role: 'Director, Finance', sort_order: 4 },
  ],
  gallery: [
    { id: 'g1', label: '📸', sort_order: 0, wide: true },
    { id: 'g2', label: '📸', sort_order: 1 },
    { id: 'g3', label: '📸', sort_order: 2, tall: true },
    { id: 'g4', label: '📸', sort_order: 3 },
    { id: 'g5', label: '📸', sort_order: 4 },
    { id: 'g6', label: '📸', sort_order: 5 },
  ],
  downloads: [
    { id: 'd1', title: 'Staff Registration Form', meta: 'PDF · 245KB · Updated 2026', icon: '📄', sort_order: 0 },
    { id: 'd2', title: 'Annual Report 2025', meta: 'PDF · 1.2MB · Published Jan 2026', icon: '📄', sort_order: 1 },
    { id: 'd3', title: 'Learning Centre Guidelines', meta: 'PDF · 480KB · Revised 2025', icon: '📄', sort_order: 2 },
    { id: 'd4', title: 'Procurement Policy', meta: 'PDF · 320KB · Effective 2025', icon: '📄', sort_order: 3 },
  ],
};

// ── Cache helpers ──────────────────────────────────────────────────────────────
function loadCache(): CmsData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: CmsData; ts: number };
    if (!parsed.data || !parsed.ts) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCache(data: CmsData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/** Call this from CMS pages after saving to instantly refresh Landing page data */
export function clearCmsCache() {
  localStorage.removeItem(CACHE_KEY);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useCmsData() {
  // Start with cache (if any) so returning visitors see data instantly
  const [data, setData] = useState<CmsData>(() => loadCache() || defaultData);
  const [loading, setLoading] = useState(!loadCache()); // loading only if no cache
  const refreshRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [sc, prog, n, t, g, dl] = await Promise.all([
        dbLoadSiteContent(),
        dbLoadPrograms(),
        dbLoadNews(),
        dbLoadTeam(),
        dbLoadGallery(),
        dbLoadDownloads(),
      ]);

      const fresh: CmsData = {
        site_content: sc.data || defaultContent,
        programs: prog.data || defaultData.programs,
        news: n.data || defaultData.news,
        team: t.data || defaultData.team,
        gallery: g.data || defaultData.gallery,
        downloads: dl.data || defaultData.downloads,
      };

      saveCache(fresh);
      setData(fresh);
    } catch {
      // keep whatever we already have (cache or defaults)
    }
    setLoading(false);
    refreshRef.current = false;
  }, []);

  useEffect(() => {
    // First load — always fetch fresh from DB (cache already used for initial render)
    load();

    // Auto-refresh every 30 seconds so CMS changes propagate without page reload
    const interval = setInterval(() => {
      if (!refreshRef.current) {
        refreshRef.current = true;
        load();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [load]);

  return { ...data, loading };
}
