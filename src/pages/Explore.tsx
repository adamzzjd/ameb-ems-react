import { useEffect, useMemo, useState } from 'react';
import {
  Landmark, ChevronRight, Users, GraduationCap, MapPin,
  BookOpen, Handshake, AlertTriangle, ArrowUpRight, Network,
  CalendarRange, UsersRound,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '@/lib/utils';
import { loadHierarchyData } from '../supabase/hierarchy';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadPartnerOrganisations } from '../supabase/partners';
import { dbLoadAll } from '../supabase/employees';
import { buildExploreTree } from '../lib/explore';
import type { ExploreLearner, ExploreCentreNode, ExploreInput } from '../lib/explore';

interface Props {
  onNavigate: (page: string) => void;
}

/** One level of the drill-down trail shown above the detail panel. */
interface Crumb {
  label: string;
  onSelect: () => void;
}

type Selection =
  | { kind: 'board' }
  | { kind: 'org'; orgId: string }
  | { kind: 'programme'; orgId: string | null; programmeId: string }
  | { kind: 'lga'; orgId: string | null; lga: string }
  | { kind: 'centre'; centreId: string }
  | { kind: 'cohort'; cohortId: string }
  | { kind: 'staff-group'; departmentId: string | null };

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  running: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  planned: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  merged: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  closed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  archived: 'bg-muted text-muted-foreground',
};

function cnPill(cls: string) {
  return `text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`;
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  return <span className={cnPill(STATUS_STYLES[s] ?? 'bg-muted text-muted-foreground')}>{status}</span>;
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-bold leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </div>
  );
}

function Row({
  icon, title, subtitle, badge, onClick, accent = false,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer',
        accent ? 'border-gold/40 bg-gold/5 hover:bg-gold/10' : 'border-border hover:bg-muted/60',
      )}
    >
      <span className="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{title}</span>
        {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
      </span>
      {badge}
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </button>
  );
}

function Count({ n, label }: { n: number | string; label: string }) {
  return (
    <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground whitespace-nowrap">
      {n} {label}
    </span>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pt-2">
      {title}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function CrossLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-gold hover:underline cursor-pointer bg-transparent border-none"
    >
      <span className="inline-flex items-center gap-1">{label} <ArrowUpRight size={12} /></span>
    </button>
  );
}

/** Every centre node in the tree, keyed by centre id (centres appear under many branches). */
function collectCentreNodes(tree: ReturnType<typeof buildExploreTree>) {
  const map = new Map<string, ExploreCentreNode>();
  const visit = (lgas: { centres: ExploreCentreNode[] }[]) => {
    for (const lga of lgas) for (const node of lga.centres) map.set(node.centre.id, node);
  };
  visit(tree.board.programmes.flatMap(p => p.lgas));
  for (const org of tree.orgs) {
    visit(org.centresByLga);
    for (const pn of org.programmes) visit(pn.lgas);
  }
  return map;
}

// ── Data bundle handed to the pure view builder ──────────────────────────────
interface ExploreState {
  tree: ReturnType<typeof buildExploreTree>;
  cohorts: Map<string, { name: string; status: string; centreId: string }>;
  hierarchyReady: boolean;
}

