/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useCmsData } from '@/hooks/useCmsData';
import { syncFaviconFromLogo } from '@/lib/favicon';
import { paths } from '@/lib/slug';
import { GraduationCap, MapPin, Phone, Mail, Lock, Menu, X, ArrowLeft } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: paths.home },
  { label: 'Programs', to: paths.programs },
  { label: 'Learning Centres', to: paths.centres },
  { label: 'News', to: paths.news },
  { label: 'About', to: '/#about' },
  { label: 'Contact', to: '/#contact' },
];

/**
 * Header + footer wrapper for the public sub-pages (programmes, centres, news).
 * The single-page Landing keeps its own richer header; this shell is the
 * multi-page equivalent.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const { site_content } = useCmsData();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { syncFaviconFromLogo(site_content.logo_url); }, [site_content.logo_url]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to !== '/' && !to.includes('#') && location.pathname.startsWith(to);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Government bar */}
      <div className="text-[11px] font-semibold tracking-wide text-white"
        style={{ background: 'var(--color-primary-dark)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-2 flex items-center justify-between gap-4">
          <span className="truncate">Adamawa State Government · Ministry of Education</span>
          <Link to={paths.selfService} className="shrink-0 inline-flex items-center gap-1.5 hover:underline">
            <Lock size={11} /> Staff PSN
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between gap-4">
          <Link to={paths.home} className="flex items-center gap-3 min-w-0">
            {site_content.logo_url ? (
              <img src={site_content.logo_url} alt="AMEB logo" className="w-10 h-10 object-contain shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-gold)' }}>
                <GraduationCap size={20} style={{ color: 'var(--color-primary-dark)' }} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-heading text-sm font-bold leading-tight truncate"
                style={{ color: 'var(--color-text-primary)' }}>
                Adamawa State Mass Education Board
              </span>
              <span className="block text-[10px] font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Ilimi Don Kowa
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to}
                className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors hover:bg-surface-warm"
                style={{
                  color: isActive(link.to) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}>
                {link.label}
              </Link>
            ))}
            <Link to={paths.login}
              className="ml-2 px-4 py-2 rounded-lg text-[13px] font-bold"
              style={{ background: 'var(--color-primary)', color: '#fff' }}>
              Staff Portal
            </Link>
          </nav>

          <button className="lg:hidden p-2 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="lg:hidden border-t px-6 py-3 flex flex-col gap-1"
            style={{ borderColor: 'var(--color-border)' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: 'var(--color-text-secondary)' }}>
                {link.label}
              </Link>
            ))}
            <Link to={paths.login} className="px-3 py-2.5 rounded-lg text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
              Staff Portal →
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t" style={{ background: 'var(--color-primary-dark)', borderColor: 'transparent' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="font-heading text-sm font-bold text-white mb-3">Adamawa State Mass Education Board</div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {site_content.about_sub}
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-3">Contact</div>
            <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <li className="flex gap-2"><MapPin size={13} className="shrink-0 mt-0.5" /> {site_content.address}</li>
              <li className="flex gap-2"><Phone size={13} className="shrink-0 mt-0.5" /> {site_content.phone}</li>
              <li className="flex gap-2"><Mail size={13} className="shrink-0 mt-0.5" /> {site_content.email}</li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-3">Explore</div>
            <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <li><Link to={paths.programs} className="hover:underline">Programs</Link></li>
              <li><Link to={paths.centres} className="hover:underline">Find a Learning Centre</Link></li>
              <li><Link to={paths.news} className="hover:underline">News &amp; Announcements</Link></li>
              <li><Link to={paths.login} className="hover:underline">Staff Portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="max-w-[1200px] mx-auto px-6 py-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} Adamawa State Mass Education Board. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Page banner used by every public sub-page for a consistent look. */
export function PublicPageHeader({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <section className="px-6 pt-12 pb-8 md:pt-16 md:pb-10" style={{ background: 'var(--color-surface-warm)' }}>
      <div className="max-w-[1200px] mx-auto">
        <Link to={paths.home}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-4 transition-colors hover:underline"
          style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={12} /> Back to home
        </Link>
        <div className="govt-badge mb-4">
          <span className="w-2 h-2 rounded-full bg-gold" />
          {tag}
        </div>
        <h1 className="font-heading text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-tight tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h1>
        {sub && (
          <p className="text-sm md:text-base mt-4 max-w-2xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {sub}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Render CMS copy safely — plain text with `\n` paragraphs and `- ` bullets.
 * Deliberately does NOT use dangerouslySetInnerHTML: headings are editable by
 * admins, and rendering their raw HTML opens an XSS hole on the public site.
 */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1.5 mb-4">
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    );
    bullets = [];
  };

  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(`ul-${i}`); return; }
    if (line.startsWith('- ')) { bullets.push(line.slice(2)); return; }
    flush(`ul-${i}`);
    blocks.push(<p key={`p-${i}`} className="leading-relaxed mb-4">{line}</p>);
  });
  flush('ul-end');

  return <div className="text-sm md:text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>{blocks}</div>;
}
