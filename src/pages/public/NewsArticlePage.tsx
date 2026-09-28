import { Link, useParams } from 'react-router';
import { useCmsData } from '@/hooks/useCmsData';
import { PublicPageHeader, PublicShell, RichText } from '@/components/layout/PublicShell';
import { paths, slugify, findBySlug } from '@/lib/slug';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Public news article page — one shareable URL per announcement. */
export function NewsArticlePage() {
  const { slug = '' } = useParams();
  const { news, loading } = useCmsData();
  const article = findBySlug(news, slug, a => a.title);

  if (!loading && !article) {
    return (
      <ArticleShell>
        <div className="max-w-[560px] mx-auto text-center py-20">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Article not found
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            This announcement may have been renamed or removed.
          </p>
          <Link to={paths.news}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)' }}>
            <ChevronLeft size={15} /> All announcements
          </Link>
        </div>
      </ArticleShell>
    );
  }

  if (!article) {
    return (
      <ArticleShell>
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
          Loading article…
        </div>
      </ArticleShell>
    );
  }

  const others = news.filter(a => a.id !== article.id).slice(0, 3);

  return (
    <ArticleShell>
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-[860px] mx-auto">
          <article className="rounded-2xl border p-8 md:p-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 text-white"
                style={{ background: 'var(--color-primary)' }}>
                {article.icon || '📰'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[1px]"
                style={{ background: 'var(--color-surface-warm)', color: 'var(--color-primary)' }}>
                Announcement
              </span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {formatDate(article.date)}
              </span>
            </div>

            <h1 className="font-heading text-[24px] sm:text-[32px] font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
              {article.title}
            </h1>
            <p className="text-[15px] leading-relaxed mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              {article.excerpt}
            </p>

            {article.image && (
              <div className="rounded-xl overflow-hidden my-7 border" style={{ borderColor: 'var(--color-border)' }}>
                <img src={article.image} alt={article.title} className="w-full max-h-[380px] object-cover" />
              </div>
            )}

            {hasContent(article.body) ? (
              <div className="mt-6">
                <RichText text={article.body!} />
              </div>
            ) : null}

            <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <Link to={paths.news}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--color-primary)' }}>
                <ChevronLeft size={15} /> All News
              </Link>
              <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>AMEB — News &amp; Announcements</span>
            </div>
          </article>

          {/* More announcements */}
          {others.length > 0 && (
            <div className="mt-12">
              <h3 className="font-heading text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                More Announcements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {others.map(a => (
                  <Link key={a.id} to={paths.newsArticle(slugify(a.title))}
                    className="rounded-xl border p-5 transition-all card-hover block"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{formatDate(a.date)}</span>
                    </div>
                    <div className="font-heading text-[14px] font-bold mb-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>{a.title}</div>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{a.excerpt}</p>
                    <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold uppercase tracking-[1px]" style={{ color: 'var(--color-primary)' }}>
                      Read more <ChevronRight size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </ArticleShell>
  );
}

/** Shell that keeps the page header visible even while loading / not found. */
function ArticleShell({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <PublicPageHeader tag="News & Announcements" title="Announcement" />
      <section className="px-6 py-10">{children}</section>
    </PublicShell>
  );
}

function hasContent(v: string | undefined | null): boolean {
  return Boolean(v && v.trim().length > 0);
}
