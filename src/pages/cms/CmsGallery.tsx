import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/hooks/useToast';
import { dbLoadGallery, dbSaveGalleryImage, dbDeleteGalleryImage } from '@/supabase/cms';
import { deleteImageFromStorage } from '@/supabase/storage';
import { clearCmsCache } from '@/hooks/useCmsData';
import type { CmsGallery } from '@/types';

export function CmsGallery() {
  const { toast } = useToast();
  const [items, setItems] = useState<CmsGallery[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CmsGallery | null>(null);
  const [formLabel, setFormLabel] = useState('📸');
  const [formWide, setFormWide] = useState(false);
  const [formTall, setFormTall] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formImage, setFormImage] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadGallery();
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormLabel('📸');
    setFormWide(false);
    setFormTall(false);
    setFormSortOrder(items.length);
    setFormImage('');
    setShowForm(true);
  };

  const openEdit = (item: CmsGallery) => {
    setEditing(item);
    setFormLabel(item.label);
    setFormWide(!!item.wide);
    setFormTall(!!item.tall);
    setFormSortOrder(item.sort_order);
    setFormImage(item.image || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: {
      id?: string;
      label: string;
      wide: boolean;
      tall: boolean;
      image?: string | null; // null clears the photo on update
      sort_order: number;
    } = {
      label: formLabel,
      wide: formWide,
      tall: formTall,
      // `null` clears the image on update (undefined would be dropped by the
      // update payload spread and the old image would be kept).
      image: formImage || null,
      sort_order: formSortOrder,
    };
    if (editing) payload.id = editing.id;

    const { data, error } = await dbSaveGalleryImage(payload);
    if (error) {
      toast('Save failed: ' + error.message, true);
      setSaving(false);
      return;
    }
    if (data) {
      setItems(prev =>
        editing
          ? prev.map(i => i.id === data.id ? data : i)
          : [...prev, data]
      );
    }
    clearCmsCache();
    toast(editing ? '✓ Gallery item updated' : '✓ Gallery item added');
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    // Clean up the hosted file (no-op for legacy base64 / Cloudinary URLs)
    if (item?.image) void deleteImageFromStorage(item.image);
    const { error } = await dbDeleteGalleryImage(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    clearCmsCache();
    setItems(prev => prev.filter(i => i.id !== id));
    toast('Gallery item deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-4" />
        Loading gallery…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">🖼 Manage Gallery</h2>
          <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} in gallery</p>
        </div>
        <Button variant="gold" onClick={openAdd}>+ Add Item</Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">🖼</div>
            <p className="font-medium text-foreground mb-1">No gallery items</p>
            <p className="text-sm">Add images to the gallery</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.sort((a, b) => a.sort_order - b.sort_order).map(item => (
            <div
              key={item.id}
              className={`relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square ${item.wide ? 'md:col-span-2' : ''} ${item.tall ? 'md:row-span-2' : ''}`}
            >
              {item.image ? (
                <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-navy/5">
                  {item.label || '📸'}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="sm" className="text-white border-white/30 hover:bg-white/20" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDelete(item.id)}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-navy text-white px-5 py-4 rounded-t-xl flex items-center justify-between sticky top-0 z-10">
              <div className="text-sm font-bold">
                {editing ? 'Edit Gallery Item' : 'Add Gallery Item'}
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-sm cursor-pointer border-none text-white hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image upload (Cloudinary-first, Supabase fallback) */}
              <ImageUpload
                label="Upload Image"
                folder="gallery"
                maxDim={1600}
                value={formImage}
                onChange={v => setFormImage(v || '')}
                hint="Stored as a CDN URL — JPG, PNG, WebP or GIF up to 8 MB"
              />

              {/* Label / Emoji */}
              <div className="space-y-1.5">
                <Label>Fallback Emoji</Label>
                <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="📸" />
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formSortOrder}
                  onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
              </div>

              {/* Options */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={formWide} onChange={e => setFormWide(e.target.checked)} className="rounded" />
                  Wide (2 columns)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={formTall} onChange={e => setFormTall(e.target.checked)} className="rounded" />
                  Tall (2 rows)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="gold" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? '💾 Update' : '➕ Add'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDelete(null); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-sm w-full max-w-sm">
            <div className="bg-destructive text-white px-5 py-4 rounded-t-xl">
              <div className="text-sm font-bold">Delete Gallery Item</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="font-medium text-foreground mb-1">Delete this item permanently?</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(showDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
