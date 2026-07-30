import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

interface CmsItem {
  id: string;
  sort_order: number;
}

interface CmsListManagerProps<T extends CmsItem> {
  title: string;
  subtitle?: string;
  icon: string;
  items: T[];
  loading?: boolean;
  onAdd: (item: Omit<T, 'id' | 'sort_order'>) => Promise<{ data: T | null; error: Error | null }>;
  onUpdate: (id: string, item: Partial<T>) => Promise<{ data: T | null; error: Error | null }>;
  onDelete: (id: string) => Promise<{ error: Error | null }>;
  onReorder: (items: T[]) => Promise<boolean>;
  renderItem: (item: T) => ReactNode;
  renderForm: (props: { item: Partial<T> | null; onSave: (data: Partial<T>) => Promise<boolean> }) => ReactNode;
  searchPlaceholder?: string;
}

export function CmsListManager<T extends CmsItem>({
  title, subtitle, icon, items, loading,
  onAdd, onUpdate, onDelete, onReorder,
  renderItem, renderForm, searchPlaceholder = 'Search…',
}: CmsListManagerProps<T>) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [, setSaving] = useState(false);
  const [localItems, setLocalItems] = useState<T[]>(items);

  // Sync when items prop changes
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const filtered = useMemo(() => {
    if (!search) return localItems;
    const q = search.toLowerCase();
    return localItems.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  }, [localItems, search]);

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = localItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= localItems.length) return;

    const reordered = [...localItems];
    const temp = reordered[idx].sort_order;
    reordered[idx] = { ...reordered[idx], sort_order: reordered[swapIdx].sort_order };
    reordered[swapIdx] = { ...reordered[swapIdx], sort_order: temp };
    reordered.sort((a, b) => a.sort_order - b.sort_order);

    setLocalItems(reordered);
    await onReorder(reordered);
  };

  const handleSave = async (data: Partial<T>) => {
    setSaving(true);
    if (editing) {
      const { error } = await onUpdate(editing.id, data);
      if (error) { toast('Update failed: ' + error.message, true); setSaving(false); return false; }
      setLocalItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...data } as T : i));
      toast('✓ Updated successfully.');
    } else {
      const { data: created, error } = await onAdd(data as Omit<T, 'id' | 'sort_order'>);
      if (error || !created) { toast('Add failed: ' + (error?.message || 'Unknown'), true); setSaving(false); return false; }
      setLocalItems(prev => [...prev, created]);
      toast('✓ Added successfully.');
    }
    setSaving(false);
    setShowForm(false);
    return true;
  };

  const handleDelete = async (id: string) => {
    const { error } = await onDelete(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setLocalItems(prev => prev.filter(i => i.id !== id));
    toast('Item deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-4" />
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">{icon} {title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="gold" onClick={openAdd}>+ Add</Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* List */}
      <Card>
        <div className="p-3 border-b border-border">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> item{filtered.length !== 1 ? 's' : ''}
            {filtered.length < localItems.length && <> (filtered from {localItems.length})</>}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">{icon}</div>
            <p className="font-medium text-foreground mb-1">No items yet.</p>
            <p className="text-sm">Click "+ Add" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => handleMove(item.id, 'up')}
                    disabled={i === 0}
                    className="text-xs leading-none text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 cursor-pointer border-none bg-transparent"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => handleMove(item.id, 'down')}
                    disabled={i === filtered.length - 1}
                    className="text-xs leading-none text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 cursor-pointer border-none bg-transparent"
                    title="Move down"
                  >▼</button>
                </div>

                {/* Item content */}
                <div className="flex-1 min-w-0 text-sm">
                  {renderItem(item)}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit">
                    ✏️
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDelete(item.id)} title="Delete" className="text-destructive hover:text-destructive">
                    🗑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-navy text-white px-5 py-4 rounded-t-xl flex items-center justify-between sticky top-0 z-10">
              <div>
                <div className="text-sm font-bold">{editing ? 'Edit' : 'Add'} {title}</div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-sm cursor-pointer border-none text-white hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              {renderForm({
                item: editing,
                onSave: handleSave,
              })}
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
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-sm">
            <div className="bg-destructive text-white px-5 py-4 rounded-t-xl">
              <div className="text-sm font-bold">Delete Item</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="font-medium text-foreground mb-1">Delete this item permanently?</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(showDelete)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
