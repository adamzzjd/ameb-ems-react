import { Link, useParams } from 'react-router';
import { useCmsData } from '@/hooks/useCmsData';
import { PublicPageHeader, PublicShell, RichText } from '@/components/layout/PublicShell';
import { paths, slugify, findBySlug } from '@/lib/slug';
import { BookOpen, ChevronLeft, ChevronRight, MapPin, GraduationCap } from 'lucide-react';

/** Public programme detail page — one shareable URL per programme. */
export function ProgramDetailPage() {
  const { slug = '' } = useParams();
  const { programs, loading } = useCmsData();
  const program = findBySlug(programs, slug, p => p.title);

  if (!loading && !program) {
    return (
      <ProgramDetailShell>
        <div className="max-w-[560px] mx-auto text-center py-20">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Programme not found
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            The programme you're looking for may have been renamed or removed.
          </p>
          <Link to={paths.programs}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)' }}>
            <ChevronLeft size={15} /> Browse all programmes
          </Link>
        </div>
      </ProgramDetailShell>
    );
  }

  if (!program) {
    return (
      <ProgramDetailShell>
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
          Loading programme…
        </div>
      </ProgramDetailShell>
    );
  }

  const others = programs.filter(p => p.id !== program.id).slice(0, 3);

  return (
    <ProgramDetailShell>
      {/* Programme hero */}
      {program.image && (
        <section className="max-w-[1200px] mx-auto px-6 pt-10">
          <div className="rounded-2xl overflow-hidden border max-h-[380px]" style={{ borderColor: 'var(--color-border)' }}>
            <img src={program.image} alt={program.title} className="w-full max-h-[380px] object-cover" />
          </div>
        </section>
      )}

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[900px] mx-auto">
          <div className="rounded-2xl border p-8 md:p-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-start gap-4 mb-6">
              {program.image ? null : (
                <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{ background: 'var(--color-primary)' }}>
                  {program.icon ? <span className="text-xl">{program.icon}</span> : <GraduationCap size={22} />}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-heading text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  About this programme
                </h2>
              </div>
            </div>

            {hasContent(program.details) ? (
              <RichText text={program.details!} />
            ) : (
              <p className="text-sm md:text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {program.description}
              </p>
            )}

            <div className="mt-8 pt-6 border-t flex flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <Link to={paths.programs}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-primary)' }}>
                <ChevronLeft size={15} /> All Programmes
              </Link>
              <Link to={paths.centres}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
                <MapPin size={15} /> Find a Learning Centre
              </Link>
            </div>
          </div>

          {/* Other programmes */}
          {others.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                Other Programmes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {others.map(p => (
                  <Link key={p.id} to={paths.program(slugify(p.title))}
                    className="rounded-xl overflow-hidden border transition-all card-hover block"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="px-5 pt-5 text-2xl" style={{ color: 'var(--color-primary)' }}>
                        {p.icon || <BookOpen size={22} />}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="font-heading text-[14px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{p.title}</div>
                      <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{p.description}</p>
                      <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold uppercase tracking-[1px]" style={{ color: 'var(--color-primary)' }}>
                        Learn more <ChevronRight size={12} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </ProgramDetailShell>
  );
}

/** Shell that keeps the page header visible even while loading / not found. */
function ProgramDetailShell({ children }: { children: React.ReactNode }) {
  const { site_content } = useCmsData();
  return (
    <PublicShell>
      <PublicPageHeader
        tag={site_content.programs_tag || 'AMEB Programme'}
        title="Programme Details"
        sub={undefined}
      >
      </PublicPageHeader>
      <section className="px-6 py-10">{children}</section>
    </PublicShell>
  );
}

function hasContent(v: string | undefined | null): boolean {
  return Boolean(v && v.trim().length > 0);
}
