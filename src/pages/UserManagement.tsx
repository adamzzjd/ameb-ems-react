/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ROLES, ROLE_LABELS, normalizeRole, type Role } from '../lib/roles';
import { Shield, Trash2, RefreshCw, Loader2 } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  role: Role | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

function roleBadgeVariant(role: Role | null): 'default' | 'outline' | 'secondary' | 'destructive' {
  switch (role) {
    case 'super_admin': return 'default';
    case 'admin': return 'secondary';
    case 'data_collector': return 'outline';
    case 'staff': return 'outline';
    default: return 'outline';
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export function UserManagement() {
  const { session, can } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('staff');
  const [creating, setCreating] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const callApi = useCallback(async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    if (!import.meta.env.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is not configured.');
    if (!session) throw new Error('Not signed in');
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok || json.error) throw new Error(String(json.error || `Request failed (${res.status})`));
    return json;
  }, [session]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await callApi({ action: 'list' });
      setUsers((json.users as AdminUser[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
      toast('⚠️ ' + (e instanceof Error ? e.message : 'Failed to load users.'), true);
    }
    setLoading(false);
  }, [callApi, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast('Email and password are required.', true); return; }
    setCreating(true);
    try {
      await callApi({ action: 'create', email: email.trim(), password, role: newRole });
      toast(`✓ User ${email.trim()} created as ${ROLE_LABELS[newRole]}.`);
      setEmail(''); setPassword(''); setNewRole('staff');
      loadUsers();
    } catch (err) {
      toast('⚠️ ' + (err instanceof Error ? err.message : 'Create failed.'), true);
    }
    setCreating(false);
  };

  const handleSetRole = async (id: string, role: Role) => {
    try {
      await callApi({ action: 'setRole', id, role });
      toast(`✓ Role updated to ${ROLE_LABELS[role]}.`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (err) {
      toast('⚠️ ' + (err instanceof Error ? err.message : 'Role update failed.'), true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await callApi({ action: 'delete', id: deleteTarget.id });
      toast(`${deleteTarget.email} removed.`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast('⚠️ ' + (err instanceof Error ? err.message : 'Delete failed.'), true);
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  if (!can('users.manage')) {
    return (
      <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Super Administrator Only</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>User management requires the super administrator role.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-4 flex items-center gap-3"
        style={{ background: 'var(--color-primary)', borderColor: 'transparent' }}>
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-[15px] font-bold text-white">User Management</div>
          <div className="text-xs text-white/60">Create portal accounts and assign roles. Super Administrator access only.</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3.5"
          style={{ background: 'rgba(192,57,43,0.06)', borderColor: 'rgba(192,57,43,0.25)' }}>
          <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-error)' }}>
            ⚠️ {error}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            This usually means the <code>manage-users</code> edge function is not deployed yet. Deploy it once from your terminal (in the project folder):
          </div>
          <pre className="text-[11px] leading-relaxed overflow-x-auto rounded-lg p-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
{`npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
npx supabase functions deploy manage-users`}
          </pre>
        </div>
      )}

      {/* Create user */}
      <form onSubmit={handleCreate}
        className="rounded-xl border p-4 md:p-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Create New User
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] items-end">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Email Address</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="officer@ameb.gov.ng" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Temporary Password</Label>
            <Input type="text" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Set an initial password" autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Role</Label>
            <select value={newRole} onChange={e => setNewRole(normalizeRole(e.target.value) ?? 'staff')}
              className="h-9 w-full px-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={creating || loading} className="h-9">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
          </Button>
        </div>
      </form>

      {/* Users table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Registered Users <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'var(--color-surface-warm)' }}>{users.length}</span>
          </div>
          <button onClick={loadUsers} disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition-colors hover:bg-surface-warm disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No users found</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Create the first account above.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['User', 'Role', 'Created', 'Last Sign In', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 border-b whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-surface-warm transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'var(--color-primary)' }}>
                          {(u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={roleBadgeVariant(u.role)}>{u.role ? ROLE_LABELS[u.role] : 'Unassigned'}</Badge>
                        <select
                          value={u.role ?? ''}
                          onChange={e => {
                            const r = normalizeRole(e.target.value);
                            if (r) handleSetRole(u.id, r);
                          }}
                          className="h-7 px-1.5 rounded-md border text-[11px] outline-none"
                          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          title="Change role"
                        >
                          <option value="" disabled>—</option>
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(u.last_sign_in_at)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setDeleteTarget(u)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition-colors hover:bg-surface-warm"
                        style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)' }}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border p-6"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 8px 32px var(--color-shadow)' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">⚠️</div>
            <div className="font-bold text-[15px] mb-1" style={{ color: 'var(--color-text-primary)' }}>Remove User Account</div>
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.email}</strong> will lose all access to the portal immediately. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
