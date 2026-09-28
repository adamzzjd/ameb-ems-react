import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadCohorts, dbLoadLearners } from '../supabase/delivery';
import type { Centre, CohortOverviewRow, Learner, OrganisationMember, PartnerOrganisation } from '../types';
import { Building2, GraduationCap, CalendarRange, MapPin, Phone, Mail, ShieldCheck } from 'lucide-react';

/**
 * Partner portal home. Everything is row-scoped by RLS: the signed-in partner
 * user only sees their own organisation's rows, so the same services the board
 * uses are safe here — the DB does the tenant isolation.
 */
export function PartnerPortal() {
  const { user } = useAuth();
  const [org, setOrg] = useState<PartnerOrganisation | null>(null);
  const [membership, setMembership] = useState<OrganisationMember | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [cohorts, setCohorts] = useState<CohortOverviewRow[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Membership rows for this user (RLS: members see their own links).
      const userId = user?.id;
      if (userId) {
        const { data: memberships } = await supabase
          .from('organisation_members')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (!active) return;
        if (memberships) {
          setMembership(memberships as OrganisationMember);
          const { data: orgRow } = await supabase
            .from('partner_organisations')
            .select('*')
            .eq('id', (memberships as OrganisationMember).organisation_id)
            .maybeSingle();
          if (!active) return;
          setOrg((orgRow as PartnerOrganisation) ?? null);
        }
      }
      // Own centres + delivery data (RLS scopes these to the organisation).
      const [c, co, l] = await Promise.all([dbLoadCentres(), dbLoadCohorts(), dbLoadLearners()]);
      if (!active) return;
      setCentres(c.data ?? []);
      setCohorts(co.data ?? []);
      setLearners(l.data ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const activeLearners = learners.filter(l => l.status === 'active').length;
  const runningCohorts = cohorts.filter(c => c.cohort_status === 'running').length;
  const pendingCentres = centres.filter(c => c.approval_status === 'pending').length;

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading your organisation…</p>;

  if (!org) {
    return (
      <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
        <ShieldCheck size={30} className="mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-heading text-base font-bold mb-1.5">No organisation linked</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your account isn't linked to a partner organisation yet. Ask the Board office to add you under
          <strong> Partner Organisations → members</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Organisation card */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
              {org.type} · Partner Portal
            </div>
            <h2 className="font-heading text-xl font-bold">{org.name}</h2>
            {membership && (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Your role: <strong>{membership.org_role.replace('org_', '')}</strong>
                {pendingCentres > 0 && <> · {pendingCentres} centre{pendingCentres !== 1 ? 's' : ''} awaiting Board approval</>}
              </p>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground space-y-1">
            {org.phone && <div className="flex items-center gap-1.5"><Phone size={13} /> {org.phone}</div>}
            {org.email && <div className="flex items-center gap-1.5"><Mail size={13} /> {org.email}</div>}
            {org.lga && <div className="flex items-center gap-1.5"><MapPin size={13} /> {org.lga}</div>}
          </div>
        </div>
        {org.status !== 'active' && (
          <div className="mt-4 rounded-lg px-3.5 py-2.5 text-[13px] bg-amber-50 text-amber-800 border border-amber-200">
            This organisation is currently <strong>{org.status}</strong> — some actions may be restricted.
          </div>
        )}
      </div>

      {/* Delivery summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Our Centres', value: centres.length, icon: <Building2 size={18} /> },
          { label: 'Cohorts', value: cohorts.length, icon: <CalendarRange size={18} />, sub: `${runningCohorts} running` },
          { label: 'Learners', value: learners.length, icon: <GraduationCap size={18} />, sub: `${activeLearners} active` },
          { label: 'Pending Approval', value: pendingCentres, icon: <ShieldCheck size={18} /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {s.icon} {s.label}
            </div>
            <div className="text-2xl font-heading font-bold mt-1.5">{s.value}</div>
            {s.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Our centres */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h3 className="font-heading text-[15px] font-bold mb-4">Our Learning Centres</h3>
        {centres.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No centres yet — add yours from the Learning Centres page (they'll go live once the Board approves them).
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {centres.map(c => (
              <div key={c.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-heading text-[14px] font-bold">{c.name}</h4>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                    c.approval_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{c.approval_status ?? 'approved'}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {[c.ward, c.community, c.lga].filter(Boolean).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Running cohorts */}
      {cohorts.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-4">Recent Cohorts</h3>
          <div className="space-y-2.5">
            {cohorts.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="font-semibold">{c.name || c.programme_title}</span>
                <span className="text-muted-foreground">{c.centre_name} · {c.learner_count} learners</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
