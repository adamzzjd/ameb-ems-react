import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PublicPageHeader, PublicShell } from '@/components/layout/PublicShell';
import { dbLoadPublicCentres } from '@/supabase/enrolments';
import { paths, slugify, findBySlug } from '@/lib/slug';
import { usePageMeta } from '@/hooks/usePageMeta';
import { telHref } from '@/lib/contact';
import { centreJsonLd, breadcrumbJsonLd, jsonLdGraph } from '@/lib/seo';
import type { PublicCentre } from '@/types';
import {
  Building2, ChevronLeft, ChevronRight, MapPin, Phone, UserCheck, Users,
} from 'lucide-react';

/**
 * Public centre detail page — one shareable URL per learning centre.
 *
 * Reads the same safe `public_centres` view as the directory (approved centres
 * only, never internal remarks), so a visitor can open the link cold.
 */
export function CentreDetailPage() {
  const { slug = '' } = useParams();
  const [centres, setCentres] = useState<PublicCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await dbLoadPublicCentres();
      if (!active) return;
      if (!res.error && res.data) setCentres(res.data);
      else setLoadFailed(true);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const centre = useMemo(
    () => findBySlug(centres, slug, c => c.name),
    [centres, slug]
  );

  usePageMeta({
    title: centre?.name ?? 'Learning Centre',
    description: centre
      ? `${centre.name} — a learning centre in ${[centre.ward, centre.community, centre.lga].filter(Boolean).join(', ')} under the Adamawa State Mass Education Board.`
      : 'Find a learning centre in Adamawa State.',
    path: paths.centre(slug),
    jsonLd: centre
      ? jsonLdGraph(
          centreJsonLd({
            name: centre.name,
            path: paths.centre(slug),
            lga: centre.lga,
            ward: centre.ward,
            phone: centre.phone,
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: paths.home },
            { name: 'Learning Centres', path: paths.centres },
            { name: centre.name, path: paths.centre(slug) },
          ]),
        )
      : undefined,
  });

  if (loading) {
    return (
      <CentreShell>
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
          Loading centre…
        </div>
      </CentreShell>
    );
  }

  if (!centre) {
    return (
      <CentreShell>
        <div className="max-w-[560px] mx-auto text-center py-20">
          <div className="text-4xl mb-3">{loadFailed ? '📍' : '🔍'}</div>
          <h2 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {loadFailed ? 'Centre directory unavailable' : 'Centre not found'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {loadFailed
              ? "The centre directory isn't available right now. Please try again later."
              : 'This centre may have been renamed or is no longer listed. Browse the directory to find a learning centre near you.'}
          </p>
          <Link to={paths.centres}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-on-primary"
            style={{ background: 'var(--color-primary)' }}>
            <ChevronLeft size={15} /> All learning centres
          </Link>
        </div>
      </CentreShell>
    );
  }

  const nearby = centres
    .filter(c => c.id !== centre.id && c.lga === centre.lga)
    .slice(0, 3);
  const address = [centre.ward, centre.community, centre.lga].filter(Boolean).join(', ');

  return (
    <CentreShell>
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[900px] mx-auto">
          <div className="rounded-2xl border p-8 md:p-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-start gap-4 mb-6">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-on-primary"
                style={{ background: 'var(--color-primary)' }}>
                <Building2 size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {centre.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {centre.centre_code && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
                      style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' }}>
                      {centre.centre_code}
                    </span>
                  )}
                  {centre.type && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                      {centre.type}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                    {centre.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Location + contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={<MapPin size={15} />} label="Location" value={address || centre.lga} />
              <DetailRow icon={<Users size={15} />} label="Capacity"
                value={centre.capacity != null && centre.capacity > 0
                  ? `${centre.capacity.toLocaleString()} learners`
                  : 'Not specified'} />
              {centre.phone && (
                <DetailRow icon={<Phone size={15} />} label="Phone"
                  value={telHref(centre.phone)
                    ? <a href={telHref(centre.phone)!} className="underline-offset-2 hover:underline" style={{ color: 'var(--color-primary)' }}>{centre.phone}</a>
                    : centre.phone} />
              )}
              <DetailRow icon={<Building2 size={15} />} label="Operated by"
                value={[humaniseOwner(centre.owner_type), centre.partner_name ? `with ${centre.partner_name}` : null]
                  .filter(Boolean).join(' ') || 'Not specified'} />
            </div>

            {/* Facilitators */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-heading text-base font-bold mb-3 inline-flex items-center gap-2"
                style={{ color: 'var(--color-text-primary)' }}>
                <UserCheck size={16} style={{ color: 'var(--color-primary)' }} />
                Facilitators
              </h3>
              {centre.facilitators.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {centre.facilitators.map(name => (
                    <li key={name} className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No facilitator is currently listed for this centre.
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t flex flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <Link to={paths.centres}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-on-primary transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-primary)' }}>
                <ChevronLeft size={15} /> All Learning Centres
              </Link>
              <Link to={`${paths.home}#enroll`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
                <MapPin size={15} /> Enquire about enrolling
              </Link>
            </div>
          </div>

          {/* Other centres in the same LGA */}
          {nearby.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                More centres in {centre.lga}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nearby.map(c => (
                  <Link key={c.id} to={paths.centre(slugify(c.name))}
                    className="rounded-xl border p-5 transition-all card-hover block"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="font-heading text-[14px] font-bold mb-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {c.name}
                    </div>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {[c.ward, c.community, c.lga].filter(Boolean).join(', ')}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold uppercase tracking-[1px]" style={{ color: 'var(--color-primary)' }}>
                      View centre <ChevronRight size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </CentreShell>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px]">
      <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
      </span>
    </div>
  );
}

/** 'Government' → 'Government', 'ngo_partner' → 'NGO partner'. */
function humaniseOwner(ownerType: string): string {
  return ownerType
    .replace(/_/g, ' ')
    .replace(/\bngo\b/gi, 'NGO')
    .replace(/^./, ch => ch.toUpperCase());
}

/** Shell that keeps the page header visible even while loading / not found. */
function CentreShell({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <PublicPageHeader
        tag="Learning Centre"
        title="Centre Details"
        sub={undefined}
      />
      <section className="px-6 py-10">{children}</section>
    </PublicShell>
  );
}
