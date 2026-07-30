import { useCallback, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useCmsData } from '@/hooks/useCmsData';
import { supabase } from '@/supabase/client';

interface LandingProps {
  onGoToLogin: () => void;
}

// ── Color palette ─────────────────────────────────────────────────────────────
const colors = {
  navy: '#0c1b33',
  navyLight: '#162d50',
  navyMid: '#1e3a5f',
  gold: '#c9952c',
  goldLight: '#e8c978',
  goldPale: '#f5e7c8',
  cream: '#f7f3ee',
  creamLight: '#fbf9f6',
  white: '#ffffff',
  charcoal: '#1f2937',
  slate: '#6b7280',
  slateLight: '#9ca3af',
  border: '#e5e2dc',
};

// ── Reusable styles ───────────────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  padding: '60px 20px',
};

// ── Reusable scroll animation wrapper ──
function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const innerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 700,
  color: colors.gold,
  textTransform: 'uppercase',
  letterSpacing: 3,
  marginBottom: 12,
};

const headingStyle: React.CSSProperties = {
  fontWeight: 800,
  color: colors.charcoal,
  lineHeight: 1.2,
  letterSpacing: '-0.8px',
};

const subStyle: React.CSSProperties = {
  fontSize: 14,
  color: colors.slate,
  lineHeight: 1.7,
  marginTop: 12,
};

const HEADER_H = 72;
const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_H - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

