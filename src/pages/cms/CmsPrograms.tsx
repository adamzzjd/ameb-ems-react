import { useState, useEffect, useCallback } from 'react';
import { CmsListManager } from '@/components/cms/CmsListManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { dbLoadPrograms, dbSaveProgram, dbDeleteProgram } from '@/supabase/cms';
import { clearCmsCache } from '@/hooks/useCmsData';
import type { CmsProgram } from '@/types';

export function CmsPrograms() {
  const [items, setItems] = useState<CmsProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadPrograms();
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Omit<CmsProgram, 'id' | 'sort_order'>) => {
    const result = await dbSaveProgram({ ...data, details: data.details || '', sort_order: items.length });
    clearCmsCache();
    return result;
  };

  const handleUpdate = async (id: string, data: Partial<CmsProgram>) => {
    const result = await dbSaveProgram({ id, ...data } as CmsProgram);
    clearCmsCache();
    return result;
  };

  const handleReorder = async (reordered: CmsProgram[]) => {
    let ok = true;
    for (const item of reordered) {
      const { error } = await dbSaveProgram(item);
      if (error) ok = false;
    }
    clearCmsCache();
    return ok;
  };

  return (
    <CmsListManager
      title="Programs"
      subtitle="Manage education programs displayed on the website"
      icon="📚"
      items={items}
      loading={loading}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={async (id) => dbDeleteProgram(id)}
      onReorder={handleReorder}
      searchPlaceholder="Search programs…"
      renderItem={(p) => (
        <span><span className="mr-2">{p.icon}</span><strong>{p.title}</strong><span className="text-muted-foreground ml-2">— {p.description}</span></span>
      )}
      renderForm={({ item, onSave }) => (
        <ProgramForm item={item} onSave={onSave} />
      )}
    />
  );
}

function ProgramForm({ item, onSave }: { item: Partial<CmsProgram> | null; onSave: (data: Partial<CmsProgram>) => Promise<boolean> }) {
  const [title, setTitle] = useState(item?.title || '');
  const [icon, setIcon] = useState(item?.icon || '📖');
  const [description, setDescription] = useState(item?.description || '');
  const [details, setDetails] = useState(item?.details || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), icon, description: description.trim(), details: details.trim() });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Program Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Adult Literacy" />
      </div>
      <div className="space-y-1.5">
        <Label>Icon</Label>
        <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="📖" />
      </div>
      <div className="space-y-1.5">
        <Label>Short Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description shown on the landing page card…" />
      </div>
      <div className="space-y-1.5">
        <Label>Full Details <span className="text-muted-foreground font-normal">(shown on the Learn more page)</span></Label>
        <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={8} placeholder="Full programme information…&#10;Use blank lines between paragraphs and start lines with '- ' for bullet points." />
        <p className="text-[11px] text-muted-foreground">Paragraphs separated by blank lines; lines starting with “- ” render as bullets on the detail page.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="gold" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : item?.id ? '💾 Save Changes' : '➕ Add Program'}
        </Button>
      </div>
    </div>
  );
}
