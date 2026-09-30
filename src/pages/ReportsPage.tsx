import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dbLoadCohorts, dbLoadLearners, dbLoadProgrammes } from '../supabase/delivery';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadEnrolmentStats } from '../supabase/enrolments';
import { dbLoadSubmissions } from '../supabase/forms';
import type { CohortOverviewRow, EnrolmentStat, FormSubmission, Learner, Programme } from '../types';
import { BarChart3, BookOpen, GraduationCap, MapPin, ClipboardList } from 'lucide-react';

interface Props {
  /** True for board staff — adds the centre/LGA tables. */
  isBoard: boolean;
}

interface GroupedRow { label: string; count: number }

function topRows(rows: GroupedRow[], n = 8): GroupedRow[] {
  return rows.sort((a, b) => b.count - a.count).slice(0, n);
}

function Bar({ row, max, color }: { row: GroupedRow; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-[12px] font-semibold">{row.label || '—'}</span>
      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${max ? (row.count / max) * 100 : 0}%`, background: color }} />
      </div>
      <span className="w-10 text-right text-[12px] font-bold">{row.count}</span>
    </div>
  );
}

/** Reports & M&E — read-only cross-cutting dashboard for delivery data. */
export function ReportsPage({ isBoard }: Props) {
  const { can } = useAuth();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<CohortOverviewRow[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [centres, setCentres] = useState<{ id: string; name: string; lga: string }[]>([]);
  const [enrolmentStats, setEnrolmentStats] = useState<EnrolmentStat[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, c, l, ct, es, subs] = await Promise.all([
        dbLoadProgrammes(), dbLoadCohorts(), dbLoadLearners(), dbLoadCentres(), dbLoadEnrolmentStats(), dbLoadSubmissions(),
      ]);
      if (!active) return;
      // The cohorts/learners calls fail cleanly on DBs that haven't run
      // setup_delivery.sql yet — degrade to zeros instead of erroring hard.
      setProgrammes(p.data ?? []);
      setCohorts(c.data ?? []);
      setLearners(l.data ?? []);
      setCentres((ct.data ?? []).map(x => ({ id: x.id, name: x.name, lga: x.lga })));
      setEnrolmentStats(es.data ?? []);
      // Forms may not exist yet (setup_forms.sql not run) — degrade to zeros.
      setSubmissions(subs.data ?? []);
      if (p.error && c.error && l.error) {
        setError('Delivery data is not available — has setup_delivery.sql been run?');
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const byStatus = (s: string) => learners.filter(l => l.status === s).length;
    const learnersByLga = new Map<string, number>();
    for (const l of learners) {
      const k = l.lga || 'Not stated';
      learnersByLga.set(k, (learnersByLga.get(k) ?? 0) + 1);
    }
    const learnersByProgramme = new Map<string, number>();
    for (const l of learners) {
      const c = l.cohort_id ? cohorts.find(x => x.id === l.cohort_id) : undefined;
      const k = c?.programme_title ?? 'Unassigned';
      learnersByProgramme.set(k, (learnersByProgramme.get(k) ?? 0) + 1);
    }
    const learnersByGender = { male: 0, female: 0, other: 0 };
    for (const l of learners) {
      if (l.gender === 'Male') learnersByGender.male++;
      else if (l.gender === 'Female') learnersByGender.female++;
      else learnersByGender.other++;
    }
    return {
      programmes: programmes.length,
      activeProgrammes: programmes.filter(p => p.status === 'active').length,
      cohorts: cohorts.length,
      runningCohorts: cohorts.filter(c => c.cohort_status === 'running').length,
      learners: learners.length,
      active: byStatus('active'),
      completed: byStatus('completed'),
      dropped: byStatus('dropped_out'),
      transferred: byStatus('transferred'),
      centres: centres.length,
      learnersByLga: topRows([...learnersByLga].map(([label, count]) => ({ label, count }))),
      learnersByProgramme: topRows([...learnersByProgramme].map(([label, count]) => ({ label, count }))),
      learnersByGender,
      cmsEnrolments: enrolmentStats.reduce((s, r) => s + (r.learners_enrolled || 0), 0),
    };
  }, [programmes, cohorts, learners, centres, enrolmentStats]);

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading reports…</p>;

  const cards = [
    { label: 'Programmes', value: stats.programmes, sub: `${stats.activeProgrammes} active`, icon: <BookOpen size={18} /> },
    { label: 'Cohorts', value: stats.cohorts, sub: `${stats.runningCohorts} running`, icon: <BarChart3 size={18} /> },
    { label: 'Learners', value: stats.learners, sub: `${stats.active} active`, icon: <GraduationCap size={18} /> },
    ...(isBoard ? [{ label: 'Centres', value: stats.centres, sub: 'in the register', icon: <MapPin size={18} /> }] : []),
  ];

  const maxLga = Math.max(1, ...stats.learnersByLga.map(r => r.count));
  const maxProg = Math.max(1, ...stats.learnersByProgramme.map(r => r.count));

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border px-4 py-3 text-[13px]" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
          {error}
        </div>
      )}

      {/* Headline cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {c.icon} {c.label}
            </div>
            <div className="text-2xl font-heading font-bold mt-1.5">{c.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Learner outcomes */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h3 className="font-heading text-[15px] font-bold mb-4">Learner Outcomes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active', value: stats.active, color: 'bg-green-500' },
            { label: 'Completed', value: stats.completed, color: 'bg-blue-500' },
            { label: 'Dropped Out', value: stats.dropped, color: 'bg-red-500' },
            { label: 'Transferred', value: stats.transferred, color: 'bg-amber-500' },
          ].map(o => (
            <div key={o.label} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{o.label}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${o.color}`} />
                <span className="text-xl font-heading font-bold">{o.value}</span>
                <span className="text-[11px] text-muted-foreground">
                  {stats.learners ? `${Math.round((o.value / stats.learners) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Gender split — Male {stats.learnersByGender.male} · Female {stats.learnersByGender.female} · Not stated {stats.learnersByGender.other}
          {can('enrolments.manage') && stats.cmsEnrolments > 0 && ` · CMS historical enrolments: ${stats.cmsEnrolments.toLocaleString()}`}
        </p>
      </div>

      {/* Distribution bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-4">Learners by LGA</h3>
          {stats.learnersByLga.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No learner data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.learnersByLga.map(r => <Bar key={r.label} row={r} max={maxLga} color="var(--color-primary)" />)}
            </div>
          )}
        </div>
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-4">Learners by Programme</h3>
          {stats.learnersByProgramme.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No learner data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.learnersByProgramme.map(r => <Bar key={r.label} row={r} max={maxProg} color="var(--color-gold)" />)}
            </div>
          )}
        </div>
      </div>

      {/* Field data (approved submissions only — Decision B) */}
      {submissions.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-4 flex items-center gap-2"><ClipboardList size={16} /> Field Data</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: submissions.length, tone: 'bg-muted text-muted-foreground' },
              { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, tone: 'bg-green-100 text-green-700' },
              { label: 'Awaiting review', value: submissions.filter(s => s.status === 'submitted').length, tone: 'bg-blue-100 text-blue-700' },
              { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length, tone: 'bg-red-100 text-red-700' },
            ].map(c => (
              <div key={c.label} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${c.tone}`}>{c.label}</div>
                <div className="text-xl font-heading font-bold mt-1.5">{c.value}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">M&E counts approved submissions only. Manage forms under Data Collection → Form Builder.</p>
        </div>
      )}

      {isBoard && cohorts.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-4">Cohort Fill Rate</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="px-3 py-2 font-bold">Cohort</th>
                  <th className="px-3 py-2 font-bold">Centre</th>
                  <th className="px-3 py-2 font-bold text-right">Learners</th>
                  <th className="px-3 py-2 font-bold text-right">Capacity</th>
                  <th className="px-3 py-2 font-bold">Fill</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-semibold">{c.name || c.programme_title}</td>
                    <td className="px-3 py-2 text-[12px]">{c.centre_name}</td>
                    <td className="px-3 py-2 text-right">{c.learner_count}</td>
                    <td className="px-3 py-2 text-right">{c.capacity ?? '—'}</td>
                    <td className="px-3 py-2 w-40">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary"
                          style={{ width: `${c.capacity ? Math.min(100, (c.learner_count / c.capacity) * 100) : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
