/* AMEB EMS — Print utilities
   Professional government document printouts with embedded logo.
   No money amounts are ever printed: staff pay is handled outside this system,
   so no printout (employee, profile, or register) carries a figure. */

import type { Employee } from '../types';
import type { Facilitator } from '../types';
import type { Centre, CentreFacilitator } from '../types';
import type { LgaAreaOfficer } from '../types';

// ── Theme ────────────────────────────────────────────────────────────────────
const GREEN = '#1A5C38';
const GOLD = '#D4A017';
const INK = '#1A1A1A';
const SLATE = '#4A5568';
const BORDER = '#D1D9D4';

// ── AMEB Logo (inline SVG — flame of knowledge + open book) ──────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="44" height="44">
  <title>ADSMEB</title>
  <defs><linearGradient id="flame" x1="0.3" y1="0" x2="0.7" y2="1">
    <stop offset="0" stop-color="#FFD45C"/><stop offset="1" stop-color="#E08A0C"/>
  </linearGradient></defs>
  <g transform="translate(256,256) scale(1.16) translate(-256,-257)">
    <path d="M262 44 C 268 108, 306 132, 332 168 C 356 200, 358 246, 332 278 C 310 306, 268 316, 236 306 C 196 294, 172 258, 178 218 C 183 184, 206 158, 224 128 C 228 156, 236 172, 250 184 C 234 142, 240 88, 262 44 Z" fill="url(#flame)"/>
    <path d="M258 156 C 262 190, 288 202, 294 228 C 300 256, 282 278, 256 278 C 230 278, 212 256, 218 230 C 223 208, 244 190, 258 156 Z" fill="#0A6136"/>
    <path d="M249 356 C 203 322, 138 312, 66 322 L 66 442 C 138 432, 203 442, 249 470 Z" fill="#0A6136"/>
    <path d="M263 356 C 309 322, 374 312, 446 322 L 446 442 C 374 432, 309 442, 263 470 Z" fill="#10914E"/>
    <g stroke="#FFF" stroke-opacity="0.62" stroke-width="16" stroke-linecap="round" fill="none">
      <path d="M112 360 C 152 362, 187 372, 211 385"/><path d="M112 402 C 152 404, 187 414, 211 427"/>
      <path d="M400 360 C 360 362, 325 372, 301 385"/><path d="M400 402 C 360 404, 325 414, 301 427"/>
    </g>
  </g>
</svg>`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function today(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Shared styles ────────────────────────────────────────────────────────────
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:${INK};line-height:1.4;}
  .hdr{display:flex;align-items:center;gap:14px;padding:14px 18px;background:${GREEN};border-radius:8px;margin-bottom:14px;}
  .hdr-logo{flex-shrink:0;}
  .hdr-text{flex:1;}
  .hdr-org{font-size:15px;font-weight:800;color:#fff;line-height:1.2;}
  .hdr-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px;letter-spacing:.3px;}
  h2{font-size:13px;font-weight:700;color:${GREEN};margin:12px 0 4px;text-align:center;}
  .meta{font-size:10px;color:${SLATE};text-align:center;margin-bottom:14px;}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  th{background:${GREEN};color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.4px;}
  td{padding:6px 10px;border-bottom:1px solid ${BORDER};vertical-align:middle;}
  tr:nth-child(even) td{background:#f6f7f5;}
  .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid ${BORDER};padding-top:8px;display:flex;justify-content:space-between;align-items:center;}
  .sheet{max-width:680px;margin:0 auto;border:2px solid ${GREEN};border-radius:8px;overflow:hidden;}
  .sheet-hdr{background:${GREEN};padding:20px;display:flex;gap:18px;align-items:flex-start;}
  .sheet-org{font-size:10px;font-weight:800;color:${GOLD};text-transform:uppercase;letter-spacing:1.5px;}
  .sheet-name{font-size:20px;font-weight:800;color:#fff;line-height:1.2;}
  .sheet-sub{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}
  .sheet-badges{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;}
  .sheet-badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
  .sheet-field{padding:10px 16px;border-bottom:1px solid ${BORDER};}
  .sheet-fl{font-size:10px;font-weight:700;color:${SLATE};text-transform:uppercase;letter-spacing:.4px;}
  .sheet-fv{font-size:13px;font-weight:600;color:${INK};margin-top:2px;}
  .sheet-foot{background:#f6f7f5;border-top:1px solid ${BORDER};padding:9px 16px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;}
  @media print{body{padding:0;}@page{margin:.8cm;}}
`;

