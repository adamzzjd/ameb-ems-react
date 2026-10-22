import { Link } from 'react-router';
import { useCmsData } from '@/hooks/useCmsData';
import { PublicPageHeader, PublicShell } from '@/components/layout/PublicShell';
import { paths, slugify } from '@/lib/slug';
import { BookOpen, ChevronRight, MapPin } from 'lucide-react';

/** Public programme catalogue — every programme links to its own shareable page. */
export function ProgramsPage() {
  const { programs, site_content } = useCmsData();
  const sorted = [...programs].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <PublicShell>
      <PublicPageHeader
        tag={site_content.programs_tag}
        title={site_content.programs_title}
        sub={site_content.programs_sub}
      />

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Programmes will appear here once published.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sorted.map(program => (
                <Link key={program.id} to={paths.program(slugify(program.title))}
                  className="rounded-2xl overflow-hidden h-full border card-hover flex flex-col"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  {program.image ? (
                    <div className="h-[150px] relative overflow-hidden">
                      <img src={program.image} alt={program.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)' }} />
                    </div>
                  ) : (
                    <div className="px-7 pt-7">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>
                        {program.icon ? <span className="text-xl">{program.icon}</span> : <BookOpen size={20} />}
                      </div>
                    </div>
                  )}
                  <div className="p-7 flex-1 flex flex-col">
                    <h2 className="font-heading text-base font-bold mb-2.5"
                      style={{ color: 'var(--color-text-primary)' }}>{program.title}</h2>
                    <p className="text-[13px] leading-relaxed mb-4 flex-1"
                      style={{ color: 'var(--color-text-secondary)' }}>{program.description}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[1.1px]"
                      style={{ color: 'var(--color-primary)' }}>
                      Learn more <ChevronRight size={13} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-2xl border p-8 text-center"
            style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Ready to start learning?
            </h3>
            <p className="text-sm mb-5 max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              Find the learning centre nearest to you — centres are run by the Board, local
              governments and NGO partners across all 21 LGAs.
            </p>
            <Link to={paths.centres}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-gold-fg)' }}>
              <MapPin size={16} /> Find a Learning Centre
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
