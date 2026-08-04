/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import type { Employee } from '../types';

const GREEN = '#1A5C38';
const GREEN_DARK = '#0F3D25';
const GOLD = '#D4A017';
const INK = '#1A1A1A';
const SLATE = '#4A5568';
const BORDER = '#D1D9D4';

function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export function printEmployees(employees: Employee[]) {
  const rows = employees.map(e => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-weight:600">${esc(e.name)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-family:'JetBrains Mono',monospace;font-size:10px;color:${GREEN};font-weight:600">${esc(e.psn || '—')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER}">${esc(e.cadre || '—')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER}">${esc(e.grade || '—')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER}">${esc(e.lga || '—')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER}">${esc(e.station || '—')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px">${fmtDate(e.date_first_appt)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER}">${esc(e.phone || '—')}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><title>AMEB Employee Register</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:${INK};}
    .hdr{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
    .org{font-size:16px;font-weight:800;color:${GREEN};}
    .sub{font-size:11px;color:${SLATE};margin-top:2px;}
    h2{font-size:13px;font-weight:700;color:${GREEN};margin:10px 0 3px;}
    p{font-size:11px;color:${SLATE};margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;font-size:11px;}
    th{background:${GREEN};color:#fff;padding:7px 8px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.4px;}
    td{padding:6px 8px;border-bottom:1px solid ${BORDER};vertical-align:middle;}
    tr:nth-child(even) td{background:#f5f5f5;}
    .foot{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid ${BORDER};padding-top:8px;display:flex;justify-content:space-between;}
    @media print{body{padding:0;}@page{margin:.8cm;size:A4 landscape;}}
  </style></head><body>
    <div class="hdr">
      <div style="width:44px;height:44px;background:${GREEN};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:${GOLD};">🎓</div>
      <div>
        <div class="org">Adamawa State Mass Education Board</div>
        <div class="sub">Permanent & Pensionable Officers Register — ${employees.length} officers</div>
      </div>
    </div>
    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    <table>
      <thead><tr>
        <th>Name</th><th>PSN</th><th>Cadre</th><th>Grade</th><th>LGA</th><th>Station</th><th>First Appt.</th><th>Phone</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">
      <span>© Adamawa State Mass Education Board</span>
      <span>Federal Republic of Nigeria</span>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

export function printEmployeeProfile(employee: Employee) {
  const photoHtml = employee.photo
    ? `<img src="${employee.photo}" style="width:90px;height:104px;object-fit:cover;border-radius:8px;border:3px solid ${GREEN}" alt="${employee.name}"/>`
    : `<div style="width:90px;height:104px;border-radius:8px;background:${GREEN};border:3px solid ${GREEN};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff">${initials(employee.name)}</div>`;

  const html = `<!DOCTYPE html><html><head><title>${employee.name} — AMEB Profile</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;background:#fff;padding:20px;}
    .sheet{max-width:680px;margin:0 auto;border:2px solid ${GREEN};border-radius:8px;overflow:hidden;}
    .hdr{background:${GREEN};padding:20px;display:flex;gap:18px;align-items:flex-start;}
    .org-name{font-size:10px;font-weight:800;color:${GOLD};text-transform:uppercase;letter-spacing:1.5px;}
    .emp-name{font-size:20px;font-weight:800;color:#fff;line-height:1.2;}
    .emp-cadre{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}
    .badges{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;}
    .badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
    .field{padding:10px 16px;border-bottom:1px solid ${BORDER};}
    .fl{font-size:10px;font-weight:700;color:${SLATE};text-transform:uppercase;letter-spacing:.4px;}
    .fv{font-size:13px;font-weight:600;color:${INK};margin-top:2px;font-family:'JetBrains Mono',monospace;}
    .foot{background:#f5f5f5;border-top:1px solid ${BORDER};padding:9px 16px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;}
    @media print{body{padding:0;}@page{margin:.8cm;size:A4 portrait;}}
  </style></head><body>
    <div class="sheet">
      <div class="hdr">
        ${photoHtml}
        <div style="flex:1">
          <div class="org-name">Adamawa State Mass Education Board</div>
          <div class="emp-name">${esc(employee.name)}</div>
          <div class="emp-cadre">${esc(employee.cadre || '—')}</div>
          <div class="badges">
            <span class="badge" style="background:${GREEN};color:#fff">${esc(employee.psn || 'No PSN')}</span>
            <span class="badge" style="background:rgba(255,255,255,.15);color:#fff">${esc(employee.grade || '—')}</span>
            <span class="badge" style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.75)">📍 ${esc(employee.station || '—')}</span>
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
        ].map(([l, v]) => `<div class="field"><div class="fl">${l}</div><div class="fv">${v}</div></div>`).join('')}
      </div>
      ${employee.remarks ? `<div style="padding:10px 16px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#78350f;"><strong>Remarks:</strong> ${esc(employee.remarks)}</div>` : ''}
      <div class="foot">
        <span>AMEB — Permanent & Pensionable Officers Register</span>
        <span>Generated: ${new Date().toLocaleDateString('en-GB')}</span>
      </div>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}
