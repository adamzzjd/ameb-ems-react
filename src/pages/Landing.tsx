import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { useCmsData } from '@/hooks/useCmsData';
import { supabase } from '@/supabase/client';
import type { CmsGallery } from '@/types';

interface LandingProps {
  onGoToLogin: () => void;
}

// ── Theme palettes (flat, government green) ─────────────────────────────────
// `colors` resolves from the visitor's theme choice via usePalette(), so every
// inline style below adapts to dark mode automatically.
type Palette = {
  green: string;
  greenDark: string;
  greenMid: string;
  tint: string;
  tintDark: string;
  ink: string;
  slate: string;
  slateLight: string;
  cream: string;
  white: string;
  border: string;
  red: string;
  accents: string[];
  onTint: string;     // text on tint backgrounds
  heroAccent: string; // light-green accent used on the green hero/footer
};

const LIGHT: Palette = {
  green: '#0f6e56',
  greenDark: '#0b5c47',
  greenMid: '#17856b',
  tint: '#e1f5ee',
  tintDark: '#c8e8dc',
  ink: '#27313b',
  slate: '#64748b',
  slateLight: '#93a19b',
  cream: '#f7faf8',
  white: '#ffffff',
  border: '#e2eae6',
  red: '#dc2626',
  accents: ['#0f6e56', '#17856b', '#2e9e7e', '#57c2a2', '#1c8067', '#0b5c47'],
  onTint: '#0b5c47',
  heroAccent: '#e1f5ee',
};

const DARK: Palette = {
  green: '#17856b',
  greenDark: '#0f6e56',
  greenMid: '#2e9e7e',
  tint: '#123028',
  tintDark: '#1e4638',
  ink: '#e6ece9',
  slate: '#9fb0a7',
  slateLight: '#6f837a',
  cream: '#0d1814',
  white: '#14201c',
  border: '#263832',
  red: '#f87171',
  accents: ['#17856b', '#2e9e7e', '#3fb894', '#57c2a2', '#27a584', '#0f6e56'],
  onTint: '#a7dccc',
  heroAccent: '#bfeadd',
};

const PaletteContext = createContext<Palette>(LIGHT);
function usePalette(): Palette {
  return useContext(PaletteContext);
}

// Visitor-facing dark mode is scoped to the Landing page (own localStorage key,
// no global class), so the Staff Portal keeps its light theme untouched.
const LANDING_THEME_KEY = 'ameb-landing-theme';
function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(LANDING_THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Programs', id: 'programs' },
  { label: 'News', id: 'news' },
  { label: 'Gallery', id: 'gallery' },
  { label: 'Contact', id: 'contact' },
];

const MARQUEE_ITEMS = [
  '21 LGAs Covered',
  '80+ Learning Centres',
  '20 Staff Cadres',
  '22 Posting Stations',
  'Literacy for All',
  'Vocational Training',
  'Continuing Education',
];

const STATS = [
  { num: 21, suffix: '', label: 'LGAs Covered' },
  { num: 80, suffix: '+', label: 'Learning Centres' },
  { num: 20, suffix: '', label: 'Staff Cadres' },
  { num: 22, suffix: '', label: 'Posting Stations' },
];

const HEADER_H = 76;
const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_H - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

const innerStyle: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 };
const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Motion helpers (subtle, flat) ───────────────────────────────────────────
const listContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const listItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

function FadeIn({ children, delay = 0, y = 24 }: { children: ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

function SectionTag({ children }: { children: ReactNode }) {
  const colors = usePalette();
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 16px', borderRadius: 100,
        background: colors.tint, border: `1px solid ${colors.tintDark}`,
        fontSize: 11, fontWeight: 700, color: colors.onTint,
        textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 18,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.green }} />
      {children}
    </div>
  );
}

function SectionHeading({ tag, title, sub, onDark = false }: { tag: string; title: string; sub?: string; onDark?: boolean }) {
  const colors = usePalette();
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <FadeIn>
        <SectionTag>{tag}</SectionTag>
      </FadeIn>
      <FadeIn delay={0.08}>
        <h2
          className="text-[28px] lg:text-[38px]"
          style={{ fontWeight: 800, color: onDark ? colors.white : colors.ink, lineHeight: 1.2, letterSpacing: '-0.6px' }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
      </FadeIn>
      {sub && (
        <FadeIn delay={0.14}>
          <p style={{ fontSize: 15, color: onDark ? 'rgba(255,255,255,0.75)' : colors.slate, lineHeight: 1.8, marginTop: 14, maxWidth: 640, marginInline: 'auto' }}>
            {sub}
          </p>
        </FadeIn>
      )}
    </div>
  );
}

