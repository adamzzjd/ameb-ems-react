// Phase 28 — Explore navigator tree model (pure, unit-tested).
// Turns flat register rows into the drill-down chain:
//   Board ▸ Departments ▸ Staff          Board Programmes ▸ Cohorts ▸ Learners
//   Organisation ▸ Programmes ▸ LGAs ▸ Centres ▸ Cohorts / Learners / Facilitators

export interface ExploreCentre {
  id: string;
  name: string;
  lga: string;
  owner_type?: string | null;
}

export interface ExploreProgramme {
  id: string;
  title: string;
  owner_org_id: string | null;
  status: string;
  category?: string | null;
}

export interface ExploreCohort {
  id: string;
  name: string;
  programme_id: string;
  centre_id: string;
  status: string;
  learner_count: number;
}

export interface ExploreLearnerRow {
  id: string;
  full_name: string;
  cohort_id: string | null;
  status: string;
}

export interface ExploreOrg {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface ExploreDepartment {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

export interface ExploreStaffRow {
  id: string;
  name: string;
  department_id: string | null;
  grade: string | null;
  station: string | null;
}

export interface ExploreInput {
  departments: ExploreDepartment[];
  staff: ExploreStaffRow[];
  orgs: ExploreOrg[];
  centreOrgs: { centre_id: string; org_id: string; role: string }[];
  orgCoverage: { org_id: string; lga: string }[];
  programmeLgas: { programme_id: string; lga: string }[];
  programmes: ExploreProgramme[];
  cohorts: ExploreCohort[];
  learners: ExploreLearnerRow[];
  centres: ExploreCentre[];
  facilitatorsByCentre: Map<string, number>;
}

export interface ExploreLearner {
  id: string;
  name: string;
  status: string;
  cohortId: string;
}

export interface ExploreFacilitatorGroup {
  count: number;
}

export interface ExploreCentreNode {
  centre: ExploreCentre;
  cohorts: ExploreCohort[];
  learners: ExploreLearner[];
  facilitatorCount: number;
}

export interface ExploreLgaNode {
  lga: string;
  centres: ExploreCentreNode[];
}

export interface ExploreProgrammeNode {
  programme: ExploreProgramme;
  lgas: ExploreLgaNode[];
  learnerCount: number;
}

export interface ExploreOrgNode {
  org: ExploreOrg;
  coverage: string[];
  programmes: ExploreProgrammeNode[];
  /** Centres this org is involved with (lead or partner), grouped by LGA. */
  centresByLga: ExploreLgaNode[];
  learnerCount: number;
}

export interface ExploreStaffGroup {
  department: ExploreDepartment;
  staff: ExploreStaffRow[];
}

export interface ExploreBoardNode {
  departments: ExploreStaffGroup[];
  unassignedCount: number;
  programmes: ExploreProgrammeNode[];
  learnerCount: number;
}

export interface ExploreTree {
  board: ExploreBoardNode;
  orgs: ExploreOrgNode[];
}

/** Comparator factory: sort by a string key extracted from each item. */
function byString<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b));
}

/**
 * Group centres (with their cohort/learner/facilitator detail) by LGA.
 * Shared by the org branch and the programme branch.
 */
function groupCentresByLga(
  centres: ExploreCentre[],
  cohorts: ExploreCohort[],
  learners: ExploreLearnerRow[],
  facilitatorsByCentre: Map<string, number>,
): ExploreLgaNode[] {
  const centreIds = new Set(centres.map(c => c.id));

  const relevantCohorts = cohorts.filter(c => centreIds.has(c.centre_id));
  const cohortIds = new Set(relevantCohorts.map(c => c.id));
  const relevantLearners = learners.filter(l => l.cohort_id && cohortIds.has(l.cohort_id));

  const cohortsByCentre = new Map<string, ExploreCohort[]>();
  for (const c of relevantCohorts) {
    const list = cohortsByCentre.get(c.centre_id) ?? [];
    list.push(c);
    cohortsByCentre.set(c.centre_id, list);
  }
  const learnersByCohort = new Map<string, ExploreLearner[]>();
  for (const l of relevantLearners) {
    const list = learnersByCohort.get(l.cohort_id!) ?? [];
    list.push({ id: l.id, name: l.full_name, status: l.status, cohortId: l.cohort_id! });
    learnersByCohort.set(l.cohort_id!, list);
  }

  const lgas = new Map<string, ExploreLgaNode>();
  for (const centre of centres) {
    const lga = centre.lga || 'Unknown LGA';
    let node = lgas.get(lga);
    if (!node) {
      node = { lga, centres: [] };
      lgas.set(lga, node);
    }
    const centreCohorts = (cohortsByCentre.get(centre.id) ?? []).sort(byString((c: ExploreCohort) => c.name));
    node.centres.push({
      centre,
      cohorts: centreCohorts,
      learners: centreCohorts.flatMap(c => learnersByCohort.get(c.id) ?? []),
      facilitatorCount: facilitatorsByCentre.get(centre.id) ?? 0,
    });
  }
  return [...lgas.values()].sort((a, b) => a.lga.localeCompare(b.lga));
}