// ── Print helpers ────────────────────────────────────────────────────────────
function openAndPrint(html: string) {
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

function buildHeader(sub: string) {
  return `<div class="hdr">
    <div class="hdr-logo">${LOGO_SVG}</div>
    <div class="hdr-text">
      <div class="hdr-org">Adamawa State Mass Education Board</div>
      <div class="hdr-sub">${esc(sub)}</div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE PRINTS (no money amounts — staff pay is handled outside this system)
// ═══════════════════════════════════════════════════════════════════════════════

export function printEmployees(employees: Employee[], title?: string, subtitle?: string) {
  const rows = employees.map((e, i) => `
    <tr>
      <td style="text-align:center;color:${SLATE};font-size:10px">${i + 1}</td>
      <td style="font-weight:600">${esc(e.name)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${GREEN};font-weight:600">${esc(e.psn || '—')}</td>
      <td>${esc(e.cadre || '—')}</td>
      <td>${esc(e.grade || '—')}</td>
      <td>${esc(e.lga || '—')}</td>
      <td>${esc(e.station || '—')}</td>
      <td style="font-size:10px">${fmtDate(e.date_first_appt)}</td>
      <td>${esc(e.phone || '—')}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><title>AMEB Employee Register</title>
  <style>${BASE_CSS}
    th:first-child{width:30px;text-align:center;}
    td:first-child{text-align:center;}
  </style></head><body>
    ${buildHeader(`Permanent & Pensionable Officers Register — ${employees.length} officers`)}
    ${title ? `<h2>${esc(title)}</h2>` : ''}
    <div class="meta">${esc(subtitle || `${employees.length} officers`)} · Printed ${today()}</div>
    <table>
      <thead><tr>
        <th style="width:30px;text-align:center">#</th>
        <th>Name</th><th>PSN</th><th>Cadre</th><th>Grade</th>
        <th>LGA</th><th>Station</th><th>First Appt.</th><th>Phone</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">
      <span>© Adamawa State Mass Education Board</span>
      <span>Federal Republic of Nigeria</span>
    </div>
  </body></html>`;

  openAndPrint(html);
}

export function printEmployeeProfile(employee: Employee, officerLgas: string[] = []) {
  const photoHtml = employee.photo
    ? `<img src="${employee.photo}" style="width:90px;height:104px;object-fit:cover;border-radius:8px;border:3px solid ${GREEN}" alt="${employee.name}"/>`
    : `<div style="width:90px;height:104px;border-radius:8px;background:${GREEN};border:3px solid ${GREEN};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff">${initials(employee.name)}</div>`;

  const html = `<!DOCTYPE html><html><head><title>${employee.name} — AMEB Profile</title>
  <style>${BASE_CSS}</style></head><body>
    <div class="sheet">
      <div class="sheet-hdr">
        <div style="flex-shrink:0">${LOGO_SVG}</div>
        ${photoHtml}
        <div style="flex:1">
          <div class="sheet-org">Adamawa State Mass Education Board</div>
          <div class="sheet-name">${esc(employee.name)}</div>
          <div class="sheet-sub">${esc(employee.cadre || '—')}</div>
          <div class="sheet-badges">
            <span class="sheet-badge" style="background:${GREEN};color:#fff">${esc(employee.psn || 'No PSN')}</span>
            <span class="sheet-badge" style="background:rgba(255,255,255,.15);color:#fff">${esc(employee.grade || '—')}</span>
            <span class="sheet-badge" style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.75)">📍 ${esc(employee.station || '—')}</span>
            ${officerLgas.length > 0 ? `<span class="sheet-badge" style="background:${GOLD};color:${INK}">🗺 ${esc(officerLgas.join(', '))} Area Officer</span>` : ''}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        ${[
          ['Date of First Appointment', fmtDate(employee.date_first_appt)],
          ['Date of Present Appointment', fmtDate(employee.date_present_appt)],
          ['Date of Birth', fmtDate(employee.dob)],
          ['Phone Number', employee.phone || '—'],
          ['LGA of Origin', employee.lga || '—'],
          ['Present Station', employee.station || '—'],
          ['Residential Address', employee.address || '—'],
          ...(officerLgas.length > 0 ? [['LGA Area Officer', officerLgas.join(', ')]] : []),
        ].map(([l, v]) => `<div class="sheet-field"><div class="sheet-fl">${l}</div><div class="sheet-fv">${v}</div></div>`).join('')}
      </div>
      ${employee.remarks ? `<div style="padding:10px 16px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#78350f;"><strong>Remarks:</strong> ${esc(employee.remarks)}</div>` : ''}
      <div class="sheet-foot">
        <span>AMEB — Permanent & Pensionable Officers Register</span>
        <span>Printed: ${today()}</span>
      </div>
    </div>
  </body></html>`;

  openAndPrint(html);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FACILITATOR PRINTS
// ═══════════════════════════════════════════════════════════════════════════════

export function printFacilitators(
  facilitators: Facilitator[],
  centres: Centre[],
  links: CentreFacilitator[],
  title?: string,
  subtitle?: string
) {
  // Build centre-lookup for showing assigned centres
  const centreMap = new Map(centres.map(c => [c.id, c.name]));
  const centresByFac = new Map<string, string[]>();
  links.forEach(l => {
    const name = centreMap.get(l.centre_id);
    if (!name) return;
    const list = centresByFac.get(l.facilitator_id) || [];
    list.push(name);
    centresByFac.set(l.facilitator_id, list);
  });
  centresByFac.forEach(list => list.sort((a, b) => a.localeCompare(b)));

  const rows = facilitators.map((f, i) => {
    const assigned = centresByFac.get(f.id) || [];
    return `
    <tr>
      <td style="text-align:center;color:${SLATE};font-size:10px">${i + 1}</td>
      <td style="font-weight:600">${esc(f.name)}</td>
      <td>${esc(f.gender || '—')}</td>
      <td>${esc(f.phone || '—')}</td>
      <td>${esc(f.lga || '—')}</td>
      <td>${esc(f.community || '—')}</td>
      <td>${assigned.length > 0 ? assigned.map(n => esc(n)).join(', ') : '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>AMEB Facilitator Register</title>
  <style>${BASE_CSS}
    th:first-child{width:30px;text-align:center;}
    td:first-child{text-align:center;}
  </style></head><body>
    ${buildHeader(`Facilitator Registry — ${facilitators.length} facilitators`)}
    ${title ? `<h2>${esc(title)}</h2>` : ''}
    <div class="meta">${esc(subtitle || `${facilitators.length} facilitators`)} · Printed ${today()}</div>
    <table>
      <thead><tr>
        <th style="width:30px;text-align:center">#</th>
        <th>Name</th><th>Gender</th><th>Phone</th>
        <th>LGA</th><th>Community</th><th>Assigned Centres</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">
      <span>© Adamawa State Mass Education Board</span>
      <span>Federal Republic of Nigeria</span>
    </div>
  </body></html>`;

  openAndPrint(html);
}

export function printFacilitatorProfile(
  facilitator: Facilitator,
  centreNames: string[]
) {
  const html = `<!DOCTYPE html><html><head><title>${facilitator.name} — AMEB Facilitator</title>
  <style>${BASE_CSS}</style></head><body>
    <div class="sheet">
      <div class="sheet-hdr">
        <div style="flex-shrink:0">${LOGO_SVG}</div>
        <div style="flex:1">
          <div class="sheet-org">Adamawa State Mass Education Board</div>
          <div class="sheet-name">${esc(facilitator.name)}</div>
          <div class="sheet-sub">Facilitator — Learning Centres Programme</div>
          <div class="sheet-badges">
            ${facilitator.gender ? `<span class="sheet-badge" style="background:${GREEN};color:#fff">${esc(facilitator.gender)}</span>` : ''}
            ${facilitator.lga ? `<span class="sheet-badge" style="background:rgba(255,255,255,.15);color:#fff">📍 ${esc(facilitator.lga)}</span>` : ''}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        ${[
          ['Phone', facilitator.phone],
          ['Community', facilitator.community],
        ].map(([l, v]) => `<div class="sheet-field"><div class="sheet-fl">${l}</div><div class="sheet-fv">${v ? esc(v) : '—'}</div></div>`).join('')}
        <div class="sheet-field" style="grid-column:1/-1;">
          <div class="sheet-fl">Assigned Centres (${centreNames.length})</div>
          <div class="sheet-fv" style="margin-top:4px">
            ${centreNames.length > 0
              ? centreNames.map(n => `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(22,163,74,.1);color:#16a34a;margin:2px 4px 2px 0;">🏫 ${esc(n)}</span>`).join('')
              : '<span style="color:#94a3b8">Not assigned to any centre yet.</span>'}
          </div>
        </div>
      </div>
      ${facilitator.remarks ? `<div style="padding:10px 16px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#78350f;"><strong>Remarks:</strong> ${esc(facilitator.remarks)}</div>` : ''}
      <div class="sheet-foot">
        <span>AMEB — Facilitator Registry</span>
        <span>Printed: ${today()}</span>
      </div>
    </div>
  </body></html>`;

  openAndPrint(html);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LGA AREA OFFICERS PRINT
// ═══════════════════════════════════════════════════════════════════════════════

/** One row per LGA — the assigned officer (if any) with their staff details. */
export interface LgaOfficerRow {
  lga: string;
  officer: LgaAreaOfficer | null;
  employee: Employee | null;
}

export function printLgaAreaOfficers(
  rows: LgaOfficerRow[],
  title?: string,
  subtitle?: string
) {
  const covered = rows.filter(r => r.officer).length;

  const body = rows.map((r, i) => {
    const e = r.employee;
    const status = e
      ? '<span style="color:#16a34a;font-weight:700">Assigned</span>'
      : (r.officer ? '<span style="color:#d97706;font-weight:700">No staff record</span>'
                   : '<span style="color:#94a3b8">Unassigned</span>');
    return `
    <tr>
      <td style="text-align:center;color:${SLATE};font-size:10px">${i + 1}</td>
      <td style="font-weight:700">${esc(r.lga)}</td>
      <td style="font-weight:600">${e ? esc(e.name) : '—'}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${GREEN};font-weight:600">${esc(e?.psn || '—')}</td>
      <td>${esc(e?.cadre || '—')}</td>
      <td>${esc(e?.phone || '—')}</td>
      <td>${esc(e?.station || '—')}</td>
      <td style="font-size:10px">${status}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>AMEB LGA Area Officers</title>
  <style>${BASE_CSS}
    th:first-child{width:30px;text-align:center;}
    td:first-child{text-align:center;}
  </style></head><body>
    ${buildHeader(`Local Government Area Officers — ${covered} of ${rows.length} LGAs covered`)}
    ${title ? `<h2>${esc(title)}</h2>` : ''}
    <div class="meta">${esc(subtitle || `${covered} of ${rows.length} LGAs covered`)} · Printed ${today()}</div>
    <table>
      <thead><tr>
        <th style="width:30px;text-align:center">#</th>
        <th>Local Government Area</th><th>Area Officer</th><th>PSN</th>
        <th>Cadre</th><th>Phone</th><th>Station</th><th>Status</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="foot">
      <span>© Adamawa State Mass Education Board</span>
      <span>Federal Republic of Nigeria</span>
    </div>
  </body></html>`;

  openAndPrint(html);
}
