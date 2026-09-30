import { describe, it, expect } from 'vitest';
import {
  buildExploreTree,
  suggestCoverageFromProgrammes,
  type ExploreInput,
} from '../explore';

const baseInput: ExploreInput = {
  departments: [
    { id: 'd1', name: 'Literacy', code: 'LIT', status: 'active' },
    { id: 'd2', name: 'Planning', code: 'PLN', status: 'active' },
  ],
  staff: [
    { id: 'e1', name: 'Alice', department_id: 'd1', grade: 'GL 10', station: 'Yola (HQ)' },
    { id: 'e2', name: 'Bola', department_id: 'd1', grade: 'GL 08', station: 'Mubi' },
    { id: 'e3', name: 'Chidi', department_id: null, grade: 'GL 07', station: null },
  ],
  orgs: [
    { id: 'o1', name: 'Alpha NGO', type: 'NGO', status: 'active' },
    { id: 'o2', name: 'Beta CSO', type: 'CSO', status: 'active' },
  ],
  centreOrgs: [
    { centre_id: 'c1', org_id: 'o1', role: 'lead' },
    { centre_id: 'c2', org_id: 'o1', role: 'partner' },
    { centre_id: 'c2', org_id: 'o2', role: 'lead' },
  ],
  orgCoverage: [{ org_id: 'o1', lga: 'Yola North' }],
  programmeLgas: [{ programme_id: 'p1', lga: 'Ganye' }],
  programmes: [
    { id: 'p1', title: 'Alpha Literacy', owner_org_id: 'o1', status: 'active', category: 'Literacy' },
    { id: 'p2', title: 'Board Vocational', owner_org_id: null, status: 'active', category: 'Vocational' },
  ],
  cohorts: [
    { id: 'k1', name: 'C1', programme_id: 'p1', centre_id: 'c1', status: 'running', learner_count: 2 },
    { id: 'k2', name: 'C2', programme_id: 'p2', centre_id: 'c2', status: 'planned', learner_count: 0 },
  ],
  learners: [
    { id: 'l1', full_name: 'Learner One', cohort_id: 'k1', status: 'active' },
    { id: 'l2', full_name: 'Learner Two', cohort_id: 'k1', status: 'completed' },
    { id: 'l3', full_name: 'Learner Three', cohort_id: 'k2', status: 'active' },
  ],
  centres: [
    { id: 'c1', name: 'Ganye Centre', lga: 'Ganye', owner_type: 'NGO' },
    { id: 'c2', name: 'Yola Centre', lga: 'Yola North', owner_type: 'ADSMEB' },
  ],
  facilitatorsByCentre: new Map([['c1', 3]]),
};

describe('buildExploreTree', () => {
  it('nests board staff under their departments with an unassigned bucket', () => {
    const tree = buildExploreTree(baseInput);
    const lit = tree.board.departments.find(d => d.department?.name === 'Literacy');
    expect(lit?.staff.map(s => s.name)).toEqual(['Alice', 'Bola']);
    expect(tree.board.unassignedCount).toBe(1);
  });

  it('keeps board programmes (owner null) on the board branch only', () => {
    const tree = buildExploreTree(baseInput);
    expect(tree.board.programmes.map(p => p.programme.title)).toEqual(['Board Vocational']);
    // Board programme runs at c2 → its LGA node is Yola North, 1 learner
    expect(tree.board.programmes[0].lgas[0].lga).toBe('Yola North');
    expect(tree.board.learnerCount).toBe(1);
  });

  it('nests org programmes → LGAs → centres → cohorts → learners', () => {
    const tree = buildExploreTree(baseInput);
    const org = tree.orgs.find(o => o.org.id === 'o1');
    expect(org).toBeDefined();
    const prog = org!.programmes[0];
    expect(prog.programme.title).toBe('Alpha Literacy');
    expect(prog.learnerCount).toBe(2);
    const centreNode = prog.lgas[0].centres[0];
    expect(centreNode.centre.name).toBe('Ganye Centre');
    expect(centreNode.cohorts).toHaveLength(1);
    expect(centreNode.learners.map(l => l.name)).toEqual(['Learner One', 'Learner Two']);
    expect(centreNode.facilitatorCount).toBe(3);
  });

  it('rolls centres up to each involved org, not just the lead', () => {
    const tree = buildExploreTree(baseInput);
    const alpha = tree.orgs.find(o => o.org.id === 'o1')!;
    const beta = tree.orgs.find(o => o.org.id === 'o2')!;
    // Alpha: lead on c1, partner on c2 → both centres, across 2 LGAs
    expect(alpha.centresByLga.map(l => l.lga).sort()).toEqual(['Ganye', 'Yola North']);
    // Beta: lead on c2 only
    expect(beta.centresByLga[0].centres[0].centre.name).toBe('Yola Centre');
  });

  it('exposes org LGA coverage', () => {
    const tree = buildExploreTree(baseInput);
    expect(tree.orgs.find(o => o.org.id === 'o1')!.coverage).toEqual(['Yola North']);
    expect(tree.orgs.find(o => o.org.id === 'o2')!.coverage).toEqual([]);
  });

  it('sorts orgs, departments, lgas and centres alphabetically', () => {
    const tree = buildExploreTree(baseInput);
    expect(tree.orgs.map(o => o.org.name)).toEqual(['Alpha NGO', 'Beta CSO']);
    expect(tree.board.departments.map(d => d.department?.name)).toEqual(['Literacy', 'Planning']);
  });

  it('is stable — same input gives an equal tree', () => {
    const a = buildExploreTree(baseInput);
    const b = buildExploreTree(baseInput);
    expect(a).toEqual(b);
  });

  it('degrades to an empty-but-valid tree when registers are empty', () => {
    const empty: ExploreInput = {
      departments: [], staff: [], orgs: [], centreOrgs: [], orgCoverage: [],
      programmeLgas: [], programmes: [], cohorts: [], learners: [], centres: [],
      facilitatorsByCentre: new Map(),
    };
    const tree = buildExploreTree(empty);
    expect(tree.board.departments).toEqual([]);
    expect(tree.board.unassignedCount).toBe(0);
    expect(tree.board.programmes).toEqual([]);
    expect(tree.orgs).toEqual([]);
  });
});

describe('suggestCoverageFromProgrammes', () => {
  it('collects the LGA scope of the org\u2019s own programmes', () => {
    const lgs = suggestCoverageFromProgrammes('o1', baseInput.programmes, baseInput.programmeLgas);
    expect(lgs).toEqual(['Ganye']);
  });

  it('ignores other orgs\u2019 programmes', () => {
    const lgs = suggestCoverageFromProgrammes('o2', baseInput.programmes, baseInput.programmeLgas);
    expect(lgs).toEqual([]);
  });
});
