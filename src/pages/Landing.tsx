/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { useCmsData } from '@/hooks/useCmsData';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/supabase/client';
import type { CmsNews, CmsProgram } from '@/types';
import {
  GraduationCap, BookOpen, Users, Star, Heart, Wrench,
  MapPin, ClipboardList, Rocket, ChevronRight, ChevronLeft,
  Sun, Moon, Menu, X, Phone, Mail, Clock, Facebook,
  Twitter, Youtube, Shield, Award, Globe, ArrowDown,
} from 'lucide-react';

interface LandingProps {
  onGoToLogin: () => void;
}

// ── Static Data ────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Programs', id: 'programs' },
  { label: 'News', id: 'news' },
  { label: 'Gallery', id: 'gallery' },
  { label: 'Contact', id: 'contact' },
];

const STATS = [
  { num: 47000, suffix: '+', label: 'Learners Enrolled' },
  { num: 312, suffix: '', label: 'Learning Centers' },
  { num: 21, suffix: '', label: 'LGAs Covered' },
  { num: 8, suffix: '', label: 'Active Programs' },
];

const PROGRAM_ICONS = [BookOpen, Wrench, GraduationCap, Users, Star, Heart];
const PROGRAM_COLORS = ['bg-primary', 'bg-gold', 'bg-terracotta', 'bg-primary', 'bg-gold', 'bg-success'];

const LGAS = [
  'Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong',
  'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika',
  'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo',
  'Yola North', 'Yola South',
];

const HEADER_H = 76;      // fixed header height
const GOVT_BAR_H = 36;    // top government bar (fixed offset of the header)
const HEADER_OFFSET = GOVT_BAR_H + HEADER_H + 16; // total clearance needed

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

// ── Motion Helpers ─────────────────────────────────────────────────────────
const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
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

