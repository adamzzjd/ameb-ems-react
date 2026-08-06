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

// How often CMS data re-fetches while the tab is visible.
// (Previously 30s on every visit — that alone can burn through the free
// tier's 5 GB egress. Now 60s + visibility + freshness guards.)
const POLL_INTERVAL_MS = 60_000;

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
    {
      id: 'p1', title: 'Adult Literacy', icon: '📖', sort_order: 0,
      description: 'Basic literacy and numeracy programs for adults who missed formal education. Classes held at learning centres across all LGAs.',
      details: 'The Adult Literacy programme is the flagship intervention of the Adamawa State Mass Education Board. It targets adults and out-of-school youths who missed the opportunity to acquire basic reading, writing, and arithmetic skills during their school-age years.\n\nParticipants are enrolled at designated learning centres across all 21 Local Government Areas, where trained facilitators deliver the National Commission for Mass Literacy, Adult and Non-Formal Education (NMEC) curriculum.\n\nThe programme runs in three progressive levels:\n- Basic Level 1 — letter recognition, reading readiness, and introduction to writing\n- Basic Level 2 — fluent reading, functional writing, and everyday arithmetic\n- Post-Literacy — consolidation, income-generating skills, and transition pathways\n\nSuccessful learners are awarded certificates recognised by the Adamawa State Government, and are encouraged to progress to continuing education classes for basic and secondary certification.',
    },
    {
      id: 'p2', title: 'Vocational Training', icon: '🔧', sort_order: 1,
      description: 'Skills acquisition in tailoring, carpentry, electronics, agriculture, and other trades for self-reliance and economic empowerment.',
      details: 'The Vocational Training programme equips learners with practical, marketable skills that lead to self-reliance and income generation. Trainees work in fully equipped workshops under the guidance of master craftspersons and experienced instructors.\n\nAvailable trade areas include:\n- Tailoring & Fashion Design\n- Carpentry & Joinery\n- Electrical Installation & Electronics\n- Welding & Metal Fabrication\n- Hairdressing & Beauty Care\n- Modern Agriculture & Animal Husbandry\n- Catering & Food Processing\n- Computer & ICT Skills\n\nProgramme duration ranges from six months to two years depending on the trade. On completion, learners sit for a trade test and are issued government-endorsed certificates that support employment, apprenticeship, and enterprise start-up.',
    },
    {
      id: 'p3', title: 'Home Economics', icon: '🏠', sort_order: 2,
      description: 'Training in home management, nutrition, childcare, and family health for improved household wellbeing and community development.',
      details: 'The Home Economics programme strengthens families and communities through practical training in the management of the home and family resources. It is designed for adults and young people — especially women — who wish to improve household wellbeing and develop income-generating skills.\n\nCore modules include:\n- Food & Nutrition and balanced family meals\n- Childcare and early childhood development\n- Home management, budgeting, and savings\n- Family health, hygiene, and first aid\n- Sewing, knitting, and home textile crafts\n- Small-scale food processing and preservation\n\nGraduates leave with skills that improve family nutrition and health, reduce household waste, and open pathways to small enterprise. Learning centres run flexible daytime and weekend classes to accommodate mothers and working learners.',
    },
    {
      id: 'p4', title: 'Nomadic Education', icon: '🏕', sort_order: 3,
      description: 'Specialized education for nomadic communities with flexible schedules, mobile learning centres, and culturally adapted curricula.',      details: 'The Nomadic Education programme brings learning to the doorstep of pastoralist and migrant communities whose way of life makes regular school attendance difficult. It is delivered through mobile learning centres that move with the community and flexible schedules aligned to seasonal migration patterns.\n\nKey features of the programme:\n- Mobile classrooms and itinerant facilitators\n- Culturally adapted curriculum and learning materials\n- Herdsmen and women literacy classes in local languages\n- Basic numeracy, health education, and animal husbandry enrichment\n- Child-friendly hours that respect grazing and market schedules\n\nThe Board works with community leaders and settlement heads to establish learning camps and sensitise families on the value of education. The programme has successfully increased enrolment and retention among nomadic populations across the state.',
    },
    {
      id: 'p5', title: 'Continuing Education', icon: '📚', sort_order: 4,
      description: 'Opportunities for adults to complete basic and secondary education through evening classes, weekend programs, and distance learning.',      details: 'Continuing Education provides a second chance for adults who wish to complete their basic and post-basic education. The programme bridges the gap between literacy classes and formal certification by preparing learners for the Basic Education Certificate Examination (BECE) and the Senior Secondary Certificate Examination (SSCE/NECO).\n\nStudy options include:\n- Evening classes at designated centres\n- Weekend and holiday intensive classes\n- Distance learning and study groups\n- Remedial coaching in core subjects (English, Mathematics, Sciences)\n\nCandidates are registered for public examinations by the Board, and successful learners can proceed to tertiary institutions, teacher training, or the workforce with recognised qualifications. Classes are affordable, with fee waivers available for indigent learners.',
    },
    {
      id: 'p6', title: 'NGO Partnerships', icon: '🤝', sort_order: 5,
      description: 'Collaborative programs with UNICEF, Save the Children, and other development partners to expand educational access across the state.',      details: 'Through strategic partnerships with development organisations such as UNICEF, Save the Children, and other national and international agencies, the Board expands the reach and quality of mass education across Adamawa State.\n\nAreas of collaboration include:\n- Construction and furnishing of learning centres\n- Provision of learning materials, furniture, and solar lighting\n- Training and remuneration of volunteer facilitators\n- Support for vulnerable groups — girls, orphans, persons with disabilities, and conflict-affected communities\n- Monitoring, evaluation, and research on learning outcomes\n\nPartnership projects are implemented with transparent reporting and are aligned to the state education sector plan. The Board welcomes new partnerships with credible organisations and maintains a partner register for coordination.',
    },
  ],
  news: [
    {
      id: 'n1', title: 'Board Announces New Learning Centres', date: 'March 15, 2026', icon: '📰', sort_order: 0,
      excerpt: 'Five new adult literacy centres to be established in underserved communities across three LGAs.',
      body: 'The Adamawa State Mass Education Board has approved the establishment of five new adult literacy centres to be located in underserved communities across three Local Government Areas.\n\nThe new centres will bring functional literacy and numeracy classes closer to rural populations, reducing the distance learners currently travel to access classes. Each centre will be equipped with learning materials, furniture, and trained facilitators.\n\nBenefiting communities were selected through a needs assessment conducted by the Board\'s Planning and Statistics Department, which considered population density, existing infrastructure, and enrolment demand.\n\n- Construction and furnishing to begin in the current quarter\n- Facilitators to be recruited and trained before commencement\n- Community sensitisation campaigns to precede formal enrolment\n\nThe Executive Secretary expressed confidence that the expansion will significantly improve access to mass education in the state, in line with the Board\'s mandate to serve all 21 LGAs.',
    },
    {
      id: 'n2', title: 'Staff Verification Exercise', date: 'February 28, 2026', icon: '📋', sort_order: 1,
      excerpt: 'All staff required to complete biometric verification at designated centres by April 15, 2026.',
      body: 'The Adamawa State Mass Education Board wishes to inform all staff that the annual biometric verification exercise will commence shortly.\n\nAll permanent and pensionable officers are required to present themselves at designated verification centres with the following documents:\n- Staff identification card\n- Letter of first appointment\n- Last promotion letter\n- Two passport photographs\n\nVerification centres will operate from 9:00 AM to 4:00 PM on weekdays. Staff on transfer or secondment should verify at the centre nearest to their present station.\n\nThe exercise is mandatory and will be used to update the personnel register. Officers who fail to complete verification by April 15, 2026 may have their salary processing paused until compliance is confirmed.\n\nFor further enquiries, contact the Establishment Section at the Board headquarters or your zonal office.',
    },
    {
      id: 'n3', title: 'Vocational Training Graduation', date: 'January 10, 2026', icon: '🎓', sort_order: 2,
      excerpt: 'Over 200 graduands received certificates in various vocational trades at the annual graduation ceremony.',
      body: 'Over two hundred graduands received certificates in various vocational trades at the Board\'s annual graduation ceremony held in Yola.\n\nThe graduands completed training in tailoring and fashion design, carpentry, electrical installation, catering, and modern agriculture, among other trades.\n\nSpeaking at the ceremony, the Executive Secretary commended the graduands for their dedication and encouraged them to apply their new skills towards self-employment and community development.\n\n- Graduands were assessed through practical trade tests\n- Certificates are endorsed by the Adamawa State Government\n- Graduates are now eligible for the Board\'s enterprise support scheme\n\nThe ceremony was attended by government officials, development partners, and representatives of the beneficiary communities.',
    },
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
  const lastFetchRef = useRef(0);

  const load = useCallback(async () => {
    lastFetchRef.current = Date.now();
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

    // Auto-refresh so CMS changes propagate without a page reload — but only
    // while the tab is visible (no background bandwidth), and only once the
    // previous fetch has aged past the poll interval (no back-to-back fetches
    // when the tab regains focus). Cuts egress dramatically on public visits.
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current < POLL_INTERVAL_MS) return;
      if (refreshRef.current) return;
      refreshRef.current = true;
      load();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [load]);

  return { ...data, loading };
}