export function Landing({ onGoToLogin }: LandingProps) {
  const handleScroll = useCallback(scrollTo, []);
  const { site_content, programs, news, team, gallery, downloads, loading } = useCmsData();

  // Contact form state
  const [cfName, setCfName] = useState('');
  const [cfEmail, setCfEmail] = useState('');
  const [cfSubject, setCfSubject] = useState('');
  const [cfMessage, setCfMessage] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cfSending, setCfSending] = useState(false);
  const [cfSent, setCfSent] = useState(false);
  const [cfError, setCfError] = useState('');

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
      setCfName(''); setCfEmail(''); setCfSubject(''); setCfMessage('');
    }
    setCfSending(false);
  };

  return (
    <div style={{
      background: colors.white,
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ═══════════ HEADER ═══════════ */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(12,27,51,.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(201,149,44,.10)',
        transition: 'all .3s',
      }}>
        <div style={{
          ...innerStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 72,
          padding: '0 32px',
        }}>
          {/* Logo */}
          <div
            onClick={() => handleScroll('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(145deg, ${colors.gold}, ${colors.goldLight})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
              boxShadow: `0 2px 12px rgba(201,149,44,.3)`,
            }}>
              🏛
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: colors.white, letterSpacing: '-0.3px' }}>
                  Adamawa MEB
                </span>
                {loading && (
                  <span
                    className="animate-pulse"
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: colors.gold,
                      boxShadow: `0 0 6px ${colors.gold}`,
                      display: 'inline-block',
                    }}
                  />
                )}
              </div>
              <div style={{
                fontSize: 9,
                color: colors.goldPale,
                opacity: 0.6,
                letterSpacing: 2.8,
                textTransform: 'uppercase',
                marginTop: -1,
              }}>
                Mass Education Board
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2 }}>
            {[
              { label: 'Home', id: 'home' },
              { label: 'About', id: 'about' },
              { label: 'Programs', id: 'programs' },
              { label: 'News', id: 'news' },
              { label: 'Gallery', id: 'gallery' },
              { label: 'Contact', id: 'contact' },
            ].map(item => (
              <a
                key={item.id}
                onClick={() => handleScroll(item.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,.55)',
                  cursor: 'pointer',
                  transition: 'all .25s',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  letterSpacing: '0.2px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = colors.goldLight; e.currentTarget.style.background = 'rgba(201,149,44,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={onGoToLogin}
              style={{
                marginLeft: 12,
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid rgba(201,149,44,.35)',
                cursor: 'pointer',
                color: colors.goldLight,
                background: 'rgba(201,149,44,.08)',
                transition: 'all .25s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,149,44,.18)'; e.currentTarget.style.borderColor = 'rgba(201,149,44,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,149,44,.08)'; e.currentTarget.style.borderColor = 'rgba(201,149,44,.35)'; }}
            >
              🔒 Staff Portal
            </button>
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,.08)', border: 'none',
              color: colors.white, fontSize: 20, cursor: 'pointer',
            }}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{
            background: colors.navy,
            padding: '80px 28px 28px',
          }}
        >
          <button
            onClick={() => setMobileNavOpen(false)}
            className="absolute top-4 right-4 flex items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,.08)', border: 'none',
              color: colors.white, fontSize: 18, cursor: 'pointer',
            }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Home', id: 'home' },
              { label: 'About', id: 'about' },
              { label: 'Programs', id: 'programs' },
              { label: 'News', id: 'news' },
              { label: 'Gallery', id: 'gallery' },
              { label: 'Contact', id: 'contact' },
            ].map(item => (
              <a
                key={item.id}
                onClick={() => { handleScroll(item.id); setMobileNavOpen(false); }}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,.6)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = colors.goldLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
              >
                {item.label}
              </a>
            ))}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <button
                onClick={() => { onGoToLogin(); setMobileNavOpen(false); }}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  fontSize: 14, fontWeight: 700,
                  border: '1px solid rgba(201,149,44,.35)',
                  cursor: 'pointer', color: colors.goldLight,
                  background: 'rgba(201,149,44,.08)',
                }}
              >
                🔒 Staff Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ HERO ═══════════ */}
      <section id="home" style={{
        scrollMarginTop: 88,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '100px 28px 60px',
        background: `linear-gradient(165deg, #0a1428 0%, #0c1b33 25%, #162d50 55%, #1a2d4a 80%, #0c1b33 100%)`,
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(201,149,44,.8) 0, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,.1) 0, transparent 30%),
            radial-gradient(circle at 50% 80%, rgba(201,149,44,.4) 0, transparent 40%)
          `,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.015,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(201,149,44,.5) 1px, transparent 0)`,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Floating orbs */}
        <div style={{
          position: 'absolute', width: 520, height: 520, borderRadius: '50%',
          background: 'rgba(201,149,44,.04)', filter: 'blur(100px)',
          top: -200, right: -150, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(59,130,246,.04)', filter: 'blur(100px)',
          bottom: -150, left: -100, pointerEvents: 'none',
        }} />

        <div style={{ ...innerStyle, position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 100,
              background: 'rgba(201,149,44,.08)',
              border: '1px solid rgba(201,149,44,.15)',
              fontSize: 11,
              fontWeight: 600,
              color: colors.goldLight,
              marginBottom: 28,
              letterSpacing: '0.4px',
            }}>
              <span style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: colors.gold,
                boxShadow: '0 0 10px rgba(201,149,44,.6)',
              }} />
              {site_content.hero_badge}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl" style={{
              fontWeight: 800,
              color: colors.white,
              lineHeight: 1.05,
              marginBottom: 20,
              letterSpacing: '-1.8px',
            }}>
              {site_content.hero_title_1}{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.goldLight} 0%, ${colors.gold} 50%, #b8860b 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textTransform: 'uppercase',
                fontWeight: 900,
                letterSpacing: '1px',
              }}>
                {site_content.hero_title_2}
              </span>
              <span className="text-sm sm:text-base lg:text-[22px]" style={{
                fontWeight: 400,
                color: 'rgba(255,255,255,.25)',
                letterSpacing: '-0.4px',
                marginTop: 8,
                maxWidth: 600,
                margin: '8px auto 0',
              }}>
                {site_content.hero_title_sub}
              </span>
            </h1>

            {/* Description */}
            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,.4)',
              lineHeight: 1.85,
              margin: '0 auto 36px',
              maxWidth: 580,
            }}>
              {site_content.hero_desc}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => handleScroll('about')}
                style={{
                  padding: '15px 34px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  letterSpacing: '0.3px',
                  background: `linear-gradient(145deg, ${colors.gold} 0%, ${colors.goldLight} 50%, ${colors.gold} 100%)`,
                  color: colors.navy,
                  boxShadow: `0 4px 28px rgba(201,149,44,.3)`,
                  transition: 'all .3s',
                }}
              >
                Explore Our Programs
                <span style={{ fontSize: 16 }}>→</span>
              </button>
              <button
                onClick={onGoToLogin}
                style={{
                  padding: '15px 34px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,.08)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  letterSpacing: '0.3px',
                  background: 'rgba(255,255,255,.04)',
                  color: colors.white,
                  backdropFilter: 'blur(8px)',
                  transition: 'all .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
              >
                🔒 Staff Portal
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:flex" style={{
              gap: 0,
              margin: '52px auto 0',
              paddingTop: 36,
              borderTop: '1px solid rgba(255,255,255,.06)',
              maxWidth: 640,
            }}>
              {[
                { num: '21', label: 'LGAs Covered' },
                { num: '80+', label: 'Learning Centres' },
                { num: '20', label: 'Staff Cadres' },
                { num: '22', label: 'Posting Stations' },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center sm:text-left" style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
                }}>
                  <div className="text-2xl sm:text-3xl" style={{
                    fontWeight: 800,
                    background: `linear-gradient(145deg, ${colors.goldLight}, ${colors.gold})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1,
                  }}>
                    {stat.num}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.3)',
                    marginTop: 5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    fontWeight: 600,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ABOUT ═══════════ */}
      <FadeIn>
      <section id="about" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: `linear-gradient(180deg, ${colors.cream} 0%, ${colors.creamLight} 100%)`,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.about_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.about_title }} />
            <p style={subStyle}>
              {site_content.about_sub}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{
            gap: 48,
            alignItems: 'stretch',
          }}>
            {/* Vision & Mission */}
            <div style={{
              background: colors.white,
              borderRadius: 16,
              padding: 36,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,.04)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${colors.gold}, ${colors.goldLight}, ${colors.gold})`,
              }} />
              <div style={{ fontSize: 28, marginBottom: 16 }}>🎯</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.charcoal, marginBottom: 12 }}>
                Vision &amp; Mission
              </h3>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.8, marginBottom: 12 }}>
                  <strong style={{ color: colors.navy }}>Vision:</strong> {site_content.vision_text}
                </p>
                <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.8, marginBottom: 12 }}>
                  <strong style={{ color: colors.navy }}>Mission:</strong> {site_content.mission_text}
                </p>
              </div>
              <p style={{ fontSize: 14, color: colors.slate, lineHeight: 1.8 }}>
                {site_content.about_body}
              </p>
            </div>

            {/* Leadership */}
            <div style={{
              background: colors.white,
              borderRadius: 16,
              padding: 36,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,.04)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${colors.gold}, ${colors.goldLight}, ${colors.gold})`,
              }} />
              <div style={{ fontSize: 28, marginBottom: 16 }}>👥</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.charcoal, marginBottom: 16 }}>
                Board Leadership
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                {team.sort((a,b) => a.sort_order - b.sort_order).map(leader => (
                  <div
                    key={leader.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 10,
                      background: colors.creamLight,
                      border: `1px solid ${colors.border}`,
                      transition: 'all .3s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `linear-gradient(145deg, ${colors.navy}, ${colors.navyLight})`,
                      color: colors.goldLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>
                      {leader.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.charcoal }}>
                        {leader.name}
                      </div>
                      <div style={{ fontSize: 11, color: colors.slateLight, marginTop: 2 }}>
                        {leader.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ PROGRAMS ═══════════ */}
      <FadeIn delay={0.1}>
      <section id="programs" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: colors.white,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.programs_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.programs_title }} />
            <p style={subStyle}>
              {site_content.programs_sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{
            gap: 24,
          }}>
            {programs.sort((a,b) => a.sort_order - b.sort_order).map(program => (
              <div
                key={program.title}
                style={{
                  background: colors.white,
                  borderRadius: 16,
                  border: `1px solid ${colors.border}`,
                  cursor: 'default',
                  transition: 'all .4s cubic-bezier(.4,0,.2,1)',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,.1)';
                  e.currentTarget.style.borderColor = 'rgba(201,149,44,.25)';
                  const line = e.currentTarget.querySelector('._prog-line') as HTMLElement;
                  if (line) line.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)';
                  e.currentTarget.style.borderColor = colors.border;
                  const line = e.currentTarget.querySelector('._prog-line') as HTMLElement;
                  if (line) line.style.opacity = '0';
                }}
              >
                <div className="_prog-line" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${colors.gold}, ${colors.goldLight}, transparent)`,
                  opacity: 0, transition: 'opacity .4s',
                }} />
                <div style={{ padding: '32px 28px' }}>
                  <div style={{ fontSize: 34, marginBottom: 16, display: 'block' }}>
                    {program.icon}
                  </div>                    <h3 style={{ fontSize: 17, fontWeight: 700, color: colors.charcoal, marginBottom: 10, letterSpacing: '-0.2px' }}>
                    {program.title}
                  </h3>
                  <p style={{ fontSize: 13, color: colors.slate, lineHeight: 1.75 }}>
                    {program.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ NEWS ═══════════ */}
      <FadeIn delay={0.1}>
      <section id="news" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: colors.cream,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.news_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.news_title }} />
            <p style={subStyle}>
              {site_content.news_sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
            {news.sort((a,b) => a.sort_order - b.sort_order).map(article => (
              <div
                key={article.title}
                style={{
                  background: colors.white,
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${colors.border}`,
                  transition: 'all .4s cubic-bezier(.4,0,.2,1)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,.1)'; e.currentTarget.style.borderColor = colors.goldLight; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; e.currentTarget.style.borderColor = colors.border; }}
              >
                <div style={{
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(145deg, ${colors.cream}, ${colors.border})`,
                  fontSize: 38,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {article.icon}
                </div>
                <div style={{ padding: '20px 22px 24px' }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.gold,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    marginBottom: 6,
                  }}>
                    {article.date}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.charcoal, marginBottom: 8, lineHeight: 1.4 }}>
                    {article.title}
                  </h3>
                  <p style={{ fontSize: 13, color: colors.slate, lineHeight: 1.65 }}>
                    {article.excerpt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ GALLERY ═══════════ */}
      <FadeIn delay={0.1}>
      <section id="gallery" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: colors.white,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.gallery_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.gallery_title }} />
            <p style={subStyle}>
              {site_content.gallery_sub}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{
            gap: 14,
          }}>
            {gallery.sort((a,b) => a.sort_order - b.sort_order).map((item, i) => {
              const isWide = item.wide;
              const isTall = item.tall;
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: isTall ? 'auto' : '1',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: item.image ? 'none' : `linear-gradient(145deg, ${colors.cream}, ${colors.border})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    cursor: 'pointer',
                    transition: 'all .4s',
                    border: '2px solid transparent',
                    position: 'relative',
                    gridColumn: isWide ? 'span 2' : 'span 1',
                    gridRow: isTall ? 'span 2' : 'span 1',
                    minHeight: isTall ? 280 : 'auto',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.label} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  ) : (
                    item.label || '📸'
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ DOWNLOADS ═══════════ */}
      <FadeIn delay={0.1}>
      <section id="downloads" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: colors.cream,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.downloads_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.downloads_title }} />
            <p style={subStyle}>
              {site_content.downloads_sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12, maxWidth: 800, margin: '0 auto' }}>
            {downloads.sort((a,b) => a.sort_order - b.sort_order).map(dl => (
              <div
                key={dl.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderRadius: 10,
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  transition: 'all .3s',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.goldLight; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{
                  fontSize: 22, flexShrink: 0, width: 40, height: 40,
                  borderRadius: 8, background: colors.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dl.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.charcoal }}>
                    {dl.title}
                  </div>
                  <div style={{ fontSize: 11, color: colors.slateLight, marginTop: 3 }}>
                    {dl.meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ CONTACT ═══════════ */}
      <FadeIn delay={0.1}>
      <section id="contact" style={{
        ...sectionStyle,
        scrollMarginTop: 88,
        background: colors.white,
      }}>
        <div style={innerStyle}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={tagStyle}>{site_content.contact_tag}</div>
            <h2 className="text-[28px] lg:text-[38px]" style={headingStyle} dangerouslySetInnerHTML={{ __html: site_content.contact_title }} />
            <p style={subStyle}>
              {site_content.contact_sub}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{
            gap: 48,
            maxWidth: 960,
            margin: '0 auto',
          }}>
            {/* Contact Info */}
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.charcoal, marginBottom: 20 }}>
                Our Office
              </h3>
              {[
                { icon: '📍', label: 'Head Office', value: site_content.address },
                { icon: '📞', label: 'Phone', value: site_content.phone + '\n' + site_content.phone_2 },
                { icon: '✉️', label: 'Email', value: site_content.email + '\n' + site_content.email_2 },
                { icon: '🕐', label: 'Office Hours', value: site_content.hours + '\n' + site_content.hours_sat },
              ].map(contact => (
                <div key={contact.label} style={{
                  display: 'flex', gap: 14, marginBottom: 18, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: colors.cream, color: colors.gold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {contact.icon}
                  </div>
                  <div style={{ fontSize: 14, color: colors.slate, lineHeight: 1.7 }}>
                    <strong style={{ color: colors.charcoal, display: 'block', marginBottom: 2, fontSize: 13 }}>
                      {contact.label}
                    </strong>
                    {contact.value.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div style={{
              background: colors.white,
              borderRadius: 16,
              padding: 36,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 12px 40px rgba(0,0,0,.06)',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.charcoal, marginBottom: 4 }}>
                Send us a Message
              </h3>
              <p style={{ fontSize: 13, color: colors.slate, marginBottom: 20 }}>
                Fill out the form below and our team will respond promptly.
              </p>
              {cfSent ? (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <h3 style={{fontSize:16,fontWeight:700,color:colors.charcoal,marginBottom:4}}>Message Sent!</h3>
                  <p style={{fontSize:13,color:colors.slate}}>Thank you for reaching out. We'll respond promptly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cfError && (
                    <div style={{padding:'10px 14px',background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.15)',color:'#c0392b',borderRadius:8,fontSize:13}}>
                      {cfError}
                    </div>
                  )}
                  <input
                    placeholder="Your Full Name"
                    required
                    value={cfName}
                    onChange={e => setCfName(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all .2s',
                      background: colors.cream,
                      width: '100%',
                    }}
                    onFocus={e => { e.target.style.borderColor = colors.gold; e.target.style.background = colors.white; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; e.target.style.background = colors.cream; }}
                  />
                  <input
                    placeholder="Your Email Address"
                    type="email"
                    required
                    value={cfEmail}
                    onChange={e => setCfEmail(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all .2s',
                      background: colors.cream,
                      width: '100%',
                    }}
                    onFocus={e => { e.target.style.borderColor = colors.gold; e.target.style.background = colors.white; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; e.target.style.background = colors.cream; }}
                  />
                  <input
                    placeholder="Subject"
                    value={cfSubject}
                    onChange={e => setCfSubject(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all .2s',
                      background: colors.cream,
                      width: '100%',
                    }}
                    onFocus={e => { e.target.style.borderColor = colors.gold; e.target.style.background = colors.white; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; e.target.style.background = colors.cream; }}
                  />
                  <textarea
                    placeholder="Your Message…"
                    required
                    rows={4}
                    value={cfMessage}
                    onChange={e => setCfMessage(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all .2s',
                      background: colors.cream,
                      width: '100%',
                      resize: 'vertical',
                      minHeight: 100,
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = colors.gold; e.target.style.background = colors.white; }}
                    onBlur={e => { e.target.style.borderColor = colors.border; e.target.style.background = colors.cream; }}
                  />
                  <button
                    type="submit"
                    disabled={cfSending}
                    style={{
                      padding: '14px 28px',
                      background: `linear-gradient(145deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                      color: colors.white,
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: cfSending ? 'not-allowed' : 'pointer',
                      width: 'fit-content',
                      transition: 'all .3s',
                      letterSpacing: '0.3px',
                      opacity: cfSending ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px rgba(12,27,51,.25)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {cfSending ? 'Sending…' : 'Send Message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════════ FOOTER ═══════════ */}
      <FadeIn delay={0.2}>
      <footer style={{
        background: colors.navy,
        padding: '60px 28px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)`,
          opacity: 0.3,
        }} />
        <div style={{ ...innerStyle, position: 'relative', zIndex: 1 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{
            gap: 48,
            marginBottom: 40,
          }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: `linear-gradient(145deg, ${colors.gold}, ${colors.goldLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: colors.navy, fontSize: 16, flexShrink: 0,
                }}>
                  🏛
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.white, letterSpacing: '-0.2px' }}>
                  Adamawa State<br />Mass Education Board
                </div>
              </div>
              <p style={{
                fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.35)',
                maxWidth: 300,
              }}>
                Providing quality mass education services to all citizens
                across 21 LGAs of Adamawa State. Established under the
                Adamawa State Ministry of Education.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{
                fontSize: 10, fontWeight: 700, color: colors.gold,
                textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
              }}>
                Quick Links
              </h4>
              {['Home', 'About Us', 'Programs', 'News', 'Contact'].map(link => (
                <a
                  key={link}
                  onClick={() => handleScroll(link.toLowerCase().replace(' ', ''))}
                  style={{
                    display: 'block', fontSize: 13, color: 'rgba(255,255,255,.4)',
                    padding: '4px 0', cursor: 'pointer', transition: 'all .2s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = colors.goldLight; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {link}
                </a>
              ))}
            </div>

            {/* Resources */}
            <div>
              <h4 style={{
                fontSize: 10, fontWeight: 700, color: colors.gold,
                textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
              }}>
                Resources
              </h4>
              {['Gallery', 'Downloads', 'Privacy Policy', 'Terms of Service', 'Sitemap'].map(link => (
                <a
                  key={link}
                  onClick={() => handleScroll(link.toLowerCase())}
                  style={{
                    display: 'block', fontSize: 13, color: 'rgba(255,255,255,.4)',
                    padding: '4px 0', cursor: 'pointer', transition: 'all .2s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = colors.goldLight; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {link}
                </a>
              ))}
            </div>

            {/* Staff Access */}
            <div>
              <h4 style={{
                fontSize: 10, fontWeight: 700, color: colors.gold,
                textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
              }}>
                Staff Access
              </h4>
              <button
                onClick={onGoToLogin}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px',
                  background: `linear-gradient(145deg, ${colors.gold}, ${colors.goldLight})`,
                  color: colors.navy,
                  borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  transition: 'all .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px rgba(201,149,44,.3)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                🔒 Staff Portal
              </button>
              <p style={{
                fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 12,
                lineHeight: 1.6,
              }}>
                Authorized personnel only.<br />
                Employee Management System.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,.05)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 12,
            color: 'rgba(255,255,255,.2)',
          }}>
            <span>© 2026 Adamawa State Mass Education Board. All rights reserved.</span>
            <span>Powered by EMIS — Education Management Information System</span>
          </div>
        </div>
      </footer>
      </FadeIn>
    </div>
  );
}