// ── Animated number counter (subtle) ────────────────────────────────────────
function CountUp({ value, suffix = '', duration = 1.6 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setN(value);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

// ── Flat hover-lift card ────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      style={style}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

// ── Flat CTA button ─────────────────────────────────────────────────────────
function SheenButton({ children, onClick, gold = false }: { children: ReactNode; onClick?: () => void; gold?: boolean }) {
  const colors = usePalette();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        cursor: 'pointer',
        padding: '13px 30px', borderRadius: 8,
        fontSize: 14, fontWeight: 600, letterSpacing: '0.3px',
        display: 'inline-flex', alignItems: 'center', gap: 10,
        color: gold ? colors.white : colors.green,
        background: gold ? colors.green : colors.white,
        border: gold ? 'none' : `1px solid ${colors.green}`,
      }}
    >
      {children}
    </motion.button>
  );
}

// ── Flat key-facts strip ────────────────────────────────────────────────────
function Marquee() {
  const colors = usePalette();
  return (
    <div
      style={{
        background: colors.tint, borderTop: `1px solid ${colors.tintDark}`, borderBottom: `1px solid ${colors.tintDark}`,
        padding: '12px 24px', textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 26px', maxWidth: 1200, margin: '0 auto' }}>
        {MARQUEE_ITEMS.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.onTint }}>
            {t}
            {i < MARQUEE_ITEMS.length - 1 && <span style={{ color: colors.green, opacity: 0.4 }}>✦</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Gallery slideshow (auto-advancing, arrows, dots, captions) ─────────────
function GallerySlideshow({ items }: { items: CmsGallery[] }) {
  const colors = usePalette();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const go = useCallback((dir: 1 | -1) => {
    if (count <= 1) return;
    setIndex(i => (i + dir + count) % count);
  }, [count]);

  // Auto-advance every 5s (paused on hover, off for reduced-motion users)
  useEffect(() => {
    if (count <= 1 || reduced || paused) return;
    const t = setInterval(() => setIndex(i => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, reduced, paused]);

  // Keep index valid if the gallery shrinks
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;
  // Clamp at render time so a shrinking gallery can never render out of bounds
  const current = index >= count ? 0 : index;
  const item = items[current];
  // Show a caption only when the label is real text, not an emoji placeholder
  const caption = item.label && /[a-zA-Z0-9]{3,}/.test(item.label) ? item.label : '';

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ maxWidth: 920, margin: '0 auto' }}
    >
      <div
        style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${colors.border}`, background: colors.cream,
          aspectRatio: '16 / 9', maxHeight: 540,
        }}
      >
        <AnimatePresence>
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {item.image ? (
              <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div
                style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64,
                  background: colors.accents[current % colors.accents.length], color: '#fff',
                }}
              >
                {item.label || '📸'}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Counter chip */}
        <div
          style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 11px', borderRadius: 100,
            background: 'rgba(11,20,17,0.55)', color: '#fff',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          }}
        >
          {current + 1} / {count}
        </div>

        {/* Caption */}
        {caption && (
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '14px 20px',
              background: 'rgba(11,20,17,0.62)', color: '#fff',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.2px',
            }}
          >
            {caption}
          </div>
        )}

        {/* Arrows */}
        {count > 1 && (
          <>
            <motion.button
              onClick={() => go(-1)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Previous slide"
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(11,20,17,0.35)', color: '#fff',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ←
            </motion.button>
            <motion.button
              onClick={() => go(1)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Next slide"
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(11,20,17,0.35)', color: '#fff',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              →
            </motion.button>
          </>
        )}
      </div>

      {/* Dots */}
      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === current ? 26 : 9, height: 9, borderRadius: 100,
                border: 'none', cursor: 'pointer', padding: 0,
                background: i === current ? colors.green : colors.border,
                transition: 'width .25s, background .25s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Logo mark: real logo image when uploaded, 🏛 fallback otherwise ─────────
function LogoMark({ logoUrl, size = 40, dark = false }: { logoUrl?: string; size?: number; dark?: boolean }) {
  const colors = usePalette();
  if (logoUrl) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
          background: colors.white, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <img src={logoUrl} alt="AMEB logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0,
        background: dark ? colors.tint : colors.green,
        color: dark ? colors.onTint : colors.white,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.45,
        border: dark ? `1px solid ${colors.tintDark}` : `1px solid ${colors.greenDark}`,
      }}
    >
      🏛
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export function Landing({ onGoToLogin }: LandingProps) {
  const handleScroll = useCallback(scrollTo, []);
  const { site_content, programs, news, team, gallery, downloads, loading } = useCmsData();
  const [dark, setDark] = useState(getInitialDark);
  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      try { localStorage.setItem(LANDING_THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const colors = dark ? DARK : LIGHT;

  // Contact form state
  const [cfName, setCfName] = useState('');
  const [cfEmail, setCfEmail] = useState('');
  const [cfSubject, setCfSubject] = useState('');
  const [cfMessage, setCfMessage] = useState('');
  const [cfSending, setCfSending] = useState(false);
  const [cfSent, setCfSent] = useState(false);
  const [cfError, setCfError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfName.trim() || !cfEmail.trim() || !cfMessage.trim()) return;
    setCfSending(true);
    setCfError('');
    const { error } = await supabase.from('cms_contacts').insert({
      id: crypto.randomUUID(),
      name: cfName.trim(),
      email: cfEmail.trim(),
      subject: cfSubject.trim() || '(no subject)',
      message: cfMessage.trim(),
      read: false,
    });
    if (error) {
      setCfError('Failed to send. Please try again later.');
    } else {
      setCfSent(true);
      setCfName('');
      setCfEmail('');
      setCfSubject('');
      setCfMessage('');
    }
    setCfSending(false);
  };

  const sortedTeam = [...team].sort((a, b) => a.sort_order - b.sort_order);
  const sortedPrograms = [...programs].sort((a, b) => a.sort_order - b.sort_order);
  const sortedNews = [...news].sort((a, b) => a.sort_order - b.sort_order);
  const sortedGallery = [...gallery].sort((a, b) => a.sort_order - b.sort_order);
  const sortedDownloads = [...downloads].sort((a, b) => a.sort_order - b.sort_order);


  const inputStyle: React.CSSProperties = {
    padding: '12px 15px', border: `1px solid ${colors.border}`, borderRadius: 8,
    fontSize: 14, outline: 'none', width: '100%', background: colors.white,
    color: colors.ink, fontFamily: 'inherit', transition: 'border-color .2s',
  };

  return (
    <PaletteContext.Provider value={colors}>
    <div style={{ background: colors.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", color: colors.ink }}>
      {/* ═══════════ HEADER ═══════════ */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: colors.white, borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ ...innerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: HEADER_H, padding: '0 28px' }}>
          <motion.div
            onClick={() => handleScroll('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            whileHover={{ opacity: 0.85 }}
          >
            <LogoMark logoUrl={site_content.logo_url} size={40} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: colors.ink, letterSpacing: '-0.3px' }}>
                  Adamawa MEB
                </span>
                {loading && (
                  <span
                    className="animate-pulse"
                    style={{ width: 7, height: 7, borderRadius: '50%', background: colors.green, display: 'inline-block' }}
                  />
                )}
              </div>
              <div style={{ fontSize: 9, color: colors.slate, letterSpacing: 2.6, textTransform: 'uppercase', marginTop: -1 }}>
                Mass Education Board
              </div>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2 }}>
            {NAV_LINKS.map(item => (
              <motion.a
                key={item.id}
                onClick={() => handleScroll(item.id)}
                initial="rest"
                whileHover="hover"
                animate="rest"
                style={{
                  position: 'relative', padding: '8px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: colors.slate,
                  cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.2px', whiteSpace: 'nowrap',
                }}
                variants={{ rest: { color: colors.slate }, hover: { color: colors.green } }}
              >
                {item.label}
                <motion.span
                  style={{ position: 'absolute', left: 14, right: 14, bottom: 0, height: 2, borderRadius: 2, background: colors.green, transformOrigin: 'left' }}
                  variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </motion.a>
            ))}
            <motion.button
              onClick={toggleDark}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                marginLeft: 10, width: 38, height: 38, borderRadius: 8, fontSize: 16,
                border: `1px solid ${colors.border}`, cursor: 'pointer',
                color: colors.ink, background: colors.cream,
              }}
            >
              {dark ? '☀️' : '🌙'}
            </motion.button>
            <motion.button
              onClick={onGoToLogin}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                marginLeft: 10, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: colors.white, background: colors.green,
              }}
            >
              🔒 Staff Portal
            </motion.button>
          </nav>

          {/* Mobile Hamburger */}
          <motion.button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            whileTap={{ scale: 0.9 }}
            className="md:hidden flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 8, background: colors.cream,
              border: `1px solid ${colors.border}`, color: colors.ink, fontSize: 20, cursor: 'pointer',
            }}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="md:hidden fixed inset-0"
            style={{ zIndex: 95, background: colors.white, padding: '92px 28px 28px', overflowY: 'auto', color: colors.ink }}
          >
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="show"
            >
              {NAV_LINKS.map(item => (
                <motion.a
                  key={item.id}
                  onClick={() => { handleScroll(item.id); setMobileNavOpen(false); }}
                  variants={{
                    hidden: { opacity: 0, x: 30 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
                  }}
                  style={{
                    padding: '15px 16px', borderRadius: 8, fontSize: 16, fontWeight: 700,
                    color: colors.ink, cursor: 'pointer', textDecoration: 'none',
                    background: colors.cream, border: `1px solid ${colors.border}`,
                  }}
                  whileHover={{ x: 4, color: colors.green }}
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.button
                onClick={() => { onGoToLogin(); setMobileNavOpen(false); }}
                variants={{
                  hidden: { opacity: 0, x: 30 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
                }}
                style={{
                  marginTop: 16, padding: '15px', borderRadius: 8, fontSize: 15, fontWeight: 700,
                  border: 'none', cursor: 'pointer', color: colors.white, background: colors.green,
                }}
              >
                🔒 Staff Portal
              </motion.button>
              <motion.button
                onClick={toggleDark}
                variants={{
                  hidden: { opacity: 0, x: 30 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
                }}
                style={{
                  marginTop: 12, padding: '15px', borderRadius: 8, fontSize: 15, fontWeight: 700,
                  border: `1px solid ${colors.border}`, cursor: 'pointer',
                  color: colors.ink, background: colors.cream,
                }}
              >
                {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO ═══════════ */}
      <section
        id="home"
        style={{
          scrollMarginTop: 88, minHeight: '100vh',
          display: 'flex', alignItems: 'center', position: 'relative',
          padding: '120px 28px 90px', background: colors.green,
        }}
      >
        {site_content.hero_image && (
          <>
            <div
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url("${site_content.hero_image}")`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,92,71,0.88)' }} />
          </>
        )}
        <div style={{ ...innerStyle, width: '100%' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '7px 18px', borderRadius: 100,
                background: colors.tint, border: `1px solid ${colors.tintDark}`,
                fontSize: 11, fontWeight: 600, color: colors.onTint, marginBottom: 30, letterSpacing: '0.4px',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.green }} />
              {site_content.hero_badge}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-[34px] sm:text-[46px] lg:text-[58px]"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
              style={{ fontWeight: 800, color: colors.white, lineHeight: 1.1, marginBottom: 22, letterSpacing: '-1px' }}
            >
              {site_content.hero_title_1}{' '}
              <span style={{ color: colors.heroAccent, textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.5px' }}>
                {site_content.hero_title_2}
              </span>
              <span
                className="block text-base sm:text-lg lg:text-[20px]"
                style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)', letterSpacing: '0px', marginTop: 10 }}
              >
                {site_content.hero_title_sub}
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: easeOut }}
              style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.9, margin: '0 auto 38px', maxWidth: 600 }}
            >
              {site_content.hero_desc}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.44, ease: easeOut }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
            >
              <SheenButton gold onClick={() => handleScroll('programs')}>
                Explore Our Programs <span style={{ fontSize: 15 }}>→</span>
              </SheenButton>
              <SheenButton onClick={onGoToLogin}>🔒 Staff Portal</SheenButton>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 sm:flex"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.56, ease: easeOut }}
              style={{ gap: 0, margin: '56px auto 0', paddingTop: 34, borderTop: '1px solid rgba(255,255,255,0.2)', maxWidth: 660 }}
            >
              {STATS.map((stat, i) => (
                <div key={stat.label} className="text-center sm:text-left" style={{ flex: 1, padding: '12px 18px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                  <div className="text-[26px] sm:text-[32px]" style={{ fontWeight: 800, color: colors.white, lineHeight: 1 }}>
                    <CountUp value={stat.num} suffix={stat.suffix} />
                  </div>
                  <div style={{ fontSize: 10, color: colors.heroAccent, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 700 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ MARQUEE (key facts strip) ═══════════ */}
      <Marquee />

      {/* ═══════════ ABOUT ═══════════ */}
      <section id="about" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.white }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.about_tag} title={site_content.about_title} sub={site_content.about_sub} />

          {site_content.about_image && (
            <FadeIn>
              <div
                style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 36,
                  border: `1px solid ${colors.border}`, maxWidth: 900, marginInline: 'auto',
                }}
              >
                <img
                  src={site_content.about_image}
                  alt="About the Adamawa State Mass Education Board"
                  style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
                />
              </div>
            </FadeIn>
          )}

          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: 28, alignItems: 'stretch' }}
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-70px' }}
          >
            {/* Vision & Mission */}
            <motion.div variants={listItem}>
              <TiltCard
                style={{
                  background: colors.white, borderRadius: 12, padding: 36, height: '100%',
                  border: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colors.green }} />
                <div style={{ fontSize: 28, marginBottom: 16 }}>🎯</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.ink, marginBottom: 14 }}>Vision &amp; Mission</h3>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.85, marginBottom: 12 }}>
                    <strong style={{ color: colors.green }}>Vision:</strong> {site_content.vision_text}
                  </p>
                  <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.85, marginBottom: 12 }}>
                    <strong style={{ color: colors.green }}>Mission:</strong> {site_content.mission_text}
                  </p>
                </div>
                <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.85 }}>{site_content.about_body}</p>
              </TiltCard>
            </motion.div>

            {/* Leadership */}
            <motion.div variants={listItem}>
              <TiltCard
                style={{
                  background: colors.white, borderRadius: 12, padding: 36, height: '100%',
                  border: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colors.green }} />
                <div style={{ fontSize: 28, marginBottom: 16 }}>👥</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.ink, marginBottom: 18 }}>Board Leadership</h3>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: 10 }}
                  variants={listContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  {sortedTeam.map((leader, i) => (
                    <motion.div
                      key={leader.name}
                      variants={listItem}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8,
                        background: colors.cream, border: `1px solid ${colors.border}`,
                      }}
                      whileHover={{ borderColor: colors.green, background: colors.tint }}
                    >
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                          background: colors.accents[i % colors.accents.length], color: colors.white,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12,
                        }}
                      >
                        {leader.photo ? (
                          <img src={leader.photo} alt={leader.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          leader.initials
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink }}>{leader.name}</div>
                        <div style={{ fontSize: 11, color: colors.slate, marginTop: 2 }}>{leader.role}</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </TiltCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PROGRAMS ═══════════ */}
      <section id="programs" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.cream }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.programs_tag} title={site_content.programs_title} sub={site_content.programs_sub} />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 20 }}
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-70px' }}
          >
            {sortedPrograms.map((program, i) => (
              <motion.div key={program.title} variants={listItem}>
                <TiltCard
                  style={{
                    background: colors.white, borderRadius: 12, padding: '28px 24px', height: '100%',
                    border: `1px solid ${colors.border}`, position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: 8, fontSize: 24, marginBottom: 16,
                      background: colors.accents[i % colors.accents.length], color: colors.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {program.icon}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.ink, marginBottom: 10, letterSpacing: '-0.2px' }}>{program.title}</h3>
                  <p style={{ fontSize: 13, color: colors.slate, lineHeight: 1.8 }}>{program.description}</p>
                  <span
                    style={{
                      display: 'inline-block', marginTop: 16, fontSize: 11, fontWeight: 700, letterSpacing: 1.1,
                      textTransform: 'uppercase', color: colors.green,
                    }}
                  >
                    Learn more →
                  </span>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ NEWS ═══════════ */}
      <section id="news" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.white }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.news_tag} title={site_content.news_title} sub={site_content.news_sub} />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 20 }}
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-70px' }}
          >
            {sortedNews.map((article, i) => (
              <motion.div key={article.title} variants={listItem}>
                <TiltCard
                  style={{
                    background: colors.white, borderRadius: 12, overflow: 'hidden', height: '100%',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      height: 140, position: 'relative',
                      background: colors.accents[i % colors.accents.length], color: colors.white,
                    }}
                  >
                    {article.image ? (
                      <img src={article.image} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{article.icon}</div>
                    )}
                    <span
                      style={{
                        position: 'absolute', top: 12, left: 12, padding: '4px 11px', borderRadius: 100,
                        background: colors.white, color: colors.green, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {article.date}
                    </span>
                  </div>
                  <div style={{ padding: '20px 22px 24px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 8, lineHeight: 1.45 }}>{article.title}</h3>
                    <p style={{ fontSize: 13, color: colors.slate, lineHeight: 1.7 }}>{article.excerpt}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ GALLERY ═══════════ */}
      <section id="gallery" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.cream }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.gallery_tag} title={site_content.gallery_title} sub={site_content.gallery_sub} />

          <FadeIn>
            <GallerySlideshow items={sortedGallery} />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ DOWNLOADS ═══════════ */}
      <section id="downloads" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.white }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.downloads_tag} title={site_content.downloads_title} sub={site_content.downloads_sub} />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 12, maxWidth: 820, margin: '0 auto' }}
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-70px' }}
          >
            {sortedDownloads.map((dl, i) => (
              <motion.div key={dl.title} variants={listItem}>
                <motion.div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 10,
                    background: colors.cream, border: `1px solid ${colors.border}`, cursor: 'pointer',
                  }}
                  whileHover={{ borderColor: colors.green, background: colors.tint }}
                >
                  <div
                    style={{
                      fontSize: 20, flexShrink: 0, width: 42, height: 42, borderRadius: 8,
                      background: colors.accents[i % colors.accents.length], color: colors.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {dl.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>{dl.title}</div>
                    <div style={{ fontSize: 11, color: colors.slate, marginTop: 3 }}>{dl.meta}</div>
                  </div>
                  <span style={{ color: colors.green, fontWeight: 700 }}>↓</span>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ CONTACT ═══════════ */}
      <section id="contact" style={{ scrollMarginTop: 88, padding: '96px 24px', background: colors.greenDark }}>
        <div style={innerStyle}>
          <SectionHeading tag={site_content.contact_tag} title={site_content.contact_title} sub={site_content.contact_sub} onDark />

          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: 40, maxWidth: 980, margin: '0 auto' }}
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-70px' }}
          >
            {/* Contact Info */}
            <motion.div variants={listItem}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.white, marginBottom: 22 }}>Our Office</h3>
              {[
                { icon: '📍', label: 'Head Office', value: site_content.address },
                { icon: '📞', label: 'Phone', value: `${site_content.phone}\n${site_content.phone_2}` },
                { icon: '✉️', label: 'Email', value: `${site_content.email}\n${site_content.email_2}` },
                { icon: '🕐', label: 'Office Hours', value: `${site_content.hours}\n${site_content.hours_sat}` },
              ].map(contact => (
                <div key={contact.label} style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                      background: colors.tint, color: colors.onTint,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      border: `1px solid ${colors.tintDark}`,
                    }}
                  >
                    {contact.icon}
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75 }}>
                    <strong style={{ color: colors.white, display: 'block', marginBottom: 3, fontSize: 13 }}>{contact.label}</strong>
                    {contact.value.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Contact Form */}
            <motion.div
              variants={listItem}
              style={{ background: colors.white, borderRadius: 12, padding: 32, border: `1px solid ${colors.border}` }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 800, color: colors.ink, marginBottom: 4 }}>Send us a Message</h3>
              <p style={{ fontSize: 13, color: colors.slate, marginBottom: 22 }}>
                Fill out the form below and our team will respond promptly.
              </p>
              {cfSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: easeOut }}
                  style={{ textAlign: 'center', padding: '40px 0' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.ink, marginBottom: 5 }}>Message Sent!</h3>
                  <p style={{ fontSize: 13, color: colors.slate }}>Thank you for reaching out. We'll respond promptly.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <AnimatePresence>
                    {cfError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ padding: '11px 14px', background: 'rgba(220,38,38,0.06)', border: `1px solid rgba(220,38,38,0.25)`, color: colors.red, borderRadius: 8, fontSize: 13, overflow: 'hidden' }}
                      >
                        {cfError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input
                    placeholder="Your Full Name"
                    required
                    value={cfName}
                    onChange={e => setCfName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = colors.green; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; }}
                  />
                  <input
                    placeholder="Your Email Address"
                    type="email"
                    required
                    value={cfEmail}
                    onChange={e => setCfEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = colors.green; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; }}
                  />
                  <input
                    placeholder="Subject"
                    value={cfSubject}
                    onChange={e => setCfSubject(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = colors.green; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; }}
                  />
                  <textarea
                    placeholder="Your Message…"
                    required
                    rows={4}
                    value={cfMessage}
                    onChange={e => setCfMessage(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 100, fontFamily: 'inherit' }}
                    onFocus={e => { e.target.style.borderColor = colors.green; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; }}
                  />
                  <motion.button
                    type="submit"
                    disabled={cfSending}
                    whileHover={cfSending ? {} : { y: -2 }}
                    whileTap={cfSending ? {} : { scale: 0.98 }}
                    style={{
                      padding: '13px 28px', borderRadius: 8, border: 'none', cursor: cfSending ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: 700, letterSpacing: '0.3px', width: 'fit-content',
                      color: colors.white, background: colors.green, opacity: cfSending ? 0.7 : 1,
                    }}
                  >
                    {cfSending ? 'Sending…' : 'Send Message →'}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ background: colors.greenDark, padding: '60px 28px 26px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: colors.tint }} />
        <div style={innerStyle}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 40, marginBottom: 36 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <LogoMark logoUrl={site_content.logo_url} size={38} dark />
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.white, letterSpacing: '-0.2px' }}>
                  Adamawa State<br />Mass Education Board
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: 'rgba(255,255,255,0.65)', maxWidth: 300 }}>
                Providing quality mass education services to all citizens across 21 LGAs of Adamawa State. Established under the Adamawa State Ministry of Education.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 700, color: colors.heroAccent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                Quick Links
              </h4>
              {['Home', 'About Us', 'Programs', 'News', 'Contact'].map(link => (
                <motion.a
                  key={link}
                  onClick={() => handleScroll(link.toLowerCase().replace(' ', ''))}
                  style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '5px 0', cursor: 'pointer', textDecoration: 'none' }}
                  whileHover={{ x: 4, color: colors.heroAccent }}
                >
                  {link}
                </motion.a>
              ))}
            </div>

            {/* Resources */}
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 700, color: colors.heroAccent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                Resources
              </h4>
              {['Gallery', 'Downloads', 'Privacy Policy', 'Terms of Service', 'Sitemap'].map(link => (
                <motion.a
                  key={link}
                  onClick={() => handleScroll(link.toLowerCase())}
                  style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '5px 0', cursor: 'pointer', textDecoration: 'none' }}
                  whileHover={{ x: 4, color: colors.heroAccent }}
                >
                  {link}
                </motion.a>
              ))}
            </div>

            {/* Staff Access */}
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 700, color: colors.heroAccent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                Staff Access
              </h4>
              <motion.button
                onClick={onGoToLogin}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px',
                  background: colors.tint, color: colors.onTint,
                  borderRadius: 8, fontSize: 13, fontWeight: 700, border: `1px solid ${colors.tintDark}`, cursor: 'pointer',
                }}
              >
                🔒 Staff Portal
              </motion.button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 12, lineHeight: 1.7 }}>
                Authorized personnel only.<br />Employee Management System.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}
          >
            <span>© 2026 Adamawa State Mass Education Board. All rights reserved.</span>
            <span>Powered by EMIS — Education Management Information System</span>
          </motion.div>
        </div>
      </footer>
    </div>
    </PaletteContext.Provider>
  );
}
