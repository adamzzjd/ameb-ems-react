import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { dbLoadPrograms, dbLoadNews, dbLoadTeam, dbLoadGallery, dbLoadDownloads, dbLoadContacts } from '@/supabase/cms';

interface CmsDashboardProps {
  onNavigate: (page: string) => void;
}

export function CmsDashboard({ onNavigate }: CmsDashboardProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    programs: 0, news: 0, team: 0, gallery: 0, downloads: 0, contacts: 0, unread: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, n, t, g, d, c] = await Promise.all([
        dbLoadPrograms(), dbLoadNews(), dbLoadTeam(),
        dbLoadGallery(), dbLoadDownloads(), dbLoadContacts(),
      ]);
      setStats({
        programs: p.data?.length || 0,
        news: n.data?.length || 0,
        team: t.data?.length || 0,
        gallery: g.data?.length || 0,
        downloads: d.data?.length || 0,
        contacts: c.data?.length || 0,
        unread: c.data?.filter(x => !x.read).length || 0,
      });
      setLoading(false);
      const total = (p.data?.length || 0) + (n.data?.length || 0) + (t.data?.length || 0) + (g.data?.length || 0) + (d.data?.length || 0) + (c.data?.length || 0);
      toast(`📊 Loaded ${total} CMS items`);
    }
    load();
  }, []);

  const sections = [
    { page: 'cms-content', icon: '⚙️', title: 'Site Content', sub: 'Hero, About, Mission, Vision, contact details', action: 'Edit →' },
    { page: 'cms-programs', icon: '📚', title: 'Programs', sub: `${stats.programs} program${stats.programs !== 1 ? 's' : ''} configured`, action: 'Manage →' },
    { page: 'cms-news', icon: '📰', title: 'News & Announcements', sub: `${stats.news} article${stats.news !== 1 ? 's' : ''} published`, action: 'Manage →' },
    { page: 'cms-team', icon: '👥', title: 'Team / Leadership', sub: `${stats.team} team member${stats.team !== 1 ? 's' : ''}`, action: 'Manage →' },
    { page: 'cms-gallery', icon: '🖼', title: 'Gallery', sub: `${stats.gallery} item${stats.gallery !== 1 ? 's' : ''} in gallery`, action: 'Manage →' },
    { page: 'cms-downloads', icon: '📥', title: 'Downloads', sub: `${stats.downloads} resource${stats.downloads !== 1 ? 's' : ''} available`, action: 'Manage →' },
    { page: 'cms-inbox', icon: '✉️', title: 'Contact Inbox', sub: `${stats.contacts} message${stats.contacts !== 1 ? 's' : ''}${stats.unread > 0 ? ` · ${stats.unread} unread` : ''}`, action: `View ${stats.unread > 0 ? `(${stats.unread})` : ''}→` },
    { page: 'cms-enrolments', icon: '📈', title: 'Enrolment Stats', sub: 'Per-year learner figures & NGO partners', action: 'Manage →' },
  ];

  if (loading) {
    return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-navy">📝 Website Content Manager</h2>
          <p className="text-sm text-muted-foreground">Manage all content displayed on the public website</p>
        </div>
        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
          👁 Preview Website
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(s => (
          <Card
            key={s.page}
            className="card-hover cursor-pointer border-border"
            onClick={() => onNavigate(s.page)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center text-lg shrink-0">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-navy mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className="text-xs font-semibold text-gold shrink-0">{s.action}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-xl">💾</span>
          <span className="flex-1 text-sm font-medium text-muted-foreground">Backup &amp; Restore</span>
          <Button variant="outline" size="sm" disabled>📤 Export JSON</Button>
          <Button variant="outline" size="sm" disabled>📥 Import JSON</Button>
        </CardContent>
      </Card>
    </div>
  );
}
