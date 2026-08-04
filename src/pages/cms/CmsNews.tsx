import { useState, useEffect, useCallback } from 'react';
import { CmsListManager } from '@/components/cms/CmsListManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { dbLoadNews, dbSaveNewsArticle, dbDeleteNews } from '@/supabase/cms';
import { clearCmsCache } from '@/hooks/useCmsData';
import type { CmsNews } from '@/types';

export function CmsNews() {
  const [items, setItems] = useState<CmsNews[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadNews();
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Omit<CmsNews, 'id' | 'sort_order'>) => {
    const result = await dbSaveNewsArticle({ ...data, sort_order: items.length });
    clearCmsCache();
    return result;
  };

  const handleUpdate = async (id: string, data: Partial<CmsNews>) => {
    const result = await dbSaveNewsArticle({ id, ...data } as CmsNews);
    clearCmsCache();
    return result;
  };

  const handleReorder = async (reordered: CmsNews[]) => {
    let ok = true;
    for (const item of reordered) {
      const { error } = await dbSaveNewsArticle(item);
      if (error) ok = false;
    }
    clearCmsCache();
    return ok;
  };

  return (
    <CmsListManager
      title="News & Announcements"
      subtitle="Manage news articles displayed on the public website"
      icon="📰"
      items={items}
      loading={loading}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={async (id) => dbDeleteNews(id)}
      onReorder={handleReorder}
      searchPlaceholder="Search news…"
      renderItem={(n) => (
        <span><span className="mr-2">{n.icon}</span><strong>{n.title}</strong><span className="text-muted-foreground ml-2">— {n.excerpt}</span><span className="text-xs text-muted-foreground ml-2">{n.date}</span></span>
      )}
      renderForm={({ item, onSave }) => (
        <NewsForm item={item} onSave={onSave} />
      )}
    />
  );
}

function NewsForm({ item, onSave }: { item: Partial<CmsNews> | null; onSave: (data: Partial<CmsNews>) => Promise<boolean> }) {
  const [title, setTitle] = useState(item?.title || '');
  const [excerpt, setExcerpt] = useState(item?.excerpt || '');
  const [body, setBody] = useState(item?.body || '');
  const [date, setDate] = useState(item?.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [icon, setIcon] = useState(item?.icon || '📰');
  const [image, setImage] = useState(item?.image || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), excerpt: excerpt.trim(), body: body.trim(), date, icon, image: image || undefined });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="News headline" />
      </div>
      <div className="space-y-1.5">
        <Label>Excerpt <span className="text-muted-foreground font-normal">(shown on the landing page card)</span></Label>
        <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} placeholder="Brief summary…" />
      </div>
      <div className="space-y-1.5">
        <Label>Article Body <span className="text-muted-foreground font-normal">(shown on the Read more page)</span></Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Full article text…&#10;Use blank lines between paragraphs and start lines with '- ' for bullet points." />
        <p className="text-[11px] text-muted-foreground">Paragraphs separated by blank lines; lines starting with “- ” render as bullets on the article page.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. March 15, 2026" />
      </div>
      <div className="space-y-1.5">
        <Label>Icon</Label>
        <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="📰" />
      </div>
      <div className="space-y-1.5">
        <ImageUpload
          label="Image"
          folder="news"
          maxDim={1000}
          value={image}
          onChange={v => setImage(v || '')}
          hint="Optional thumbnail — replaces the icon banner on the public site"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="gold" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : item?.id ? '💾 Save Changes' : '➕ Add Article'}
        </Button>
      </div>
    </div>
  );
}
