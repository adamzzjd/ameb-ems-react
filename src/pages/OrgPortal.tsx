import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router';
import {
  Building2, GraduationCap, CalendarRange, MapPin, Phone, Mail, ShieldCheck,
  UsersRound, Printer, ChevronDown, ChevronRight, Handshake, BookOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router';
import { supabase } from '../supabase/client';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadCohorts, dbLoadLearners, dbLoadProgrammes } from '../supabase/delivery';
import { dbLoadProgrammeLgas } from '../supabase/hierarchy';
import { dbLoadFacilitators, dbLoadCentreFacilitators } from '../supabase/facilitators';
import {
  dbLoadPartnerOrganisations, dbLoadCentreOrganisationLinks, dbLoadOrgLgaCoverage,
  dbLinkCentreToOrg, dbUpdateMyOrganisation,
} from '../supabase/partners';
import type {
  Centre, CentreFacilitator, CentreOrgLink, CohortOverviewRow, Facilitator, Learner,
  OrganisationMember, OrgLgaCoverage, PartnerOrganisation, Programme, ProgrammeLgaLink,
} from '../types';

interface Props {
  /** When true (board viewer), any org can be shown; partner users see their own. */
  boardView?: boolean;
}

type Tab = 'overview' | 'lgas' | 'programmes' | 'people' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'lgas', label: 'LGAs & Centres' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'people', label: 'People' },
  { id: 'profile', label: 'Organisation' },
];

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Open a print window with the AMEB header and auto-print. */
function printHtml(title: string, body: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;}
    .sheet{max-width:640px;margin:0 auto;}
    .hdr{background:var(--color-primary);padding:18px 20px;border-radius:8px 8px 0 0;}
    .org-name{font-size:10px;font-weight:800;color:#e1f5ee;text-transform:uppercase;letter-spacing:1.5px;}
    .cname{font-size:18px;font-weight:800;color:#fff;margin-top:4px;}
    .ctype{font-size:12px;color:rgba(255,255,255,.6);margin-top:2px;}
    .meta{display:grid;grid-template-columns:1fr 1fr;margin-top:10px;}
    .field{padding:8px 16px;border-bottom:1px solid #eef0f6;}
    .field:nth-child(odd){border-right:1px solid #eef0f6;}
    .fl{font-size:9px;font-weight:700;color:#8e99b0;text-transform:uppercase;letter-spacing:.4px;}
    .fv{font-size:12px;font-weight:600;margin-top:1px;}
    h3{font-size:12px;font-weight:800;color:var(--color-primary);text-transform:uppercase;letter-spacing:.6px;margin:14px 0 6px;}
    table{width:100%;border-collapse:collapse;}
    th{background:var(--color-surface-warm);padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:var(--color-text-muted);}
    td{padding:5px 8px;border-bottom:1px solid #eef0f6;font-size:11px;}
    .chip{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;background:#f1f5f9;margin:0 4px 4px 0;}
    .lga{margin-bottom:10px;}
    .lga-h{font-size:12px;font-weight:800;margin-bottom:4px;}
    .centre{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:6px;}
    .foot{margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#8e99b0;display:flex;justify-content:space-between;}
    @media print{body{padding:0;}@page{margin:.8cm;}}
  </style></head><body>
  <div class="sheet">${body}
  <div class="foot"><span>AMEB EMS — Partner Profile</span><span>Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
  </div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

/** One org's resolved world: profile + centres grouped by LGA + delivery rows. */
interface OrgWorld {
  org: PartnerOrganisation;
  membership: OrganisationMember | null;
  centres: Centre[];
  cohorts: CohortOverviewRow[];
  learners: Learner[];
  facilitators: Facilitator[];
  centreLinks: CentreFacilitator[];
  programmes: Programme[];
  programmeLgas: ProgrammeLgaLink[];
  /** Every centre↔org link — used to resolve which centres belong to this org. */
  centreOrgLinks: CentreOrgLink[];
  /** centre_id → the role this org holds there. */
  centreOrgRoles: Map<string, string>;
  coverage: OrgLgaCoverage[];
  /** Every centre, so the Board's "Link a centre" picker can offer unlinked ones. */
  allCentres: Centre[];
}

function groupByLga(world: OrgWorld) {
  const map = new Map<string, { centre: Centre; role: string; cohorts: CohortOverviewRow[]; learners: Learner[]; facilitators: Facilitator[] }[]>();
  const cohortsByCentre = new Map<string, CohortOverviewRow[]>();
  for (const c of world.cohorts) {
    const list = cohortsByCentre.get(c.centre_id) ?? [];
    list.push(c);
    cohortsByCentre.set(c.centre_id, list);
  }
  const cohortIds = new Set(world.cohorts.map(c => c.id));
  const learnersByCohort = new Map<string, Learner[]>();
  for (const l of world.learners) {
    if (!l.cohort_id || !cohortIds.has(l.cohort_id)) continue;
    const list = learnersByCohort.get(l.cohort_id) ?? [];
    list.push(l);
    learnersByCohort.set(l.cohort_id, list);
  }
  const facByCentre = new Map<string, Facilitator[]>();
  for (const link of world.centreLinks) {
    const f = world.facilitators.find(x => x.id === link.facilitator_id);
    if (f) {
      const list = facByCentre.get(link.centre_id) ?? [];
      list.push(f);
      facByCentre.set(link.centre_id, list);
    }
  }
  for (const centre of world.centres) {
    const lga = centre.lga || 'Unknown LGA';
    const node = map.get(lga) ?? [];
    const cohorts = cohortsByCentre.get(centre.id) ?? [];
    node.push({
      centre,
      role: world.centreOrgRoles.get(centre.id) || 'partner',
      cohorts,
      learners: cohorts.flatMap(c => learnersByCohort.get(c.id) ?? []),
      facilitators: facByCentre.get(centre.id) ?? [],
    });
    map.set(lga, node);
  }
  // LGAs the organisation says it works in must appear even before it has
  // registered a centre there — otherwise the tree hides where it intends to
  // operate. Registered-centre LGAs win the sort position.
  for (const row of world.coverage.filter(c => c.org_id === world.org.id)) {
    if (row.lga && !map.has(row.lga)) map.set(row.lga, []);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function OrgPortal({ boardView = false }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  // Board users can open /portal/org-portal?org=<id> for any org; partner
  // users always resolve their own org from their membership row.
  const requestedOrgId = new URLSearchParams(location.search).get('org');

  const [world, setWorld] = useState<OrgWorld | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [openLgas, setOpenLgas] = useState<Set<string>>(new Set());
  // Board's "Link a centre" picker (boardView only): which LGA is being
  // populated, and the role to register the centre under.
  const [linkLga, setLinkLga] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState<'lead' | 'partner' | 'funder' | 'host'>('lead');
  const [linking, setLinking] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Organisation profile self-service (Phase 30.2) — contact fields only.
  const [profileForm, setProfileForm] = useState({
    contact_person: '', phone: '', email: '', address: '', mou_reference: '', remarks: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [openCentres, setOpenCentres] = useState<Set<string>>(new Set());
  // Board directory (boardView without ?org=): all orgs to pick from.
  const [directory, setDirectory] = useState<{
    orgs: PartnerOrganisation[];
    links: { centre_id: string; org_id: string }[];
    coverage: { org_id: string; lga: string }[];
    centres: Centre[];
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      let orgRow: PartnerOrganisation | null = null;
      let membership: OrganisationMember | null = null;

      if (boardView && requestedOrgId) {
        const { data } = await supabase
          .from('partner_organisations')
          .select('*')
          .eq('id', requestedOrgId)
          .maybeSingle();
        orgRow = (data as PartnerOrganisation) ?? null;
      } else {
        const userId = user?.id;
        if (userId) {
          const { data: m } = await supabase
            .from('organisation_members')
            .select('*')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
          if (!active) return;
          membership = (m as OrganisationMember) ?? null;
          if (membership) {
            const { data: orgData } = await supabase
              .from('partner_organisations')
              .select('*')
              .eq('id', membership.organisation_id)
              .maybeSingle();
            orgRow = (orgData as PartnerOrganisation) ?? null;
          }
        }
      }

      if (!orgRow) {
        // Board directory mode: no ?org= chosen yet — list every organisation
        // so the Board can open any org's world (click Unicef → its LGAs).
        if (boardView) {
          const [orgsRes, linksRes, covRes, centresRes] = await Promise.all([
            dbLoadPartnerOrganisations(),
            dbLoadCentreOrganisationLinks(),
            dbLoadOrgLgaCoverage(),
            dbLoadCentres(),
          ]);
          if (!active) return;
          setDirectory({
            orgs: orgsRes.data ?? [],
            links: linksRes.data ?? [],
            coverage: covRes.data ?? [],
            centres: centresRes.data ?? [],
          });
        }
        if (active) { setWorld(null); setLoading(false); }
        return;
      }

      const [c, co, l, f, cf, progs, plgas, links, cov] = await Promise.all([
        dbLoadCentres(),
        dbLoadCohorts(),
        dbLoadLearners(),
        dbLoadFacilitators(),
        dbLoadCentreFacilitators(),
        dbLoadProgrammes(),
        dbLoadProgrammeLgas(),
        dbLoadCentreOrganisationLinks(),
        dbLoadOrgLgaCoverage(),
      ]);
      if (!active) return;
      // RLS scopes these to the org for partner users; board viewers filter
      // explicitly via the org-links join when available.
      const own = <T extends { owner_org_id?: string | null }>(rows: T[]) =>
        boardView ? rows.filter(r => r.owner_org_id === orgRow!.id) : (rows ?? []);

      // A centre belongs to THIS organisation's world only once it has been
      // registered to it (centre_organisations) — any role counts. Without
      // this the tree used to show every board centre in every covered LGA.
      const allLinks = links.data ?? [];
      const myLinks = allLinks.filter(lk => lk.org_id === orgRow!.id);
      const centreOrgRoles = new Map<string, string>(myLinks.map(lk => [lk.centre_id, lk.role]));
      const myCentreIds = new Set(centreOrgRoles.keys());
      const registered = (c.data ?? []).filter(x => myCentreIds.has(x.id));

      setWorld({
        org: orgRow,
        membership,
        centres: registered,
        cohorts: own(co.data ?? []) as CohortOverviewRow[],
        learners: own(l.data ?? []) as Learner[],
        facilitators: f.data ?? [],
        centreLinks: cf.data ?? [],
        programmes: own(progs.data ?? []) as Programme[],
        programmeLgas: plgas ?? [],
        centreOrgLinks: allLinks,
        centreOrgRoles,
        coverage: cov.data ?? [],
        allCentres: c.data ?? [],
      });
      // Start with every LGA expanded.
      const lgaKeys = new Set<string>(registered.map((x: Centre) => x.lga || 'Unknown LGA'));
      setOpenLgas(lgaKeys);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id, boardView, requestedOrgId, reloadKey]);

  const byLga = useMemo(() => (world ? groupByLga(world) : []), [world]);

  // Seed the profile form from the loaded organisation (Phase 30.2).
  useEffect(() => {
    if (!world?.org) return;
    setProfileForm({
      contact_person: world.org.contact_person ?? '',
      phone: world.org.phone ?? '',
      email: world.org.email ?? '',
      address: world.org.address ?? '',
      mou_reference: world.org.mou_reference ?? '',
      remarks: world.org.remarks ?? '',
    });
  }, [world?.org]);

  const saveProfile = async () => {
    if (!world) return;
    setSavingProfile(true);
    const { error } = await dbUpdateMyOrganisation(world.org.id, profileForm);
    setSavingProfile(false);
    if (error) { alert(`Could not save: ${error.message}`); return; }
    setReloadKey(k => k + 1);
  };
  // Centres in the LGA being populated that no organisation owns yet — the
  // only ones the Board may register from here.
  const linkedCentreIds = useMemo(
    () => new Set((world?.centreOrgLinks ?? []).map(l => l.centre_id)),
    [world],
  );
  const awaitingOrg = useCallback((lga: string) =>
    (world?.allCentres ?? []).filter(
      x => (x.lga || 'Unknown LGA') === lga && !linkedCentreIds.has(x.id),
    ), [world, linkedCentreIds]);
  const pickerLgas = linkLga ? awaitingOrg(linkLga) : [];

  const handleLink = async (centreId: string) => {
    if (!world) return;
    setLinking(centreId);
    const { error } = await dbLinkCentreToOrg(centreId, world.org.id, linkRole);
    setLinking(null);
    if (error) { alert(`Could not register the centre: ${error.message}`); return; }
    setLinkLga(null);
    setReloadKey(k => k + 1);
  };
  const activeLearners = world?.learners.filter(l => l.status === 'active').length ?? 0;
  const runningCohorts = world?.cohorts.filter(c => c.cohort_status === 'running').length ?? 0;
  const facilitatorCount = useMemo(() => {
    if (!world) return 0;
    const centreIds = new Set(world.centres.map(c => c.id));
    return new Set(world.centreLinks.filter(l => centreIds.has(l.centre_id)).map(l => l.facilitator_id)).size;
  }, [world]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading your organisation…</p>;
  }

  if (!world && boardView && directory) {
    // ── Board: pick an organisation to open ──
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <Handshake size={20} className="text-gold" /> Partner organisations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open an organisation to see its LGAs, centres, learners and facilitators — exactly what the partner sees.
          </p>
        </div>
        {directory.orgs.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
            <ShieldCheck size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No partner organisations registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {directory.orgs.map(o => {
              const centreIds = new Set(directory.links.filter(l => l.org_id === o.id).map(l => l.centre_id));
              const lgas = [...new Set(directory.coverage.filter(c => c.org_id === o.id).map(c => c.lga))];
              return (
                <button key={o.id} onClick={() => navigate('/portal/partner-home?org=' + o.id)}
                  className="rounded-xl border p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-bold">{o.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{o.type}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {centreIds.size} centre{centreIds.size !== 1 ? 's' : ''} linked
                    {lgas.length > 0 && <> · covers {lgas.slice(0, 3).join(', ')}{lgas.length > 3 ? ` +${lgas.length - 3}` : ''}</>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!world) {
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

  const { org } = world;

  const toggleLga = (lga: string) =>
    setOpenLgas(prev => { const n = new Set(prev); n.has(lga) ? n.delete(lga) : n.add(lga); return n; });
  const toggleCentre = (id: string) =>
    setOpenCentres(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Print: full org profile (all LGAs / centres / learners / facilitators) ──
  const printOrgProfile = () => {
    const groups = byLga;
    const lgaBlocks = groups.map(([lga, centres]) => `
      <div class="lga">
        <div class="lga-h">📍 ${esc(lga)} — ${centres.length} centre${centres.length !== 1 ? 's' : ''}</div>
        ${centres.length === 0 ? '<div style="font-size:11px;color:#8e99b0;margin-bottom:6px;">No centres registered to this organisation in this LGA.</div>' : ''}
        ${centres.map(({ centre, role, cohorts, learners, facilitators }) => `
          <div class="centre">
            <strong>${esc(centre.name)}</strong>
            <span class="chip">${esc(role)}</span>
            <span style="color:#8e99b0;"> · ${esc(centre.ward || '')} ${esc(centre.community || '')}</span>
            <div style="margin-top:3px;color:#475569;">
              ${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''} · ${learners.length} learner${learners.length !== 1 ? 's' : ''}
              ${facilitators.length ? ` · ${facilitators.map(f => esc(f.name)).join(', ')}` : ' · no facilitators yet'}
            </div>
            ${learners.length ? `<table style="margin-top:5px;"><thead><tr><th>Learner</th><th>Group</th><th>Status</th><th>Cohort</th></tr></thead><tbody>
              ${learners.map(l => `<tr><td>${esc(l.full_name)}</td><td>${esc(l.age_group || '—')}</td><td>${esc(l.status)}</td><td>${esc(cohorts.find(c => c.id === l.cohort_id)?.name || '—')}</td></tr>`).join('')}
            </tbody></table>` : ''}
          </div>`).join('')}
      </div>`).join('');

    printHtml(org.name, `
      <div class="hdr">
        <div class="org-name">Adamawa State Mass Education Board — Partner Profile</div>
        <div class="cname">${esc(org.name)}</div>
        <div class="ctype">${esc(org.type)} · ${esc(org.status)}</div>
      </div>
      <div class="meta">
        <div class="field"><div class="fl">Contact</div><div class="fv">${esc(org.contact_person || '—')}</div></div>
        <div class="field"><div class="fl">Phone</div><div class="fv">${esc(org.phone || '—')}</div></div>
        <div class="field"><div class="fl">Email</div><div class="fv">${esc(org.email || '—')}</div></div>
        <div class="field"><div class="fl">HQ LGA</div><div class="fv">${esc(org.lga || '—')}</div></div>
        <div class="field"><div class="fl">MOU Ref</div><div class="fv">${esc(org.mou_reference || '—')}</div></div>
        <div class="field"><div class="fl">Agreement</div><div class="fv">${esc(org.agreement_start || '—')} → ${esc(org.agreement_end || '—')}</div></div>
      </div>
      <h3>Delivery Summary</h3>
      <div class="chip">${world.centres.length} centres</div>
      <div class="chip">${world.cohorts.length} cohorts (${runningCohorts} running)</div>
      <div class="chip">${world.learners.length} learners (${activeLearners} active)</div>
      <div class="chip">${facilitatorCount} facilitators</div>
      ${groups.length ? lgaBlocks : '<p style="margin-top:10px;color:#8e99b0;">No centres linked yet.</p>'}
    `);
  };

  // ── Print: single centre sheet ──
  const printCentreSheet = (lga: string, node: { centre: Centre; cohorts: CohortOverviewRow[]; learners: Learner[]; facilitators: Facilitator[] }) => {
    printHtml(node.centre.name, `
      <div class="hdr">
        <div class="org-name">Adamawa State Mass Education Board — Centre Sheet</div>
        <div class="cname">${esc(node.centre.name)}</div>
        <div class="ctype">${esc(node.centre.type || '—')} · ${esc(lga)}</div>
      </div>
      <div class="meta">
        <div class="field"><div class="fl">Ward</div><div class="fv">${esc(node.centre.ward || '—')}</div></div>
        <div class="field"><div class="fl">Community</div><div class="fv">${esc(node.centre.community || '—')}</div></div>
        <div class="field"><div class="fl">Capacity</div><div class="fv">${node.centre.capacity != null ? node.centre.capacity : '—'}</div></div>
        <div class="field"><div class="fl">Phone</div><div class="fv">${esc(node.centre.phone || '—')}</div></div>
        <div class="field"><div class="fl">Status</div><div class="fv">${esc(node.centre.status || '—')}</div></div>
        <div class="field"><div class="fl">Partner</div><div class="fv">${esc(org.name)}</div></div>
      </div>
      <h3>Facilitators (${node.facilitators.length})</h3>
      ${node.facilitators.length
        ? node.facilitators.map(f => `<div class="chip">🧑‍🏫 ${esc(f.name)}${f.phone ? ` · ${esc(f.phone)}` : ''}</div>`).join('')
        : '<p style="color:#8e99b0;">None assigned yet.</p>'}
      <h3>Cohorts & Learners (${node.learners.length})</h3>
      ${node.cohorts.length ? node.cohorts.map(c => `
        <div class="centre">
          <strong>${esc(c.name)}</strong>
          <span style="color:#8e99b0;"> · ${esc(c.cohort_status)} · ${c.start_date || '—'} → ${c.end_date || '—'}</span>
          ${(learnersByCohort(node.learners, c.id)).length ? `<table style="margin-top:5px;"><thead><tr><th>Learner</th><th>Group</th><th>Status</th></tr></thead><tbody>
            ${learnersByCohort(node.learners, c.id).map(l => `<tr><td>${esc(l.full_name)}</td><td>${esc(l.age_group || '—')}</td><td>${esc(l.status)}</td></tr>`).join('')}
          </tbody></table>` : '<div style="color:#8e99b0;margin-top:3px;">No learners enrolled yet.</div>'}
        </div>`).join('') : '<p style="color:#8e99b0;">No cohorts at this centre yet.</p>'}
    `);
  };

  const learnersByCohort = (learners: Learner[], cohortId: string) => learners.filter(l => l.cohort_id === cohortId);

  const statusPill = (s: string | null | undefined) => (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      s === 'approved' || s === 'active' ? 'bg-green-100 text-green-700' :
      s === 'rejected' ? 'bg-red-100 text-red-700' :
      s === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
    }`}>{s ?? 'approved'}</span>
  );

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden"
              style={{ background: 'var(--color-primary)' }}>
              {org.logo ? <img src={org.logo} alt={org.name} className="w-full h-full object-cover" /> : org.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-0.5 flex items-center gap-1.5">
                <Handshake size={12} /> {org.type} · Partner
              </div>
              <h2 className="font-heading text-xl font-bold truncate">{org.name}</h2>
              <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                {org.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {org.phone}</span>}
                {org.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {org.email}</span>}
                {org.lga && <span className="inline-flex items-center gap-1"><MapPin size={12} /> HQ: {org.lga}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={printOrgProfile}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <Printer size={13} /> Print Profile
            </button>
          </div>
        </div>
        {org.status !== 'active' && (
          <div className="mt-4 rounded-lg px-3.5 py-2.5 text-[13px] bg-amber-50 text-amber-800 border border-amber-200">
            This organisation is currently <strong>{org.status}</strong> — some actions may be restricted.
          </div>
        )}
        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Our Centres', value: world.centres.length, icon: <Building2 size={18} /> },
              { label: 'Cohorts', value: world.cohorts.length, icon: <CalendarRange size={18} />, sub: `${runningCohorts} running` },
              { label: 'Learners', value: world.learners.length, icon: <GraduationCap size={18} />, sub: `${activeLearners} active` },
              { label: 'Facilitators', value: facilitatorCount, icon: <UsersRound size={18} /> },
            ].map(s => (
              <div key={s.label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.icon} {s.label}</div>
                <div className="text-2xl font-heading font-bold mt-1.5">{s.value}</div>
                {s.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>
          {world.membership && (
            <div className="text-[12px] text-muted-foreground">
              You are signed in as <strong>{world.membership.org_role.replace('org_', '')}</strong> of this organisation.
            </div>
          )}
          {world.programmes.length > 0 && (
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="font-heading text-[15px] font-bold mb-3">Our Programmes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {world.programmes.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-[13px] border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-[11px] text-muted-foreground">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LGAs & Centres (the drill-down) ── */}
      {tab === 'lgas' && (
        <div className="space-y-3">
          {byLga.length === 0 ? (
            <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
              <MapPin size={28} className="mx-auto mb-2 text-muted-foreground" />
              {boardView ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    No centres are registered to <strong>{world?.org.name}</strong> yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Register a centre from the Learning Centres page, or set the organisation's LGA coverage so it
                    appears here first.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your organisation has no centres registered yet. The Board office registers each centre to your
                  organisation — please contact them.
                </p>
              )}
            </div>
          ) : byLga.map(([lga, centres]) => (
            <div key={lga} className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <button onClick={() => toggleLga(lga)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-none text-left"
                style={{ background: 'var(--color-surface-warm)' }}>
                <span className="flex items-center gap-2 text-[14px] font-bold">
                  {openLgas.has(lga) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  📍 {lga}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {centres.length} centre{centres.length !== 1 ? 's' : ''} · {centres.reduce((s, n) => s + n.learners.length, 0)} learners
                </span>
              </button>
              {openLgas.has(lga) && (
                <div className="p-3 space-y-2">
                  {centres.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-[12px] text-muted-foreground">
                        No centres registered in {lga} for {org.name} yet.
                      </p>
                      {boardView ? (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Only centres registered to this organisation appear here.
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Ask the Board office to register your centres here.
                        </p>
                      )}
                    </div>
                  )}
                  {centres.map(node => (
                    <div key={node.centre.id} className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                      <button onClick={() => toggleCentre(node.centre.id)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer border-none text-left">
                        <span className="flex items-center gap-2 text-[13px] font-semibold">
                          {openCentres.has(node.centre.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {node.centre.name}
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700">
                            {node.role}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {node.learners.length} learners · {node.facilitators.length} facilitators
                          <Printer size={12} className="opacity-50" />
                        </span>
                      </button>
                      {openCentres.has(node.centre.id) && (
                        <div className="px-3.5 pb-3.5 space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {statusPill(node.centre.approval_status)}
                            {node.centre.ward && <span className="text-[11px] text-muted-foreground">Ward {node.centre.ward}</span>}
                            {node.centre.community && <span className="text-[11px] text-muted-foreground">· {node.centre.community}</span>}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Facilitators</div>
                            {node.facilitators.length === 0 ? (
                              <p className="text-[12px] text-muted-foreground">None assigned yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {node.facilitators.map(f => (
                                  <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">
                                    🧑‍🏫 {f.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {node.cohorts.map(c => (
                            <div key={c.id} className="rounded-md border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
                              <div className="flex items-center justify-between text-[12px] font-semibold">
                                <span>{c.name}</span>
                                <span className="text-[11px] font-normal text-muted-foreground">{c.cohort_status} · {c.learner_count} learners</span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {learnersByCohort(node.learners, c.id).slice(0, 12).map(l => (
                                  <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{l.full_name}</span>
                                ))}
                                {learnersByCohort(node.learners, c.id).length > 12 && (
                                  <span className="text-[10px] text-muted-foreground self-center">+{learnersByCohort(node.learners, c.id).length - 12} more on the printout</span>
                                )}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => printCentreSheet(lga, node)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            <Printer size={12} /> Print centre sheet
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {boardView && awaitingOrg(lga).length > 0 && (
                    <button onClick={() => { setLinkLga(lga); setLinkRole('lead'); }}
                      className="inline-flex items-center gap-1.5 w-full justify-center text-[12px] font-semibold border border-dashed py-2 rounded-lg hover:bg-muted/50 transition-colors"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <Handshake size={13} /> Link a centre in {lga}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({awaitingOrg(lga).length} not yet registered to any organisation)
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Programmes ── */}
      {tab === 'programmes' && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-3">Programmes we own</h3>
          {world.programmes.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No programmes yet — the Board can register one for you, or you can request one.</p>
          ) : (
            <div className="space-y-2">
              {world.programmes.map(p => {
                const scope = world.programmeLgas.filter(pl => pl.programme_id === p.id).map(pl => pl.lga);
                const cohorts = world.cohorts.filter(c => c.programme_id === p.id);
                return (
                  <div key={p.id} className="border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold flex items-center gap-1.5"><BookOpen size={13} /> {p.title}</span>
                      <span className="text-[11px] text-muted-foreground">{p.status}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {cohorts.length} cohort{cohorts.length !== 1 ? 's' : ''}
                      {scope.length > 0 && <> · scope: {scope.join(', ')}</>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── People ── */}
      {tab === 'people' && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-heading text-[15px] font-bold mb-3">Facilitators across our centres</h3>
          {facilitatorCount === 0 ? (
            <p className="text-[13px] text-muted-foreground">No facilitators assigned yet — manage them from the Facilitators page.</p>
          ) : (
            <div className="space-y-2">
              {[...new Map(
                byLga.flatMap(([, centres]) => centres).flatMap(n => n.facilitators).map(f => [f.id, f] as const),
              ).values()].map(f => (
                <div key={f.id} className="flex items-center justify-between text-[13px] border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-semibold">🧑‍🏫 {f.name}</span>
                  <span className="text-[11px] text-muted-foreground">{f.phone || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Organisation profile — self-service for partners (Phase 30.2) ── */}
      {tab === 'profile' && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="font-heading text-[15px] font-bold">Organisation details</h3>
            <p className="text-[12px] text-muted-foreground">
              {boardView
                ? 'Read-only here — the Board edits registrations on the Organisations page.'
                : 'Keep your contact details current. Status, type and registration number are maintained by the Board.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['contact_person', 'Contact person'],
              ['phone', 'Phone'],
              ['email', 'Email'],
              ['address', 'Address'],
              ['mou_reference', 'MOU reference'],
              ['remarks', 'Remarks'],
            ] as const).map(([key, label]) => (
              <label key={key} className={`block ${key === 'address' || key === 'remarks' ? 'sm:col-span-2' : ''}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                {key === 'address' || key === 'remarks'
                  ? <textarea rows={2} value={profileForm[key]} readOnly={boardView}
                      onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60" style={{ borderColor: 'var(--color-border)' }} />
                  : <input value={profileForm[key]} readOnly={boardView}
                      onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60" style={{ borderColor: 'var(--color-border)' }} />}
              </label>
            ))}
          </div>
          {!boardView && (
            <button onClick={saveProfile} disabled={savingProfile}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {savingProfile ? 'Saving…' : 'Save details'}
            </button>
          )}
        </div>
      )}

      {/* ── Link a centre to this organisation (Board only) ── */}
      {linkLga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,.45)' }}
          onClick={() => setLinkLga(null)}>
          <div className="w-full max-w-lg rounded-xl border bg-white shadow-xl"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-heading text-[15px] font-bold">Register a centre in {linkLga}</h3>
                <p className="text-[11px] text-muted-foreground">
                  Only centres not yet registered to any organisation are listed.
                </p>
              </div>
              <button onClick={() => setLinkLga(null)} className="text-xs font-semibold text-muted-foreground hover:underline">Close</button>
            </div>
            <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Register as</span>
              <select value={linkRole} onChange={e => setLinkRole(e.target.value as typeof linkRole)}
                className="text-[12px] rounded-lg border px-2 py-1" style={{ borderColor: 'var(--color-border)' }}>
                <option value="lead">Lead — the org owns/operates it</option>
                <option value="partner">Partner — co-delivers</option>
                <option value="funder">Funder — sponsors</option>
                <option value="host">Host — provides the venue</option>
              </select>
            </div>
            <div className="px-5 py-3 max-h-[50vh] overflow-y-auto space-y-1.5">
              {pickerLgas.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-6">
                  Every centre in {linkLga} is already registered to an organisation.
                </p>
              ) : pickerLgas.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <div className="text-[13px] font-semibold">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[c.ward, c.community, c.type].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <button onClick={() => handleLink(c.id)} disabled={linking === c.id}
                    className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                    {linking === c.id ? 'Linking…' : 'Register'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