// ── Animated Counter ───────────────────────────────────────────────────────
function CountUp({ value, suffix = '', duration = 1.6 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setN(value); return; }
    let start: number | null = null;
    let raf = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / (duration * 1000), 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

// ── Section Tag ────────────────────────────────────────────────────────────
function SectionTag({ children }: { children: ReactNode }) {
  return (
    <div className="govt-badge mb-5">
      <span className="w-2 h-2 rounded-full bg-gold" />
      {children}
    </div>
  );
}

// ── Section Heading ────────────────────────────────────────────────────────
function SectionHeading({ tag, title, sub, onDark = false }: { tag: string; title: string; sub?: string; onDark?: boolean }) {
  return (
    <div className="text-center mb-12 md:mb-16">
      <FadeIn><SectionTag>{tag}</SectionTag></FadeIn>
      <FadeIn delay={0.08}>
        <h2
          className="font-heading text-[28px] sm:text-[34px] lg:text-[42px] font-bold leading-tight tracking-tight"
          style={{ color: onDark ? '#FFFFFF' : 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
      </FadeIn>
      {sub && (
        <FadeIn delay={0.14}>
          <p
            className="text-base mt-4 max-w-xl mx-auto leading-relaxed"
            style={{ color: onDark ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)' }}
          >
            {sub}
          </p>
        </FadeIn>
      )}
    </div>
  );
}

// ── Gallery Slideshow ──────────────────────────────────────────────────────
function GallerySlideshow({ items }: { items: { image?: string; label: string }[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const go = useCallback((dir: 1 | -1) => {
    if (count <= 1) return;
    setIndex(i => (i + dir + count) % count);
  }, [count]);
  useEffect(() => {
    if (count <= 1 || reduced || paused) return;
    const t = setInterval(() => setIndex(i => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, reduced, paused]);
  useEffect(() => { if (count > 0 && index >= count) setIndex(0); }, [count, index]);
  if (count === 0) return null;
  const current = index >= count ? 0 : index;
  const item = items[current];
  const caption = item.label && /[a-zA-Z0-9]{3,}/.test(item.label) ? item.label : '';
  const accentColors = ['bg-primary', 'bg-gold', 'bg-terracotta', 'bg-primary-light', 'bg-success', 'bg-info'];
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="max-w-[920px] mx-auto">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-surface-warm aspect-video max-h-[540px]">
        <AnimatePresence>
          <motion.div key={current} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0">
            {item.image ? (
              <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-6xl ${accentColors[current % accentColors.length]} text-white`}>
                📸
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold">{current + 1} / {count}</div>
        {caption && <div className="absolute bottom-0 left-0 right-0 px-5 py-3 bg-black/60 text-white text-sm font-semibold">{caption}</div>}
        {count > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 border border-white/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors" aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 border border-white/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors" aria-label="Next"><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? 'w-7 bg-primary' : 'w-2.5 bg-border'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
// ── Render rich text from CMS details (paragraphs + bullet lists) ───────────
function renderDetails(details: string | undefined | null): ReactNode[] {
  if (!details) return [];
  return details
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every(l => l.startsWith('- '));
      if (isList) {
        return (
          <ul key={i} className="space-y-2.5 my-5">
            {lines.map((l, j) => (
              <li key={j} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="text-primary mt-0.5 font-bold">✓</span>
                <span>{l.replace(/^-\s*/, '')}</span>
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className="text-[15px] leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          {lines.join(' ')}
        </p>
      );
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED DETAIL-PAGE SHELL (govt bar + sticky header + footer)
// Used by the Program detail and News article pages.
// ═══════════════════════════════════════════════════════════════════════════
function DetailShell({ backLabel, isDark, toggleTheme, onBack, onGoToLogin, children }: {
  backLabel: string;
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
  onGoToLogin: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen font-body" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      {/* Govt top bar */}
      <div className="sticky top-0 z-[60] w-full text-[11px] font-medium tracking-wide py-1.5 px-4 flex items-center justify-between border-b"
        style={{ background: 'var(--color-primary-dark)', color: 'var(--color-text-inverse)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Shield size={12} className="opacity-60" />
          <span className="hidden sm:inline">Federal Republic of Nigeria</span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span>Adamawa State Government</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline opacity-70">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' })}</span>
        </div>
      </div>

      {/* Detail header */}
      <header className="sticky top-[36px] z-50 border-b backdrop-blur-xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-[1000px] mx-auto flex items-center justify-between h-[64px] px-4 md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border transition-colors hover:border-primary"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <ChevronLeft size={16} /> {backLabel}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-gold)' }}>
                <GraduationCap className="w-4.5 h-4.5" style={{ color: 'var(--color-gold-fg)' }} />
              </div>
              <div className="hidden sm:block">
                <div className="text-[13px] font-heading font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Adamawa MEB</div>
                <div className="text-[8px] tracking-[2.4px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Mass Education Board</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} className="text-gold" /> : <Moon size={16} />}
            </button>
            <button onClick={onGoToLogin} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              🔒 Staff Portal
            </button>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="pt-14 md:pt-16 pb-6 px-6 relative" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-gold)' }}>
                <GraduationCap size={18} style={{ color: 'var(--color-gold-fg)' }} />
              </div>
              <div className="text-sm font-heading font-bold text-white">Adamawa State<br />Mass Education Board</div>
            </div>
            <button onClick={onBack} className="text-[13px] font-semibold transition-colors hover:text-gold"
              style={{ color: 'rgba(255,255,255,0.65)' }}>← Back to Website</button>
          </div>
          <div className="pt-4 flex flex-wrap justify-between gap-2 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
            <span>© {new Date().getFullYear()} Adamawa State Mass Education Board. All Rights Reserved.</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-success" /> SSL Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAM DETAIL PAGE (opened by "Learn more")
// ═══════════════════════════════════════════════════════════════════════════
function ProgramDetailPage({ program, programs, isDark, toggleTheme, onBack, onGoToLogin, onEnroll, onOpenProgram }: {
  program: CmsProgram;
  programs: CmsProgram[];
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
  onGoToLogin: () => void;
  onEnroll: () => void;
  onOpenProgram: (id: string) => void;
}) {
  const others = programs.filter(p => p.id !== program.id).slice(0, 3);
  const accent = ['bg-primary', 'bg-gold', 'bg-terracotta', 'bg-success'][programs.findIndex(p => p.id === program.id) % 4] || 'bg-primary';

  return (
    <DetailShell backLabel="Back to Programs" isDark={isDark} toggleTheme={toggleTheme} onBack={onBack} onGoToLogin={onGoToLogin}>
      {/* Hero band */}
      <section className="relative px-6 md:px-7 pt-14 pb-12" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="max-w-[1000px] mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl ${accent} text-white flex items-center justify-center text-3xl shrink-0`}>
              {program.icon || <GraduationCap size={28} />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: 'var(--color-gold)' }}>
                AMEB Programme
              </div>
              <h1 className="font-heading text-[28px] sm:text-[36px] font-bold text-white leading-tight">{program.title}</h1>
            </div>
          </div>
          <p className="text-[16px] leading-relaxed max-w-[720px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {program.description}
          </p>
        </div>
      </section>

      {/* Full details */}
      <section className="px-6 md:px-7 py-12" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[1000px] mx-auto">
          <div className="rounded-2xl border p-7 md:p-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {(() => {
              const detailNodes = renderDetails(program.details);
              return detailNodes.length > 0 ? (
                <>{detailNodes}</>
              ) : (
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {program.description}
                </p>
              );
            })()}
            <div className="mt-8 pt-6 border-t flex flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={onBack} className="px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5" style={{ background: 'var(--color-primary)' }}>
                ← All Programs
              </button>
              <button onClick={onEnroll} className="px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
                🏫 Find a Learning Center
              </button>
            </div>
          </div>

          {/* Other programs */}
          {others.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>Other Programmes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {others.map(p => (
                  <a key={p.id} onClick={() => onOpenProgram(p.id)}
                    className="rounded-xl border p-5 cursor-pointer transition-all card-hover block"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className="font-heading text-[14px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{p.title}</div>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{p.description}</p>
                    <span className="inline-block mt-2.5 text-[11px] font-bold uppercase tracking-[1px] text-primary">Learn more →</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 md:px-7 py-14" style={{ background: isDark ? 'var(--color-surface-raised)' : 'var(--color-primary)' }}>
        <div className="max-w-[1000px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <div>
            <h3 className="font-heading text-xl font-bold text-white">Ready to begin your learning journey?</h3>
            <p className="text-sm mt-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.7)' }}>Visit any AMEB learning centre across the 21 LGAs of Adamawa State.</p>
          </div>
          <button onClick={onBack} className="px-7 py-3 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5" style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
            View All Programs
          </button>
        </div>
      </section>

    </DetailShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEWS ARTICLE PAGE (opened by "Read more")
// ═══════════════════════════════════════════════════════════════════════════
function NewsArticlePage({ article, articles, isDark, toggleTheme, onBack, onGoToLogin, onOpenArticle }: {
  article: CmsNews;
  articles: CmsNews[];
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
  onGoToLogin: () => void;
  onOpenArticle: (id: string) => void;
}) {
  const others = articles.filter(a => a.id !== article.id).slice(0, 3);
  const accent = ['bg-primary', 'bg-gold', 'bg-terracotta', 'bg-success'][articles.findIndex(a => a.id === article.id) % 4] || 'bg-primary';

  return (
    <DetailShell backLabel="Back to News" isDark={isDark} toggleTheme={toggleTheme} onBack={onBack} onGoToLogin={onGoToLogin}>
      {/* Article hero */}
      <section className="relative px-6 md:px-7 pt-14 pb-12" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="max-w-[1000px] mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-11 h-11 rounded-xl ${accent} text-white flex items-center justify-center text-xl shrink-0`}>
              {article.icon || '📰'}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[1px]"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--color-gold-light)' }}>
              Announcement
            </span>
            <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{article.date}</span>
          </div>
          <h1 className="font-heading text-[26px] sm:text-[34px] font-bold text-white leading-tight max-w-[820px]">{article.title}</h1>
          <p className="text-[16px] leading-relaxed mt-4 max-w-[760px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {article.excerpt}
          </p>
        </div>
      </section>

      {/* Article body */}
      <section className="px-6 md:px-7 py-12" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[1000px] mx-auto">
          <article className="rounded-2xl border p-7 md:p-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {article.image && (
              <div className="rounded-xl overflow-hidden mb-7 border" style={{ borderColor: 'var(--color-border)' }}>
                <img src={article.image} alt={article.title} className="w-full max-h-[360px] object-cover" />
              </div>
            )}
            {(() => {
              const bodyNodes = renderDetails(article.body);
              return bodyNodes.length > 0 ? (
                <>{bodyNodes}</>
              ) : (
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {article.excerpt}
                </p>
              );
            })()}
            <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={onBack} className="px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5" style={{ background: 'var(--color-primary)' }}>
                ← All News
              </button>
              <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>AMEB — News &amp; Announcements</span>
            </div>
          </article>

          {/* Other articles */}
          {others.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>More Announcements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {others.map(a => (
                  <a key={a.id} onClick={() => onOpenArticle(a.id)}
                    className="rounded-xl border p-5 cursor-pointer transition-all card-hover block"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{a.date}</span>
                    </div>
                    <div className="font-heading text-[14px] font-bold mb-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>{a.title}</div>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{a.excerpt}</p>
                    <span className="inline-block mt-2.5 text-[11px] font-bold uppercase tracking-[1px] text-primary">Read more →</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

    </DetailShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function Landing({ onGoToLogin }: LandingProps) {
  const handleScroll = useCallback(scrollTo, []);
  const { site_content, programs, news, team, gallery, loading } = useCmsData();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedProgram, setSelectedProgram] = useState<CmsProgram | null>(null);
  const [selectedNews, setSelectedNews] = useState<CmsNews | null>(null);

  const selectProgramById = useCallback((id: string) => {
    const p = programs.find(x => x.id === id);
    if (p) { setSelectedProgram(p); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }
  }, [programs]);

  const selectNewsById = useCallback((id: string) => {
    const a = news.find(x => x.id === id);
    if (a) { setSelectedNews(a); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }
  }, [news]);

  const handleGlobalEnroll = useCallback(() => {
    setSelectedProgram(null);
    setTimeout(() => scrollTo('contact'), 50);
  }, []);

  // Language toggle
  const [lang, setLang] = useState<'EN' | 'HA'>('EN');

  // Contact form
  const [cfName, setCfName] = useState('');
  const [cfEmail, setCfEmail] = useState('');
  const [cfSubject, setCfSubject] = useState('');
  const [cfMessage, setCfMessage] = useState('');
  const [cfSending, setCfSending] = useState(false);
  const [cfSent, setCfSent] = useState(false);
  const [cfError, setCfError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Center search
  const [centerSearch, setCenterSearch] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfName.trim() || !cfEmail.trim() || !cfMessage.trim()) return;
    setCfSending(true);
    setCfError('');
    const { error } = await supabase.from('cms_contacts').insert({
      id: crypto.randomUUID(), name: cfName.trim(), email: cfEmail.trim(),
      subject: cfSubject.trim() || '(no subject)', message: cfMessage.trim(), read: false,
    });
    if (error) setCfError('Failed to send. Please try again later.');
    else { setCfSent(true); setCfName(''); setCfEmail(''); setCfSubject(''); setCfMessage(''); }
    setCfSending(false);
  };

  const sortedTeam = [...team].sort((a, b) => a.sort_order - b.sort_order);
  const sortedPrograms = [...programs].sort((a, b) => a.sort_order - b.sort_order);
  const sortedNews = [...news].sort((a, b) => a.sort_order - b.sort_order);
  const sortedGallery = [...gallery].sort((a, b) => a.sort_order - b.sort_order);

  const filteredLgas = LGAS.filter(l => l.toLowerCase().includes(centerSearch.toLowerCase()));

  // Program detail page (replaces the whole landing view while open)
  if (selectedProgram) {
    return (
      <ProgramDetailPage
        program={selectedProgram}
        programs={sortedPrograms}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onBack={() => { setSelectedProgram(null); setTimeout(() => scrollTo('programs'), 50); }}
        onGoToLogin={onGoToLogin}
        onEnroll={handleGlobalEnroll}
        onOpenProgram={selectProgramById}
      />
    );
  }

  // News article page (replaces the whole landing view while open)
  if (selectedNews) {
    return (
      <NewsArticlePage
        article={selectedNews}
        articles={sortedNews}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onBack={() => { setSelectedNews(null); setTimeout(() => scrollTo('news'), 50); }}
        onGoToLogin={onGoToLogin}
        onOpenArticle={selectNewsById}
      />
    );
  }

  return (
    <div className="min-h-screen font-body" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>

      {/* ═══════════ 1. GOVERNMENT HEADER BAR ═══════════ */}
      <div className="sticky top-0 z-[60] w-full text-[11px] font-medium tracking-wide py-1.5 px-4 flex items-center justify-between border-b"
        style={{ background: 'var(--color-primary-dark)', color: 'var(--color-text-inverse)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Shield size={12} className="opacity-60" />
          <span className="hidden sm:inline">Federal Republic of Nigeria</span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span>Adamawa State Government</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline opacity-70">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' })}</span>
        </div>
      </div>

      {/* ═══════════ 2. MAIN NAVIGATION ═══════════ */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="fixed left-0 right-0 z-50 border-b backdrop-blur-xl"
        style={{ top: GOVT_BAR_H, background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-[76px] px-4 md:px-7">
          {/* Logo */}
          <motion.div onClick={() => handleScroll('home')} className="flex items-center gap-3 cursor-pointer" whileHover={{ opacity: 0.85 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-gold)' }}>
              <GraduationCap className="w-5 h-5" style={{ color: 'var(--color-gold-fg)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-heading font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Adamawa MEB</span>
                {loading && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <div className="text-[9px] tracking-[2.6px] uppercase" style={{ color: 'var(--color-text-muted)', marginTop: -1 }}>Mass Education Board</div>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(item => (
              <a key={item.id} onClick={() => handleScroll(item.id)}
                className="relative px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors hover:text-primary"
                style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                {item.label}
              </a>
            ))}
            {/* Language Toggle */}
            <div className="flex items-center ml-3 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={() => setLang('EN')} className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${lang === 'EN' ? 'bg-primary text-white' : ''}`}
                style={lang !== 'EN' ? { color: 'var(--color-text-secondary)' } : {}}>EN</button>
              <button onClick={() => setLang('HA')} className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${lang === 'HA' ? 'bg-primary text-white' : ''}`}
                style={lang !== 'HA' ? { color: 'var(--color-text-secondary)' } : {}}>HA</button>
            </div>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="ml-2 w-9 h-9 rounded-lg flex items-center justify-center transition-colors border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} className="text-gold" /> : <Moon size={16} />}
            </button>
            <button onClick={onGoToLogin} className="ml-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              🔒 Staff Portal
            </button>
          </nav>

          {/* Mobile Hamburger */}
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div key="mobile-menu" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }} transition={{ duration: 0.3, ease: easeOut }}
            className="md:hidden fixed inset-0 z-[55] overflow-y-auto"
            style={{ top: GOVT_BAR_H + HEADER_H, background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
            <div className="flex flex-col gap-2 p-7">
              {NAV_LINKS.map(item => (
                <a key={item.id} onClick={() => { handleScroll(item.id); setMobileNavOpen(false); }}
                  className="px-4 py-4 rounded-xl text-base font-bold transition-colors border"
                  style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', cursor: 'pointer', textDecoration: 'none' }}>
                  {item.label}
                </a>
              ))}
              <button onClick={() => { onGoToLogin(); setMobileNavOpen(false); }}
                className="mt-4 px-5 py-4 rounded-xl text-base font-bold text-white border-none"
                style={{ background: 'var(--color-primary)' }}>🔒 Staff Portal</button>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={toggleTheme} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
                <button onClick={() => setLang(lang === 'EN' ? 'HA' : 'EN')} className="px-4 py-3 rounded-xl text-sm font-bold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {lang === 'EN' ? 'HA' : 'EN'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ 3. HERO SECTION ═══════════ */}
      <section id="home" className="scroll-mt-[112px] min-h-screen flex items-center relative px-6 md:px-7"
        style={{ paddingTop: 120, paddingBottom: 90, background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        {site_content.hero_image && (
          <>
            <div className="absolute inset-0" style={{ backgroundImage: `url("${site_content.hero_image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0" style={{ background: 'var(--color-overlay)' }} />
          </>
        )}
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="max-w-[1200px] mx-auto w-full relative z-10">
          <div className="max-w-[800px] mx-auto text-center">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-wide"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
              <Award size={14} className="text-gold" />
              {site_content.hero_badge}
            </motion.div>

            {/* Title */}
            <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="font-heading text-[34px] sm:text-[46px] lg:text-[58px] font-bold leading-[1.1] mb-5 tracking-tight text-white">
              {site_content.hero_title_1}{' '}
              <span className="text-gold uppercase" style={{ letterSpacing: '0.5px' }}>{site_content.hero_title_2}</span>
              <span className="block text-base sm:text-lg lg:text-xl mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {site_content.hero_title_sub}
              </span>
            </motion.h1>

            {/* Hausa subtitle */}
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
              className="text-lg italic mb-4 font-heading" style={{ color: 'var(--color-gold)' }}>
              Ilimi Don Kowa
            </motion.p>

            {/* Description */}
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
              className="text-base leading-relaxed mb-10 max-w-[600px] mx-auto" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {site_content.hero_desc}
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.44 }}
              className="flex gap-4 flex-wrap justify-center">
              <button onClick={() => handleScroll('programs')}
                className="px-8 py-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2.5 transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
                {lang === 'EN' ? 'Explore Our Programs' : 'Bincika Shirye-Shiryenmu'} <ChevronRight size={16} />
              </button>
              <button onClick={onGoToLogin}
                className="px-8 py-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2.5 border transition-all hover:-translate-y-0.5"
                style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', background: 'rgba(255,255,255,0.08)' }}>
                🔒 {lang === 'EN' ? 'Staff Portal' : 'Shirin Ma\'aikata'}
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.56 }}
              className="grid grid-cols-2 sm:flex mt-14 pt-8 max-w-[660px] mx-auto"
              style={{ borderTop: '1px solid rgba(255,255,255,0.2)', gap: 0 }}>
              {STATS.map((stat, i) => (
                <div key={stat.label} className="text-center sm:text-left flex-1 py-3 px-4"
                  style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                  <div className="text-[26px] sm:text-[32px] font-heading font-bold text-white leading-none">
                    <CountUp value={stat.num} suffix={stat.suffix} />
                  </div>
                  <div className="text-[10px] mt-1.5 uppercase tracking-[0.9px] font-bold" style={{ color: 'var(--color-gold-light)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ArrowDown size={20} className="text-gold opacity-60" />
        </motion.div>
      </section>

      {/* ═══════════ 4. GOVERNMENT TRUST BAR ═══════════ */}
      <div className="border-y" style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center gap-6 md:gap-12 py-4 px-6">
          {[
            { icon: <Shield size={16} />, text: 'Officially Recognized' },
            { icon: <Award size={16} />, text: 'Govt. Accredited Programs' },
            { icon: <Globe size={16} />, text: '21 LGAs Served' },
            { icon: <GraduationCap size={16} />, text: 'Est. Adamawa State Law' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="text-primary">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ 5. ABOUT SECTION ═══════════ */}
      <section id="about" className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: 'var(--color-surface-warm)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag={site_content.about_tag} title={site_content.about_title} sub={site_content.about_sub} />
          {site_content.about_image && (
            <FadeIn>
              <div className="rounded-2xl overflow-hidden mb-9 border max-w-[900px] mx-auto" style={{ borderColor: 'var(--color-border)' }}>
                <img src={site_content.about_image} alt="About AMEB" className="w-full max-h-[420px] object-cover" />
              </div>
            </FadeIn>
          )}
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-7" variants={listContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-70px' }}>
            {/* Vision & Mission */}
            <motion.div variants={listItem}>
              <div className="rounded-2xl p-8 md:p-9 h-full border relative overflow-hidden card-hover" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
                <div className="w-12 h-12 rounded-xl bg-surface-warm flex items-center justify-center mb-4 text-xl"><TargetIcon /></div>
                <h3 className="font-heading text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Vision &amp; Mission</h3>
                <div className="space-y-3 mb-4">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>Vision:</strong> {site_content.vision_text}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>Mission:</strong> {site_content.mission_text}
                  </p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{site_content.about_body}</p>
              </div>
            </motion.div>
            {/* Leadership */}
            <motion.div variants={listItem}>
              <div className="rounded-2xl p-8 md:p-9 h-full border relative overflow-hidden card-hover" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gold" />
                <div className="w-12 h-12 rounded-xl bg-surface-warm flex items-center justify-center mb-4 text-xl"><Users size={22} style={{ color: 'var(--color-primary)' }} /></div>
                <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>Board Leadership</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sortedTeam.map((leader, i) => (
                    <div key={leader.name} className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-primary"
                      style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                      <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `var(--color-${['primary', 'gold', 'terracotta', 'success'][i % 4]})` }}>
                        {leader.photo ? <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" /> : leader.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{leader.name}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{leader.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 6. PROGRAMS SECTION ═══════════ */}
      <section id="programs" className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag={site_content.programs_tag} title={site_content.programs_title} sub={site_content.programs_sub} />
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" variants={listContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-70px' }}>
            {sortedPrograms.map((program, i) => {
              const Icon = PROGRAM_ICONS[i % PROGRAM_ICONS.length];
              return (
                <motion.div key={program.title} variants={listItem}>
                  <div className="rounded-2xl p-7 h-full border relative card-hover" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className={`w-13 h-13 rounded-xl ${PROGRAM_COLORS[i % PROGRAM_COLORS.length]} text-white flex items-center justify-center mb-4`}>
                      {program.icon ? <span className="text-2xl">{program.icon}</span> : <Icon size={22} />}
                    </div>
                    <h3 className="font-heading text-base font-bold mb-2.5" style={{ color: 'var(--color-text-primary)' }}>{program.title}</h3>
                    <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>{program.description}</p>
                    <button onClick={() => selectProgramById(program.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[1.1px] text-primary transition-all hover:gap-2">
                      Learn more <ChevronRight size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 7. HOW TO ENROLL ═══════════ */}
      <section className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag="Getting Started" title={lang === 'EN' ? 'How to Enroll' : 'Yadda Ake Yin Rajista'}
            sub={lang === 'EN' ? 'Three simple steps to begin your learning journey' : 'Matakka uku masu sauki don fara tafiyar iliminku'} onDark />
          <div className="max-w-[800px] mx-auto">
            {[
              { num: 1, icon: <MapPin size={22} />, title: lang === 'EN' ? 'Find Your Nearest Learning Center' : 'Nemo Cibiyar Ilimi da ke Kusa da ku', desc: lang === 'EN' ? 'Use our directory to locate a center in your LGA or ward.' : 'Yi amfani da jerin mu don samun cibiyar a karkara ko ward din ku.' },
              { num: 2, icon: <ClipboardList size={22} />, title: lang === 'EN' ? 'Complete the Registration Form' : 'Cika Fomun Rajista', desc: lang === 'EN' ? 'Fill out your personal details and select your preferred program.' : 'Cika bayanan kanka kuma zaɓi shirin da kake so.' },
              { num: 3, icon: <Rocket size={22} />, title: lang === 'EN' ? 'Begin Your Learning Journey' : 'Fara Tafiyar Iliminku', desc: lang === 'EN' ? 'Start attending classes and building new skills.' : 'Fara yin darussa kuma samu sabbin fasahohi.' },
            ].map((step, i) => (
              <div key={step.num} className="flex gap-5 md:gap-8 items-start mb-10 last:mb-0">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
                    {step.num}
                  </div>
                  {i < 2 && <div className="w-0.5 h-10 mt-2 rounded-full" style={{ background: 'var(--color-gold-light)' }} />}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-white/60">{step.icon}</span>
                    <h3 className="font-heading text-lg font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 8. NEWS AND ANNOUNCEMENTS ═══════════ */}
      <section id="news" className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag={site_content.news_tag} title={site_content.news_title} sub={site_content.news_sub} />
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" variants={listContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-70px' }}>
            {sortedNews.map((article, i) => (
              <motion.div key={article.title} variants={listItem}>
                <div className="rounded-2xl overflow-hidden h-full border card-hover" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="h-[140px] relative flex items-center justify-center"
                    style={{ background: `var(--color-${['primary', 'gold', 'terracotta'][i % 3]})` }}>
                    {article.image ? (
                      <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{article.icon}</span>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-primary text-[10px] font-bold tracking-wider border"
                      style={{ borderColor: 'var(--color-border)' }}>{article.date}</span>
                  </div>
                  <div className="p-5 md:p-6">
                    <h3 role="link" tabIndex={0} aria-label={`Read article: ${article.title}`}
                      className="font-heading text-[15px] font-bold mb-2 leading-snug cursor-pointer transition-colors hover:text-primary focus:outline-none focus:underline"
                      style={{ color: 'var(--color-text-primary)' }}
                      onClick={() => selectNewsById(article.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNewsById(article.id); } }}>
                      {article.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>{article.excerpt}</p>
                    <button onClick={() => selectNewsById(article.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[1.1px] text-primary transition-all hover:gap-2">
                      Read more <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 9. GALLERY ═══════════ */}
      <section id="gallery" className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: 'var(--color-surface-warm)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag={site_content.gallery_tag} title={site_content.gallery_title} sub={site_content.gallery_sub} />
          <FadeIn><GallerySlideshow items={sortedGallery} /></FadeIn>
        </div>
      </section>

      {/* ═══════════ 10. FIND A LEARNING CENTER ═══════════ */}
      <section className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag="Find a Center" title={lang === 'EN' ? 'Find a Learning Center' : 'Nemo Cibiyar Ilimi'}
            sub={lang === 'EN' ? 'Search by LGA or town to find your nearest center' : 'Bincika ta LGA ko gari don samun cibiyar ku'} />
          <div className="max-w-[600px] mx-auto mb-8">
            <div className="flex gap-2">
              <input value={centerSearch} onChange={e => setCenterSearch(e.target.value)}
                placeholder={lang === 'EN' ? 'Enter your LGA or town name...' : 'Shigar da sunan LGA ko gari...'}
                className="flex-1 h-12 px-5 rounded-full border text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button className="px-6 h-12 rounded-full text-sm font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
                Search
              </button>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-[800px] mx-auto">
            {filteredLgas.map(lga => (
              <span key={lga} className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors hover:bg-primary hover:text-white hover:border-primary"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                {lga}
              </span>
            ))}
          </div>
          <div className="mt-10 max-w-[600px] mx-auto rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <MapPin size={40} className="mx-auto mb-3 text-primary opacity-40" />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'EN' ? 'Interactive map coming soon' : 'Taswirar ta zuwa nan kawai'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 11. CONTACT SECTION ═══════════ */}
      <section id="contact" className="scroll-mt-[112px] py-16 md:py-24 px-6" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        <div className="max-w-[1200px] mx-auto">
          <SectionHeading tag={site_content.contact_tag} title={site_content.contact_title} sub={site_content.contact_sub} onDark />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-[980px] mx-auto">
            {/* Contact Info */}
            <div>
              <h3 className="font-heading text-lg font-bold mb-5 text-white">{lang === 'EN' ? 'Our Office' : 'Keɓen Mu'}</h3>
              {[
                { icon: <MapPin size={18} />, label: 'Head Office', value: site_content.address },
                { icon: <Phone size={18} />, label: 'Phone', value: `${site_content.phone}\n${site_content.phone_2}` },
                { icon: <Mail size={18} />, label: 'Email', value: `${site_content.email}\n${site_content.email_2}` },
                { icon: <Clock size={18} />, label: 'Office Hours', value: `${site_content.hours}\n${site_content.hours_sat}` },
              ].map(contact => (
                <div key={contact.label} className="flex gap-3.5 mb-4.5 items-start">
                  <div className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-gold)' }}>
                    {contact.icon}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong className="block mb-0.5 text-[13px] text-white">{contact.label}</strong>
                    {contact.value.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              ))}
            </div>
            {/* Contact Form */}
            <div className="rounded-2xl p-8 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="font-heading text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Send us a Message</h3>
              <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-secondary)' }}>Fill out the form below and our team will respond promptly.</p>
              {cfSent ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">✅</div>
                  <h3 className="font-heading text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Message Sent!</h3>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>Thank you for reaching out. We'll respond promptly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-3.5">
                  {cfError && <div className="px-3.5 py-2.5 rounded-lg text-[13px]" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', color: 'var(--color-error)' }}>{cfError}</div>}
                  <input placeholder="Your Full Name" required value={cfName} onChange={e => setCfName(e.target.value)}
                    className="h-11 px-4 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <input placeholder="Your Email Address" type="email" required value={cfEmail} onChange={e => setCfEmail(e.target.value)}
                    className="h-11 px-4 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <input placeholder="Subject" value={cfSubject} onChange={e => setCfSubject(e.target.value)}
                    className="h-11 px-4 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <textarea placeholder="Your Message…" required rows={4} value={cfMessage} onChange={e => setCfMessage(e.target.value)}
                    className="px-4 py-3 rounded-lg border text-sm outline-none resize-y min-h-[100px] transition-colors focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <button type="submit" disabled={cfSending}
                    className="self-start px-7 py-3.5 rounded-lg text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-primary)' }}>
                    {cfSending ? 'Sending…' : 'Send Message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 12. FOOTER ═══════════ */}
      <footer className="pt-14 md:pt-16 pb-6 px-6 relative" style={{ background: isDark ? 'var(--color-bg)' : 'var(--color-primary-dark)' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-9">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-gold)' }}>
                  <GraduationCap size={18} style={{ color: 'var(--color-gold-fg)' }} />
                </div>
                <div className="text-sm font-heading font-bold text-white">Adamawa State<br />Mass Education Board</div>
              </div>
              <p className="text-[13px] leading-relaxed max-w-[300px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                An agency of the Adamawa State Government, Federal Republic of Nigeria. Providing quality mass education services to all citizens across 21 LGAs.
              </p>
              <div className="flex gap-2 mt-4">
                {[Facebook, Twitter, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>
            {/* Quick Links */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[2px] mb-4" style={{ color: 'var(--color-gold)' }}>Quick Links</h4>
              {[{ label: 'Home', id: 'home' }, { label: 'About Us', id: 'about' }, { label: 'Programs', id: 'programs' }, { label: 'News', id: 'news' }, { label: 'Contact', id: 'contact' }].map(link => (
                <a key={link.label} onClick={() => handleScroll(link.id)}
                  className="block text-[13px] py-1.5 cursor-pointer transition-colors hover:text-gold"
                  style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{link.label}</a>
              ))}
            </div>
            {/* Programs */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[2px] mb-4" style={{ color: 'var(--color-gold)' }}>Programs</h4>
              {['Adult Literacy', 'Vocational Skills', 'Non-Formal Education', 'Women Empowerment', 'Youth Development'].map(link => (
                <a key={link} onClick={() => handleScroll('programs')}
                  className="block text-[13px] py-1.5 cursor-pointer transition-colors hover:text-gold"
                  style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{link}</a>
              ))}
            </div>
            {/* Contact */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[2px] mb-4" style={{ color: 'var(--color-gold)' }}>Contact</h4>
              <div className="space-y-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <p>{site_content.address}</p>
                <p>{site_content.phone}{site_content.phone_2 ? ` · ${site_content.phone_2}` : ''}</p>
                <p>{site_content.email}</p>
                <p className="text-[12px] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{site_content.hours}{site_content.hours_sat ? ` · ${site_content.hours_sat}` : ''}</p>
              </div>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="pt-4.5 flex flex-wrap justify-between gap-2 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
            <span>© {new Date().getFullYear()} Adamawa State Mass Education Board. All Rights Reserved.</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-success" /> SSL Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Helper: Target icon (inline SVG) ───────────────────────────────────────
function TargetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
