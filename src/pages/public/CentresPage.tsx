import { useMemo, useState } from 'react';
import { useCmsData } from '@/hooks/useCmsData';
import { PublicPageHeader, PublicShell } from '@/components/layout/PublicShell';
import { dbLoadPublicCentres } from '@/supabase/enrolments';
import { mergeLgas } from '@/data/constants';
import type { PublicCentre } from '@/types';
import { MapPin, Phone, Search, Users } from 'lucide-react';
import { useEffect } from 'react';

/** Public centre directory — a standalone page version of the Landing directory. */
export function CentresPage() {
  const { site_content } = useCmsData();
  const [centres, setCentres] = useState<PublicCentre[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lgaFilter, setLgaFilter] = useState('');

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

  const lgas = useMemo(
    () => mergeLgas(centres.map(c => c.lga).filter((v): v is string => Boolean(v))).sort((a, b) => a.localeCompare(b)),
    [centres]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centres.filter(c => {
      if (lgaFilter && c.lga !== lgaFilter) return false;
      if (!q) return true;
      return [c.name, c.lga, c.ward, c.community, c.type, c.partner_name]
        .some(v => (v ?? '').toLowerCase().includes(q));
    });
  }, [centres, search, lgaFilter]);

  return (
    <PublicShell>
      <PublicPageHeader
        tag="Learning Centres"
        title="Find a Learning Centre"
        sub="The Board, local governments and NGO partners run learning centres across all 21 LGAs of Adamawa State. Search by name, ward, community or LGA."
      />

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto">
          {/* Search + LGA filter */}
          <div className="mb-8">
            <div className="relative max-w-xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search centres by name, ward, community or type…"
                aria-label="Search learning centres"
                className="w-full h-12 pl-11 pr-4 rounded-xl border text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => setLgaFilter('')}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-colors"
                style={{
                  background: lgaFilter === '' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: lgaFilter === '' ? '#fff' : 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border)',
                }}>
                All LGAs
              </button>
              {lgas.map(lga => (
                <button key={lga} onClick={() => setLgaFilter(lgaFilter === lga ? '' : lga)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-colors"
                  style={{
                    background: lgaFilter === lga ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: lgaFilter === lga ? '#fff' : 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)',
                  }}>
                  {lga}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
              Loading centres…
            </div>
          ) : loadFailed && centres.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                The centre directory isn't available right now. Please try again later.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No centres match your search{search || lgaFilter ? ' — try a different name or LGA' : ' yet'}.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {centres.length} centres
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(centre => (
                  <div key={centre.id}
                    className="rounded-2xl border p-6 card-hover flex flex-col"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h2 className="font-heading text-[15px] font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                        {centre.name}
                      </h2>
                      {centre.centre_code && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                          style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' }}>
                          {centre.centre_code}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                        <span>{[centre.ward, centre.community, centre.lga].filter(Boolean).join(', ') || centre.lga}</span>
                      </div>
                      {centre.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                          <span>{centre.phone}</span>
                        </div>
                      )}
                      {centre.capacity != null && centre.capacity > 0 && (
                        <div className="flex items-center gap-2">
                          <Users size={14} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                          <span>Capacity: {centre.capacity.toLocaleString()} learners</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {centre.type && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                          {centre.type}
                        </span>
                      )}
                      {centre.partner_name && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                          Partner: {centre.partner_name}
                        </span>
                      )}
                      {centre.facilitators.slice(0, 2).map(f => (
                        <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-secondary)' }}>
                          Facilitator: {f}
                        </span>
                      ))}
                      {centre.facilitators.length > 2 && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' }}>
                          +{centre.facilitators.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Enrolment CTA */}
          <div className="mt-12 rounded-2xl border p-8 text-center"
            style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Want to enrol yourself or your child?
            </h3>
            <p className="text-sm mb-5 max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              Submit a short enquiry and the Board will match you with the nearest centre and follow up with you.
            </p>
            <a href="/#enroll"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
              <MapPin size={16} /> Start an Enquiry
            </a>
            <p className="text-[12px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
              {site_content.phone ? `Questions? Call us on ${site_content.phone}` : ''}
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