/** Group a programme's cohorts into LGAs (via their centres) with learner counts. */
function buildProgrammeNode(
  programme: ExploreProgramme,
  cohorts: ExploreCohort[],
  learners: ExploreLearnerRow[],
  centreMap: Map<string, ExploreCentre>,
  facilitatorsByCentre: Map<string, number>,
): ExploreProgrammeNode {
  const relevant = cohorts.filter(c => c.programme_id === programme.id);
  const cohortIds = new Set(relevant.map(c => c.id));
  const learnerCount = learners.filter(l => l.cohort_id && cohortIds.has(l.cohort_id)).length;

  const centres: ExploreCentre[] = [];
  for (const c of relevant) {
    const centre = centreMap.get(c.centre_id);
    if (centre) centres.push(centre);
  }
  return {
    programme,
    lgas: groupCentresByLga(centres, relevant, learners, facilitatorsByCentre),
    learnerCount,
  };
}

/** Build the full two-sided tree. Pure: same input → same output. */
export function buildExploreTree(input: ExploreInput): ExploreTree {
  const {
    departments, staff, orgs, centreOrgs, orgCoverage, programmeLgas,
    programmes, cohorts, learners, centres, facilitatorsByCentre,
  } = input;

  const centreMap = new Map(centres.map(c => [c.id, c]));
  const programmeLgaScope = new Map<string, Set<string>>();
  for (const pl of programmeLgas) {
    const set = programmeLgaScope.get(pl.programme_id) ?? new Set<string>();
    set.add(pl.lga);
    programmeLgaScope.set(pl.programme_id, set);
  }

  // ── Programme nodes (shared shape for board + org branches) ──
  const programmeNodes = new Map<string, ExploreProgrammeNode>();
  for (const p of programmes) {
    programmeNodes.set(p.id, buildProgrammeNode(p, cohorts, learners, centreMap, facilitatorsByCentre));
  }

  // ── Board branch ──
  const staffByDept = new Map<string, ExploreStaffRow[]>();
  let unassignedCount = 0;
  for (const s of staff) {
    if (s.department_id) {
      const list = staffByDept.get(s.department_id) ?? [];
      list.push(s);
      staffByDept.set(s.department_id, list);
    } else {
      unassignedCount += 1;
    }
  }
  const board: ExploreBoardNode = {
    departments: departments
      .map(d => ({
        department: d,
        staff: (staffByDept.get(d.id) ?? []).sort(byString((s: ExploreStaffRow) => s.name)),
      }))
      .sort(byString((g: ExploreStaffGroup) => g.department.name)),
    unassignedCount,
    programmes: programmes
      .filter(p => p.owner_org_id === null)
      .map(p => programmeNodes.get(p.id)!)
      .filter(Boolean),
    learnerCount: programmes
      .filter(p => p.owner_org_id === null)
      .reduce((sum, p) => sum + (programmeNodes.get(p.id)?.learnerCount ?? 0), 0),
  };

  // ── Organisation branches ──
  const centresByOrg = new Map<string, Set<string>>();
  for (const link of centreOrgs) {
    const set = centresByOrg.get(link.org_id) ?? new Set<string>();
    set.add(link.centre_id);
    centresByOrg.set(link.org_id, set);
  }
  const orgNodes: ExploreOrgNode[] = orgs.map(org => {
    const orgProgrammes = programmes
      .filter(p => p.owner_org_id === org.id)
      .map(p => programmeNodes.get(p.id)!)
      .filter(Boolean);
    const orgLearners = orgProgrammes.reduce((sum, pn) => sum + pn.learnerCount, 0);
    const orgCentreIds = [...(centresByOrg.get(org.id) ?? [])];
    const orgCentres = orgCentreIds
      .map(id => centreMap.get(id))
      .filter((c): c is ExploreCentre => !!c);

    return {
      org,
      coverage: [...(orgCoverage.filter(c => c.org_id === org.id).map(c => c.lga))].sort(),
      programmes: orgProgrammes,
      centresByLga: groupCentresByLga(orgCentres, cohorts, learners, facilitatorsByCentre),
      learnerCount: orgLearners,
    };
  });

  orgNodes.sort(byString((o: ExploreOrgNode) => o.org.name));

  return { board, orgs: orgNodes };
}

/**
 * Roll a programme's LGA scope UP to the orgs that own it — used to suggest
 * coverage rows for an org from where its programmes actually run.
 */
export function suggestCoverageFromProgrammes(
  orgId: string,
  programmes: ExploreProgramme[],
  programmeLgas: { programme_id: string; lga: string }[],
): string[] {
  const owned = new Set(programmes.filter(p => p.owner_org_id === orgId).map(p => p.id));
  const lgas = new Set(
    programmeLgas.filter(pl => owned.has(pl.programme_id)).map(pl => pl.lga),
  );
  return [...lgas].sort();
}
