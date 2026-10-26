import { Link, useLocation } from 'react-router';
import { PublicShell } from '@/components/layout/PublicShell';
import { usePageMeta } from '@/hooks/usePageMeta';
import { paths } from '@/lib/slug';
import { ChevronLeft, Home, MapPin } from 'lucide-react';

/**
 * Public 404. Unknown paths used to fall through to the landing page, so a
 * mistyped or dead link silently looked like the home page.
 *
 * Note: Vercel serves the SPA shell for every path, so the HTTP status is still
 * 200 — the visitor gets a clear "page not found" screen instead of a wrong page.
 */
export function PublicNotFound() {
  const { pathname } = useLocation();

  usePageMeta({ title: 'Page not found', path: pathname, noindex: true });

  return (
    <PublicShell>
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-[620px] mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' }}
          >
            Error 404
          </div>
          <h1 className="font-heading text-[30px] sm:text-[38px] font-bold leading-tight mb-4"
            style={{ color: 'var(--color-text-primary)' }}>
            Page not found
          </h1>
          <p className="text-sm md:text-base leading-relaxed mb-3"
            style={{ color: 'var(--color-text-secondary)' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-[12px] mb-8 break-all" style={{ color: 'var(--color-text-muted)' }}>
            <code>{pathname}</code>
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Link to={paths.home}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-on-primary transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--color-primary)' }}>
              <Home size={15} /> Back to home
            </Link>
            <Link to={paths.centres}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
              <MapPin size={15} /> Find a learning centre
            </Link>
          </div>

          <div className="rounded-2xl border p-6 text-left"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-text-muted)' }}>
              Popular pages
            </p>
            <ul className="space-y-2 text-sm">
              {[
                { to: paths.programs, label: 'Programmes' },
                { to: paths.centres, label: 'Learning centres' },
                { to: paths.news, label: 'News & announcements' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                    style={{ color: 'var(--color-primary)' }}>
                    <ChevronLeft size={13} className="rotate-180" /> {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[12px] mt-8" style={{ color: 'var(--color-text-muted)' }}>
            Looking for the staff register? <Link to={paths.login} className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
              Sign in to the staff portal
            </Link>.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
