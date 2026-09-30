/* Phase 29 — Board dashboard redesigned around *work*, not stat soup:
   Today (what needs action) → The Board → Delivery → Partners.
   Every section is one click from where the work lives. */

import { useEffect, useState } from 'react';
import type { Employee } from '../types';
import {
  Landmark, GraduationCap, Handshake, ChevronRight, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { dbLoadLgaAreaOfficers } from '../supabase/lgaOfficers';
import { dbLoadDepartments } from '../supabase/departments';
import { dbLoadPartnerOrganisations, dbLoadPendingCentres, dbLoadCentreOrganisationLinks } from '../supabase/partners';
import { dbLoadCohorts, dbLoadLearners, dbLoadProgrammes } from '../supabase/delivery';
import { dbLoadFormAssignments } from '../supabase/forms';
import { useAuth } from '../hooks/useAuth';

interface DashboardProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
  onNavigate: (page: string) => void;
}

const card = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
} as const;

function Section({
  icon, title, subtitle, action, onAction, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  action?: string; onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border overflow-hidden" style={card}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold truncate">{title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
          </div>
        </div>
        {action && onAction && (
          <button onClick={onAction}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border hover:bg-muted transition-colors cursor-pointer"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {action} <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, sub, onClick }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${onClick ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'}`}
      style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-xl font-heading font-bold leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

export function Dashboard({ employees, onNavigate }: DashboardProps) {
  const { can } = useAuth();

  const [departments, setDepartments] = useState(0);
  const [orgs, setOrgs] = useState(0);
  const [orgCentreLinks, setOrgCentreLinks] = useState(0);
  const [pendingCentres, setPendingCentres] = useState(0);
  const [cohorts, setCohorts] = useState<{ id: string; cohort_status: string; learner_count: number }[]>([]);
  const [learnerCount, setLearnerCount] = useState(0);
  const [programmeCount, setProgrammeCount] = useState(0);
  const [overdueAssignments, setOverdueAssignments] = useState(0);
  const [officerCoverage, setOfficerCoverage] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const [dept, orgsRes, links, pending, co, lr, pg, fa, officers] = await Promise.all([
        dbLoadDepartments(),
        dbLoadPartnerOrganisations(),
        dbLoadCentreOrganisationLinks().catch(() => ({ data: [], error: null })),
        dbLoadPendingCentres(),
        dbLoadCohorts(),
        dbLoadLearners(),
        dbLoadProgrammes(),
        dbLoadFormAssignments().catch(() => ({ data: [] as { due_date: string | null; status: string }[], error: null })),
        dbLoadLgaAreaOfficers(),
      ]);
      if (!active) return;
      setDepartments(dept.data?.length ?? 0);
      setOrgs((orgsRes.data ?? []).length);
      setOrgCentreLinks((links.data ?? []).length);
      setPendingCentres((pending.data ?? []).length);
      setCohorts((co.data ?? []).map(c => ({ id: c.id, cohort_status: c.cohort_status, learner_count: c.learner_count })));
      setLearnerCount((lr.data ?? []).length);
      setProgrammeCount(pg.data?.length ?? 0);
      const today = new Date().toISOString().slice(0, 10);
      setOverdueAssignments((fa.data ?? []).filter(a => a.status === 'open' && a.due_date && a.due_date < today).length);
      setOfficerCoverage((officers.data ?? []).length);
    })();
    return () => { active = false; };
  }, []);

  const noDepartment = employees.filter(e => !(e as { department_id?: string | null }).department_id).length;
  const noStation = employees.filter(e => !e.station).length;
  const runningCohorts = cohorts.filter(c => c.cohort_status === 'running').length;
  const totalLearnersInCohorts = cohorts.reduce((s, c) => s + c.learner_count, 0);

  return (
    <div className="space-y-5">
      {/* ── Today — what needs action ── */}
      <Section
        icon={<ShieldCheck size={16} />} title="Today" subtitle="Things waiting on a decision"
        onAction={can('centres.manage') || can('partners.manage') ? () => onNavigate('partners') : undefined} action="Review"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Metric label="centre approvals" value={pendingCentres} sub={pendingCentres > 0 ? 'action needed' : 'all clear'}
            onClick={() => onNavigate('partners')} />
          <Metric label="overdue forms" value={overdueAssignments} sub={overdueAssignments > 0 ? 'past due date' : 'none open'}
            onClick={() => onNavigate('submissions-review')} />
          <Metric label="officers w/o dept" value={noDepartment} sub="assign in employee form"
            onClick={() => onNavigate('employees')} />
          <Metric label="officers w/o station" value={noStation} sub="missing posting"
            onClick={() => onNavigate('employees')} />
        </div>
        {overdueAssignments > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} /> {overdueAssignments} form assignment{overdueAssignments !== 1 ? 's are' : ' is'} past their due date.
          </div>
        )}
      </Section>

      {/* ── The Board ── */}
      <Section
        icon={<Landmark size={16} />} title="The Board" subtitle="Staff establishment & structure"
        action="Staff register" onAction={() => onNavigate('employees')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Metric label="officers on register" value={employees.length}
            onClick={() => onNavigate('employees')} />
          <Metric label="departments" value={departments} sub={departments === 0 ? 'create the first' : 'active units'}
            onClick={() => onNavigate('departments')} />
          <Metric label="LGA officers" value={officerCoverage} sub="of 21 LGAs covered"
            onClick={() => onNavigate('lga-officers')} />
          <Metric label="explorable hierarchy" value="Explore" sub="the whole platform, nested"
            onClick={() => onNavigate('explore')} />
        </div>
      </Section>

      {/* ── Delivery ── */}
      <Section
        icon={<GraduationCap size={16} />} title="Delivery" subtitle="Programmes, cohorts & learners"
        action="Reports & M&E" onAction={() => onNavigate('reports')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Metric label="programmes" value={programmeCount} onClick={() => onNavigate('programmes')} />
          <Metric label="running cohorts" value={runningCohorts} sub={`${cohorts.length} total`} onClick={() => onNavigate('cohorts')} />
          <Metric label="learners enrolled" value={learnerCount} sub={`${totalLearnersInCohorts} in active cohorts`} onClick={() => onNavigate('learners')} />
          <Metric label="field data" value="Review" sub="submissions inbox" onClick={() => onNavigate('submissions-review')} />
        </div>
      </Section>

      {/* ── Partners ── */}
      <Section
        icon={<Handshake size={16} />} title="Partners" subtitle="Organisations and where they work"
        action="Open portals" onAction={() => onNavigate('partner-home')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Metric label="organisations" value={orgs} onClick={() => onNavigate('partners')} />
          <Metric label="centre links" value={orgCentreLinks} sub="org ↔ centre (lead + partners)" onClick={() => onNavigate('centres')} />
          <Metric label="learning centres" value="Register" onClick={() => onNavigate('centres')} />
          <Metric label="facilitators" value="Manage" onClick={() => onNavigate('facilitators')} />
        </div>
      </Section>
    </div>
  );
}