/** The Explore navigator — Phase 28's nested, routed, linked hierarchy. */
export function Explore({ onNavigate }: Props) {
  const [state, setState] = useState<ExploreState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Selection>({ kind: 'board' });

  useEffect(() => {
    let active = true;
    (async () => {
      const [hier, centres, orgs, staff] = await Promise.all([
        loadHierarchyData(),
        dbLoadCentres(),
        dbLoadPartnerOrganisations(),
        dbLoadAll(),
      ]);
      if (!active) return;
      if (centres.error && orgs.error && staff.error) {
        setError('Registers are not available — has the Supabase setup run?');
      }
      const staffRows = (staff.data ?? []).map(e => {
        const dept = (e as { department_id?: string | null }).department_id;
        return {
          id: e.id,
          name: e.name,
          department_id: typeof dept === 'string' ? dept : null,
          grade: e.grade,
          station: e.station,
        };
      });
      const tree = buildExploreTree({
        departments: hier.departments.map(d => ({ id: d.id, name: d.name, code: d.code, status: d.status })),
        staff: staffRows,
        orgs: (orgs.data ?? []).map(o => ({ id: o.id, name: o.name, type: o.type, status: o.status })),
        centreOrgs: hier.centreOrgs.map(l => ({ centre_id: l.centre_id, org_id: l.org_id, role: l.role })),
        orgCoverage: hier.orgCoverage,
        programmeLgas: hier.programmeLgas,
        programmes: hier.programmes.map(p => ({
          id: p.id, title: p.title, owner_org_id: p.owner_org_id, status: p.status, category: p.category,
        })),
        cohorts: hier.cohorts.map(c => ({
          id: c.id, name: c.name, programme_id: c.programme_id, centre_id: c.centre_id,
          status: c.cohort_status, learner_count: c.learner_count,
        })),
        learners: hier.learners.map(l => ({
          id: l.id, full_name: l.full_name, cohort_id: l.cohort_id, status: l.status,
        })),
        centres: (centres.data ?? []).map(c => ({ id: c.id, name: c.name, lga: c.lga, owner_type: c.owner_type })),
        facilitatorsByCentre: hier.facilitatorsByCentre,
      } satisfies ExploreInput);
      const cohortMap = new Map(
        hier.cohorts.map(c => [c.id, { name: c.name, status: c.cohort_status, centreId: c.centre_id }]),
      );
      setState({ tree, cohorts: cohortMap, hierarchyReady: hier.hierarchyReady });
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const view = useMemo(() => {
    if (!state) return null;
    const { tree, cohorts } = state;
    const findOrg = (id: string) => tree.orgs.find(o => o.org.id === id);
    const boardCrumb: Crumb = { label: 'Board', onSelect: () => setSel({ kind: 'board' }) };
    const partnersCrumb: Crumb = {
      label: 'Partners',
      onSelect: () => { if (tree.orgs[0]) setSel({ kind: 'org', orgId: tree.orgs[0].org.id }); },
    };
    const orgCrumb = (orgId: string): Crumb => ({
      label: findOrg(orgId)?.org.name ?? '…',
      onSelect: () => setSel({ kind: 'org', orgId }),
    });

    switch (sel.kind) {
      // ── BOARD OVERVIEW ─────────────────────────────────────────────
      case 'board': {
        const b = tree.board;
        return {
          crumbs: [boardCrumb],
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat icon={<Users size={14} />} value={b.departments.reduce((s, d) => s + d.staff.length, 0) + b.unassignedCount} label="staff on register" />
                <Stat icon={<Landmark size={14} />} value={b.departments.length} label="departments" />
                <Stat icon={<BookOpen size={14} />} value={b.programmes.length} label="board programmes" />
                <Stat icon={<GraduationCap size={14} />} value={b.learnerCount} label="learners" />
              </div>
              <Section title="Departments & staff" />
              {b.departments.length === 0 ? (
                <EmptyHint text="No departments yet — run supabase/setup_hierarchy.sql, then manage them on the Departments page (Phase 28.3)." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {b.departments.map(d => (
                    <Row
                      key={d.department.id}
                      icon={<Landmark size={16} />}
                      title={d.department.name}
                      subtitle={d.department.code ? `Code ${d.department.code}` : undefined}
                      badge={<Count n={d.staff.length} label="staff" />}
                      onClick={() => setSel({ kind: 'staff-group', departmentId: d.department.id })}
                    />
                  ))}
                </div>
              )}
              {b.unassignedCount > 0 && (
                <Row
                  icon={<Users size={16} />}
                  title="No department assigned"
                  subtitle="Officers not yet linked to a unit"
                  badge={<Count n={b.unassignedCount} label="staff" />}
                  onClick={() => setSel({ kind: 'staff-group', departmentId: null })}
                />
              )}
              <Section title="Board programmes" />
              {b.programmes.length === 0 ? (
                <EmptyHint text="No board-run programmes yet — programmes with no owning organisation count as the Board's own." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {b.programmes.map(pn => (
                    <Row
                      key={pn.programme.id}
                      icon={<BookOpen size={16} />}
                      title={pn.programme.title}
                      subtitle={pn.programme.category ?? undefined}
                      badge={<Count n={pn.learnerCount} label="learners" />}
                      onClick={() => setSel({ kind: 'programme', orgId: null, programmeId: pn.programme.id })}
                    />
                  ))}
                </div>
              )}
            </div>
          ),
        };
      }

      // ── STAFF UNDER A DEPARTMENT (or the unassigned bucket) ───────
      case 'staff-group': {
        const group =
          sel.departmentId === null
            ? null
            : tree.board.departments.find(d => d.department.id === sel.departmentId);
        const deptName = group?.department.name ?? 'No department assigned';
        return {
          crumbs: [boardCrumb, { label: deptName, onSelect: () => setSel(sel) }],
          content: (
            <div className="space-y-2">
              <Section title={`${deptName} — staff`} />
              {!group || group.staff.length === 0 ? (
                <EmptyHint text={group ? 'No staff assigned to this department yet — assign one via the employee form (Phase 28.3).' : 'Every officer has a department — nothing to show here.'} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {group.staff.map(s => (
                    <Row
                      key={s.id}
                      icon={<Users size={16} />}
                      title={s.name}
                      subtitle={[s.grade, s.station].filter(Boolean).join(' · ') || undefined}
                      onClick={() => onNavigate('employees')}
                    />
                  ))}
                </div>
              )}
            </div>
          ),
        };
      }

      // ── ORGANISATION OVERVIEW ──────────────────────────────────────
      case 'org': {
        const org = findOrg(sel.orgId) ?? tree.orgs[0];
        if (!org) {
          return {
            crumbs: [partnersCrumb],
            content: <EmptyHint text="No partner organisations registered yet." />,
          };
        }
        return {
          crumbs: [partnersCrumb, orgCrumb(org.org.id)],
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">{org.org.name}</h3>
                <StatusPill status={org.org.status} />
                <span className={cnPill('bg-muted text-muted-foreground')}>{org.org.type}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat icon={<BookOpen size={14} />} value={org.programmes.length} label="programmes" />
                <Stat icon={<MapPin size={14} />} value={org.centresByLga.reduce((s, l) => s + l.centres.length, 0)} label="centres involved" />
                <Stat icon={<GraduationCap size={14} />} value={org.learnerCount} label="learners" />
                <Stat icon={<MapPin size={14} />} value={org.coverage.length} label="LGAs covered" />
              </div>
              {org.coverage.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {org.coverage.map(lga => (
                    <button
                      key={lga}
                      onClick={() => setSel({ kind: 'lga', orgId: org.org.id, lga })}
                      className="text-[11px] font-semibold px-2 py-1 rounded-full bg-muted hover:bg-gold/20 cursor-pointer border-none"
                    >
                      📍 {lga}
                    </button>
                  ))}
                </div>
              )}
              <Section title="Programmes" />
              {org.programmes.length === 0 ? (
                <EmptyHint text="No programmes owned by this organisation yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {org.programmes.map(pn => (
                    <Row
                      key={pn.programme.id}
                      icon={<BookOpen size={16} />}
                      title={pn.programme.title}
                      subtitle={[pn.programme.category, `${pn.lgas.length} LGA${pn.lgas.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                      badge={<Count n={pn.learnerCount} label="learners" />}
                      onClick={() => setSel({ kind: 'programme', orgId: org.org.id, programmeId: pn.programme.id })}
                    />
                  ))}
                </div>
              )}
              <Section title="Centres (lead or partner)" />
              {org.centresByLga.length === 0 ? (
                <EmptyHint text="No centre links yet — run setup_hierarchy.sql, then link orgs on the Centres page (Phase 28.5)." />
              ) : (
                <div className="space-y-1">
                  {org.centresByLga.map(lgaNode => (
                    <div key={lgaNode.lga}>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1 pt-2">
                        {lgaNode.lga}
                      </div>
                      {lgaNode.centres.map(cn => (
                        <Row
                          key={cn.centre.id}
                          icon={<MapPin size={16} />}
                          title={cn.centre.name}
                          subtitle={[cn.centre.owner_type, `${cn.cohorts.length} cohorts`, `${cn.facilitatorCount} facilitators`].filter(Boolean).join(' · ')}
                          badge={<Count n={cn.learners.length} label="learners" />}
                          onClick={() => setSel({ kind: 'centre', centreId: cn.centre.id })}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <CrossLink label="Open Partner Portal" onClick={() => onNavigate('partner-home')} />
            </div>
          ),
        };
      }

      // ── PROGRAMME → LGAs → CENTRES ─────────────────────────────────
      case 'programme': {
        const pool = sel.orgId ? findOrg(sel.orgId)?.programmes ?? [] : tree.board.programmes;
        const pn = pool.find(p => p.programme.id === sel.programmeId);
        if (!pn) return { crumbs: [boardCrumb], content: <EmptyHint text="Programme not found." /> };
        return {
          crumbs: [
            ...(sel.orgId ? [partnersCrumb, orgCrumb(sel.orgId)] : [boardCrumb]),
            { label: pn.programme.title, onSelect: () => setSel(sel) },
          ],
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">{pn.programme.title}</h3>
                <StatusPill status={pn.programme.status} />
                {pn.programme.category && (
                  <span className={cnPill('bg-muted text-muted-foreground')}>{pn.programme.category}</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat icon={<MapPin size={14} />} value={pn.lgas.length} label="LGAs" />
                <Stat icon={<MapPin size={14} />} value={pn.lgas.reduce((s, l) => s + l.centres.length, 0)} label="centres" />
                <Stat icon={<GraduationCap size={14} />} value={pn.learnerCount} label="learners" />
              </div>
              {pn.lgas.length === 0 ? (
                <EmptyHint text="No cohorts yet — this programme hasn't been delivered at any centre." />
              ) : (
                pn.lgas.map(lgaNode => (
                  <div key={lgaNode.lga} className="space-y-1">
                    <button
                      onClick={() => setSel({ kind: 'lga', orgId: sel.orgId, lga: lgaNode.lga })}
                      className="text-xs font-bold text-gold hover:underline cursor-pointer bg-transparent border-none flex items-center gap-1"
                    >
                      📍 {lgaNode.lga} <ChevronRight size={12} />
                    </button>
                    {lgaNode.centres.map(cn => (
                      <Row
                        key={cn.centre.id}
                        icon={<MapPin size={16} />}
                        title={cn.centre.name}
                        subtitle={`${cn.cohorts.length} cohort${cn.cohorts.length !== 1 ? 's' : ''} · ${cn.learners.length} learners`}
                        onClick={() => setSel({ kind: 'centre', centreId: cn.centre.id })}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          ),
        };
      }

      // ── LGA — global view of every known centre in that LGA ───────
      case 'lga': {
        return {
          crumbs: [sel.orgId ? partnersCrumb : boardCrumb, { label: sel.lga, onSelect: () => setSel(sel) }],
          content: (
            <div className="space-y-1">
              <Section title={`Centres in ${sel.lga}`} />
              <LgaCentres tree={tree} lga={sel.lga} onCentre={id => setSel({ kind: 'centre', centreId: id })} />
            </div>
          ),
        };
      }

      // ── CENTRE → org cross-chips → cohorts → learners ─────────────
      case 'centre': {
        const node = collectCentreNodes(tree).get(sel.centreId);
        if (!node) return { crumbs: [boardCrumb], content: <EmptyHint text="Centre not found in the hierarchy yet — it may have no org links or cohorts. Open the Centres Register to manage it." /> };
        const linkedOrgs = tree.orgs.filter(o =>
          o.centresByLga.some(l => l.centres.some(c => c.centre.id === sel.centreId)),
        );
        return {
          crumbs: [{ label: node.centre.lga || 'LGA', onSelect: () => setSel({ kind: 'lga', orgId: null, lga: node.centre.lga }) }, { label: node.centre.name, onSelect: () => setSel(sel) }],
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">{node.centre.name}</h3>
                {node.centre.owner_type && <StatusPill status={node.centre.owner_type} />}
                <span className={cnPill('bg-muted text-muted-foreground')}>📍 {node.centre.lga}</span>
              </div>
              {linkedOrgs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Organisations involved:</span>
                  {linkedOrgs.map(o => (
                    <button
                      key={o.org.id}
                      onClick={() => setSel({ kind: 'org', orgId: o.org.id })}
                      className="text-[11px] font-semibold px-2 py-1 rounded-full bg-gold/10 text-gold hover:bg-gold/20 cursor-pointer border-none"
                    >
                      <Handshake size={10} className="inline mr-1" />{o.org.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Stat icon={<CalendarRange size={14} />} value={node.cohorts.length} label="cohorts" />
                <Stat icon={<GraduationCap size={14} />} value={node.learners.length} label="learners" />
                <Stat icon={<UsersRound size={14} />} value={node.facilitatorCount} label="facilitators" />
              </div>
              <Section title="Cohorts" />
              {node.cohorts.length === 0 ? (
                <EmptyHint text="No cohorts at this centre yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {node.cohorts.map(c => (
                    <Row
                      key={c.id}
                      icon={<CalendarRange size={16} />}
                      title={c.name}
                      subtitle={c.status}
                      badge={<Count n={c.learner_count} label="learners" />}
                      onClick={() => setSel({ kind: 'cohort', cohortId: c.id })}
                    />
                  ))}
                </div>
              )}
              <CrossLink label="Open Centres Register" onClick={() => onNavigate('centres')} />
            </div>
          ),
        };
      }

      // ── COHORT → learners ───────────────────────────────────────────
      case 'cohort': {
        const cohort = cohorts.get(sel.cohortId);
        if (!cohort) return { crumbs: [boardCrumb], content: <EmptyHint text="Cohort not found." /> };
        const learners = collectCohortLearners(tree, sel.cohortId);
        return {
          crumbs: [
            { label: 'Centre', onSelect: () => setSel({ kind: 'centre', centreId: cohort.centreId }) },
            { label: cohort.name, onSelect: () => setSel(sel) },
          ],
          content: (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">{cohort.name}</h3>
                <StatusPill status={cohort.status} />
              </div>
              <Section title={`Learners (${learners.length})`} />
              {learners.length === 0 ? (
                <EmptyHint text="No learners enrolled in this cohort yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {learners.map(l => (
                    <Row
                      key={l.id}
                      icon={<GraduationCap size={16} />}
                      title={l.name}
                      subtitle={l.status}
                      onClick={() => onNavigate('learners')}
                    />
                  ))}
                </div>
              )}
              <CrossLink label="Open Learner Register" onClick={() => onNavigate('learners')} />
            </div>
          ),
        };
      }
    }
  }, [state, sel, onNavigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Building the hierarchy…</p>
        </div>
      </div>
    );
  }
  if (error && !state) {
    return (
      <Card><CardContent className="p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </CardContent></Card>
    );
  }
  if (!state || !view) return null;

  const { tree } = state;

  return (
    <div className="space-y-4">
      {/* Header + breadcrumb trail */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <Network size={20} className="text-gold" /> Explore
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            The whole platform, nested — Board and partner organisations, down to learners and facilitators.
          </p>
        </div>
        <nav className="flex items-center gap-1 text-xs flex-wrap">
          {view.crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-muted-foreground" />}
              <button
                onClick={c.onSelect}
                className={cn(
                  'font-semibold rounded px-1.5 py-0.5 cursor-pointer border-none',
                  i === view.crumbs.length - 1
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {c.label}
              </button>
            </span>
          ))}
        </nav>
      </div>

      {!state.hierarchyReady && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Departments, multi-org centre links and LGA scopes are not in the database yet — run{' '}
            <code className="font-mono">supabase/setup_hierarchy.sql</code> to complete the picture.
          </span>
        </div>
      )}

      {/* Top-level branch picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row
          icon={<Landmark size={16} />}
          title="The Board"
          subtitle={`${tree.board.departments.length} departments · ${tree.board.programmes.length} board programmes`}
          badge={<Count n={tree.board.learnerCount} label="learners" />}
          onClick={() => setSel({ kind: 'board' })}
          accent={sel.kind === 'board'}
        />
        {tree.orgs.length > 0 ? (
          <Row
            icon={<Handshake size={16} />}
            title="Partner Organisations"
            subtitle={`${tree.orgs.length} organisations — pick one to drill down`}
            badge={<Count n={tree.orgs.reduce((s, o) => s + o.learnerCount, 0)} label="learners" />}
            onClick={() => setSel({ kind: 'org', orgId: tree.orgs[0].org.id })}
            accent={sel.kind === 'org'}
          />
        ) : (
          <Row
            icon={<Handshake size={16} />}
            title="Partner Organisations"
            subtitle="None registered yet"
            onClick={() => onNavigate('partners')}
          />
        )}
      </div>

      {view.content}
    </div>
  );
}

/** Centres in one LGA from every branch of the tree — the LGA view is global. */
function LgaCentres({
  tree, lga, onCentre,
}: {
  tree: ReturnType<typeof buildExploreTree>;
  lga: string;
  onCentre: (centreId: string) => void;
}) {
  const inLga = [...collectCentreNodes(tree).values()]
    .filter(cn => cn.centre.lga === lga)
    .sort((a, b) => a.centre.name.localeCompare(b.centre.name));
  if (inLga.length === 0) return <EmptyHint text={`No known centres in ${lga} yet.`} />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {inLga.map(cn => (
        <Row
          key={cn.centre.id}
          icon={<MapPin size={16} />}
          title={cn.centre.name}
          subtitle={`${cn.cohorts.length} cohorts · ${cn.learners.length} learners · ${cn.facilitatorCount} facilitators`}
          badge={<Count n={cn.learners.length} label="learners" />}
          onClick={() => onCentre(cn.centre.id)}
        />
      ))}
    </div>
  );
}

/** Learners of one cohort from anywhere in the tree (centres appear many times). */
function collectCohortLearners(tree: ReturnType<typeof buildExploreTree>, cohortId: string): ExploreLearner[] {
  const seen = new Set<string>();
  const out: ExploreLearner[] = [];
  const visit = (lgas: { centres: ExploreCentreNode[] }[]) => {
    for (const lga of lgas) {
      for (const cn of lga.centres) {
        for (const l of cn.learners) {
          if (l.cohortId === cohortId && !seen.has(l.id)) {
            seen.add(l.id);
            out.push(l);
          }
        }
      }
    }
  };
  visit(tree.board.programmes.flatMap(p => p.lgas));
  for (const org of tree.orgs) {
    visit(org.centresByLga);
    for (const pn of org.programmes) visit(pn.lgas);
  }
  return out;
}
