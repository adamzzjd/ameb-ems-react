import { Link } from 'react-router';
import { useCmsData } from '@/hooks/useCmsData';
import { PublicPageHeader, PublicShell } from '@/components/layout/PublicShell';
import { paths, slugify } from '@/lib/slug';
import { ChevronRight } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format an ISO date (YYYY-MM-DD) as "12 Mar 2026" without timezone drift. */
function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Public news & announcements listing — every article links to its own page. */
export function NewsPage() {
  const { news, site_content } = useCmsData();
  const sorted = [...news].sort((a, b) => b.sort_order - a.sort_order || b.date.localeCompare(a.date));

  return (
    <PublicShell>
      <PublicPageHeader tag={site_content.news_tag} title={site_content.news_title} sub={site_content.news_sub} />

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📰</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No announcements have been published yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sorted.map((article, i) => (
                <Link key={article.id} to={paths.newsArticle(slugify(article.title))}
                  className="rounded-2xl overflow-hidden h-full border card-hover flex flex-col"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="h-[140px] relative flex items-center justify-center"
                    style={{ background: `var(--color-${['primary', 'gold', 'terracotta'][i % 3]})` }}>
                    {article.image ? (
                      <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{article.icon}</span>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-primary text-[10px] font-bold tracking-wider border"
                      style={{ borderColor: 'var(--color-border)' }}>{formatDate(article.date)}</span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="font-heading text-[15px] font-bold mb-2 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {article.title}
                    </h2>
                    <p className="text-[13px] leading-relaxed mb-4 flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {article.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[1.1px]" style={{ color: 'var(--color-primary)' }}>
                      Read more <ChevronRight size={13} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
