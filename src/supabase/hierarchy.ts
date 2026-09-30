// Phase 28 — Board & Partner Hierarchy: read loaders for the drill-down.
// Every table here comes from supabase/setup_hierarchy.sql, which may not have
// run yet — every loader degrades to an empty list instead of erroring, so the
// Explore navigator renders the parts of the tree that exist.
import { supabase } from './client';
import type {
  CentreOrgLink,
  CohortOverviewRow,
  Department,
  Learner,
  OrgLgaCoverage,
  Programme,
  ProgrammeLgaLink,
} from '../types';

/** Run a supabase query, degrading any error (e.g. missing table) to []. */
async function rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

export function dbLoadDepartments(): Promise<Department[]> {
  return rows<Department>(
    supabase.from('departments').select('*').order('name') as unknown as PromiseLike<{ data: Department[] | null; error: { message: string } | null }>,
  );
}

export function dbLoadCentreOrgLinks(): Promise<CentreOrgLink[]> {
  return rows<CentreOrgLink>(
    supabase.from('centre_organisations').select('*') as unknown as PromiseLike<{ data: CentreOrgLink[] | null; error: { message: string } | null }>,
  );
}

export function dbLoadProgrammeLgas(): Promise<ProgrammeLgaLink[]> {
  return rows<ProgrammeLgaLink>(
    supabase.from('programme_lgas').select('*') as unknown as PromiseLike<{ data: ProgrammeLgaLink[] | null; error: { message: string } | null }>,
  );
}

export function dbLoadOrgLgaCoverage(): Promise<OrgLgaCoverage[]> {
  return rows<OrgLgaCoverage>(
    supabase.from('organisation_lga_coverage').select('*') as unknown as PromiseLike<{ data: OrgLgaCoverage[] | null; error: { message: string } | null }>,
  );
}

export interface HierarchyData {
  departments: Department[];
  centreOrgs: CentreOrgLink[];
  programmeLgas: ProgrammeLgaLink[];
  orgCoverage: OrgLgaCoverage[];
  programmes: Programme[];
  cohorts: CohortOverviewRow[];
  learners: Learner[];
  cohortsByCentre: Map<string, number>;
  facilitatorsByCentre: Map<string, number>;
  hierarchyReady: boolean; // false while setup_hierarchy.sql hasn't run
}

/**
 * One parallel fetch of everything the Explore tree needs. Delivery/centre
 * loaders degrade to zeros like on ReportsPage; the Phase 28 tables degrade to
 * empty lists and flip `hierarchyReady` so the page can show a setup hint.
 */
export async function loadHierarchyData(): Promise<HierarchyData> {
  const [departments, centreOrgs, programmeLgas, orgCoverage, programmes, cohorts, learners, centreFacilitators] =
    await Promise.all([
      dbLoadDepartments(),
      dbLoadCentreOrgLinks(),
      dbLoadProgrammeLgas(),
      dbLoadOrgLgaCoverage(),
      rows<Programme>(supabase.from('programmes').select('*').order('title')),
      rows<CohortOverviewRow>(supabase.from('cohort_overview').select('*').order('name')),
      rows<Learner>(supabase.from('learners').select('*')),
      rows<{ centre_id: string; facilitator_id: string }>(
        supabase.from('centre_facilitators').select('centre_id, facilitator_id'),
      ),
    ]);

  const facilitatorsByCentre = new Map<string, number>();
  for (const cf of centreFacilitators) {
    facilitatorsByCentre.set(cf.centre_id, (facilitatorsByCentre.get(cf.centre_id) ?? 0) + 1);
  }

  // Cohort rows carry centre_id — reuse them to count delivery activity per
  // centre without another query.
  const cohortsByCentre = new Map<string, number>();
  for (const c of cohorts) {
    cohortsByCentre.set(c.centre_id, (cohortsByCentre.get(c.centre_id) ?? 0) + 1);
  }

  const hierarchyReady = !(
    departments.length === 0 &&
    centreOrgs.length === 0 &&
    programmeLgas.length === 0 &&
    orgCoverage.length === 0
  );

  return {
    departments,
    centreOrgs,
    programmeLgas,
    orgCoverage,
    programmes,
    cohorts,
    learners,
    cohortsByCentre,
    facilitatorsByCentre,
    hierarchyReady,
  };
}
