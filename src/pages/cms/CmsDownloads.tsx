import { useState, useEffect, useCallback } from 'react';
import { CmsListManager } from '@/components/cms/CmsListManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dbLoadDownloads, dbSaveDownload, dbDeleteDownload } from '@/supabase/cms';
import { clearCmsCache } from '@/hooks/useCmsData';
import type { CmsDownload } from '@/types';

export function CmsDownloads() {
  const [items, setItems] = useState<CmsDownload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadDownloads();
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Omit<CmsDownload, 'id' | 'sort_order'>) => {
    const result = await dbSaveDownload({ ...data, sort_order: items.length });
    clearCmsCache();
    return result;
  };

  const handleUpdate = async (id: string, data: Partial<CmsDownload>) => {
    const result = await dbSaveDownload({ id, ...data } as CmsDownload);
    clearCmsCache();
    return result;
  };

  const handleReorder = async (reordered: CmsDownload[]) => {
    let ok = true;
    for (const item of reordered) {
      const { error } = await dbSaveDownload(item);
      if (error) ok = false;
    }
    clearCmsCache();
    return ok;
  };

  return (
    <CmsListManager
      title="Downloads & Resources"
      subtitle="Manage downloadable resources for staff and the public"
      icon="📥"
      items={items}
      loading={loading}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={async (id) => dbDeleteDownload(id)}
      onReorder={handleReorder}
      searchPlaceholder="Search downloads…"
      renderItem={(d) => (
        <span><span className="mr-2">{d.icon}</span><strong>{d.title}</strong><span className="text-muted-foreground ml-2">— {d.meta}</span></span>
      )}
      renderForm={({ item, onSave }) => (
        <DownloadForm item={item} onSave={onSave} />
      )}
    />
  );
}

function DownloadForm({ item, onSave }: { item: Partial<CmsDownload> | null; onSave: (data: Partial<CmsDownload>) => Promise<boolean> }) {
  const [title, setTitle] = useState(item?.title || '');
  const [meta, setMeta] = useState(item?.meta || '');
  const [icon, setIcon] = useState(item?.icon || '📄');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), meta: meta.trim(), icon });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Resource Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Staff Registration Form" />
      </div>
      <div className="space-y-1.5">
        <Label>Meta / File Info</Label>
        <Input value={meta} onChange={e => setMeta(e.target.value)} placeholder="e.g. PDF · 245KB · Updated 2026" />
      </div>
      <div className="space-y-1.5">
        <Label>Icon</Label>
        <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="📄" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="gold" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : item?.id ? '💾 Save Changes' : '➕ Add Resource'}
        </Button>
      </div>
    </div>
  );
}
