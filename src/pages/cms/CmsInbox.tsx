import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { dbLoadContacts, dbMarkContactRead, dbDeleteContact } from '@/supabase/cms';
import type { CmsContact } from '@/types';

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

export function CmsInbox() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CmsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CmsContact | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadContacts();
    if (data) setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.message.toLowerCase().includes(q);
  });

  const handleOpen = async (contact: CmsContact) => {
    setSelected(contact);
    if (!contact.read) {
      await dbMarkContactRead(contact.id);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, read: true } : c));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteContact(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setContacts(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
    toast('Message deleted.');
    setShowDelete(null);
  };

  const unreadCount = contacts.filter(c => !c.read).length;

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-4" />
        Loading inbox…
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* List */}
      <div className="w-full lg:max-w-md shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-navy">✉️ Contact Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {contacts.length} message{contacts.length !== 1 ? 's' : ''}
              {unreadCount > 0 && <> · {unreadCount} unread</>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>🔄 Refresh</Button>
        </div>

        <Input
          placeholder="Search messages…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3"
        />

        <Card className="divide-y divide-border max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">✉️</div>
              <p className="text-sm">{contacts.length === 0 ? 'No messages yet.' : 'No messages match your search.'}</p>
            </div>
          ) : filtered.map(c => (
            <div
              key={c.id}
              onClick={() => handleOpen(c)}
              className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${!c.read ? 'bg-muted/30 border-l-2 border-l-gold' : ''} ${selected?.id === c.id ? 'bg-muted' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!c.read && <span className="w-2 h-2 rounded-full bg-gold shrink-0" />}
                    <span className={`text-sm truncate ${!c.read ? 'font-bold text-foreground' : 'text-foreground'}`}>
                      {c.name}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${!c.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {c.subject}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {fmtDate(c.created_at)}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Message Detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <Card className="h-full">
            <div className="bg-navy text-white px-5 py-4 rounded-t-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{selected.subject}</div>
                <div className="text-xs text-white/60">From: {selected.name} &lt;{selected.email}&gt;</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowDelete(selected.id)}
                >
                  🗑
                </Button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sent: {fmtDate(selected.created_at)}</span>
                <Badge variant={selected.read ? 'outline' : 'gold'}>
                  {selected.read ? 'Read' : 'New'}
                </Badge>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {selected.message}
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Email:</strong> {selected.email}<br />
                  <strong>Name:</strong> {selected.name}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-sm">Select a message to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDelete(null); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-sm w-full max-w-sm">
            <div className="bg-destructive text-white px-5 py-4 rounded-t-xl">
              <div className="text-sm font-bold">Delete Message</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="font-medium text-foreground mb-1">Delete this message permanently?</p>
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
