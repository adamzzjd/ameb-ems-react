import { useState, useEffect, useCallback } from 'react';
import { CmsListManager } from '@/components/cms/CmsListManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { dbLoadTeam, dbSaveTeamMember, dbDeleteTeamMember } from '@/supabase/cms';
import { clearCmsCache } from '@/hooks/useCmsData';
import type { CmsTeam } from '@/types';

export function CmsTeam() {
  const [items, setItems] = useState<CmsTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadTeam();
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Omit<CmsTeam, 'id' | 'sort_order'>) => {
    const result = await dbSaveTeamMember({ ...data, sort_order: items.length });
    clearCmsCache();
    return result;
  };

  const handleUpdate = async (id: string, data: Partial<CmsTeam>) => {
    const result = await dbSaveTeamMember({ id, ...data } as CmsTeam);
    clearCmsCache();
    return result;
  };

  const handleReorder = async (reordered: CmsTeam[]) => {
    let ok = true;
    for (const item of reordered) {
      const { error } = await dbSaveTeamMember(item);
      if (error) ok = false;
    }
    clearCmsCache();
    return ok;
  };

  return (
    <CmsListManager
      title="Team / Leadership"
      subtitle="Manage the leadership team displayed on the public website"
      icon="👥"
      items={items}
      loading={loading}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={async (id) => dbDeleteTeamMember(id)}
      onReorder={handleReorder}
      searchPlaceholder="Search team members…"
      renderItem={(t) => (
        <span className="inline-flex items-center gap-2">
          {t.photo ? <img src={t.photo} alt="" className="w-6 h-6 rounded-full object-cover border border-border" /> : null}
          <strong>{t.name}</strong>
          <span className="text-muted-foreground ml-1">— {t.role}</span>
        </span>
      )}
      renderForm={({ item, onSave }) => (
        <TeamForm item={item} onSave={onSave} />
      )}
    />
  );
}

function TeamForm({ item, onSave }: { item: Partial<CmsTeam> | null; onSave: (data: Partial<CmsTeam>) => Promise<boolean> }) {
  const [name, setName] = useState(item?.name || '');
  const [role, setRole] = useState(item?.role || '');
  const [initials, setInitials] = useState(item?.initials || '');
  const [photo, setPhoto] = useState(item?.photo || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const genInitials = initials || name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    setSaving(true);
    await onSave({ name: name.trim(), role: role.trim(), initials: genInitials, photo: photo || undefined });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Full Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bulus A. Dauda" />
      </div>
      <div className="space-y-1.5">
        <Label>Role / Title</Label>
        <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Executive Secretary" />
      </div>
      <div className="space-y-1.5">
        <Label>Initials</Label>
        <Input value={initials} onChange={e => setInitials(e.target.value)} placeholder="Auto-generated if empty" />
      </div>
      <div className="space-y-1.5">
        <ImageUpload
          label="Photo"
          folder="team"
          maxDim={400}
          round
          value={photo}
          onChange={v => setPhoto(v || '')}
          hint="Optional — shown instead of the initials avatar on the public site"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="gold" onClick={handleSubmit} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : item?.id ? '💾 Save Changes' : '➕ Add Member'}
        </Button>
      </div>
    </div>
  );
}
