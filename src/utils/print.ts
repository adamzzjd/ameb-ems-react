import type { Employee } from '../types';

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return `${a} yrs`;
}

const PRINT_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;padding:20px;font-size:12px;color:#1e2a3a;}
  .hdr{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
  .org{font-size:16px;font-weight:800;color:#0f2744;}
  .sub{font-size:11px;color:#64748b;margin-top:2px;}
  h2{font-size:13px;font-weight:700;color:#0f2744;margin:10px 0 3px;}
  p{font-size:11px;color:#64748b;margin-bottom:12px;}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  th{background:#0f2744;color:#fff;padding:7px 9px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.4px;}
  td{padding:7px 9px;border-bottom:1px solid #eef0f6;vertical-align:middle;}
  tr:nth-child(even) td{background:#f7f8fc;}
  .foot{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;}
  .psn{font-family:monospace;font-size:11px;color:#b8892a;font-weight:600;}
  @media print{body{padding:0;}@page{margin:.8cm;size:A4 landscape;}}
`;

function getPrintHeader(title: string, subtitle: string, count: number): string {
  return `
  <div class="hdr">
    <div style="width:54px;height:54px;background:#0f2744;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;">🏛</div>
    <div>
      <div class="org">Adamawa State Mass Education Board</div>
      <div class="sub">Permanent & Pensionable Officers Register — EMIS</div>
    </div>
  </div>
  <h2>${title}</h2>
  <p>${subtitle} · Total: <strong>${count}</strong> officer${count !== 1 ? 's' : ''} · Printed: ${new Date().toLocaleDateString('en-GB')}</p>`;
}

export function printEmployees(emps: Employee[], title: string, subtitle: string) {
  if (emps.length === 0) return;

  const rows = emps.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="psn">${esc(e.psn || '—')}</td>
      <td style="font-weight:600;">${esc(e.name)}</td>
      <td>${esc(e.cadre || '—')}</td>
      <td>${esc(e.grade || '—')}</td>
      <td>${esc(e.lga || '—')}</td>
      <td>${esc(e.station || '—')}</td>
      <td>${fmtDate(e.date_first_appt)}</td>
      <td>${esc(e.phone || '—')}</td>
    </tr>`).join('');

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
  <html><head>
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>${PRINT_STYLES}</style>
  </head><body>
    ${getPrintHeader(title, subtitle, emps.length)}
    <table>
      <thead><tr>
        <th>#</th><th>PSN</th><th>Full Name</th><th>Cadre</th>
        <th>Grade</th><th>LGA</th><th>Station</th><th>First Appt.</th><th>Phone</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">
      <span>AMEB EMS · Permanent & Pensionable Officers</span>
      <span>Printed: ${new Date().toLocaleDateString('en-GB')}</span>
    </div>
    <script>window.onload=()=>{window.print();}<\\/script>
  </body></html>`);
  w.document.close();
}

export function printEmployee(e: Employee) {
  const photoHTML = e.photo
    ? `<img src="${e.photo}" style="width:90px;height:104px;object-fit:cover;border-radius:6px;border:3px solid #b8892a;" alt="${e.name}"/>`
    : `<div style="width:90px;height:104px;border-radius:6px;background:#1a3a5c;border:3px solid #b8892a;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff;">${initials(e.name)}</div>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
  <html><head>
    <title>Staff Record — ${e.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',sans-serif;background:#fff;padding:20px;}
      .sheet{max-width:680px;margin:0 auto;border:2px solid #0f2744;border-radius:8px;overflow:hidden;}
      .hdr{background:linear-gradient(135deg,#0f2744,#1a3a5c);padding:20px;display:flex;gap:18px;align-items:flex-start;}
      .org-name{font-size:10px;font-weight:800;color:#b8892a;text-transform:uppercase;letter-spacing:1.5px;}
      .emp-name{font-size:20px;font-weight:800;color:#fff;line-height:1.2;}
      .emp-cadre{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}
      .badges{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;}
      .badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
      .bp{background:#b8892a;color:#1a0f00;}
      .bg{background:rgba(255,255,255,.15);color:#fff;}
      .bs{background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);}
      .fields{display:grid;grid-template-columns:1fr 1fr;}
      .field{padding:10px 16px;border-bottom:1px solid #eef0f6;}
      .field:nth-child(odd){border-right:1px solid #eef0f6;}
      .fl{font-size:10px;font-weight:700;color:#8e99b0;text-transform:uppercase;letter-spacing:.4px;}
      .fv{font-size:13px;font-weight:600;color:#1e2a3a;margin-top:2px;font-family:'JetBrains Mono',monospace;}
      .foot{background:#f7f8fc;border-top:1px solid #dde1ec;padding:9px 16px;font-size:10px;color:#8e99b0;display:flex;justify-content:space-between;}
      @media print{body{padding:0;}@page{margin:.8cm;size:A4 portrait;}}
    </style>
  </head><body>
  <div class="sheet">
    <div class="hdr">
      ${photoHTML}
      <div style="flex:1;">
        <div class="org-name">Adamawa State Mass Education Board</div>
        <div class="emp-name">${esc(e.name)}</div>
        <div class="emp-cadre">${esc(e.cadre || '—')}</div>
        <div class="badges">
          <span class="badge bp">${esc(e.psn || 'No PSN')}</span>
          <span class="badge bg">${esc(e.grade || '—')}</span>
          <span class="badge bs">📍 ${esc(e.station || '—')}</span>
        </div>
      </div>
    </div>
    <div class="fields">
      <div class="field"><div class="fl">Date of First Appointment</div><div class="fv">${fmtDate(e.date_first_appt)}</div></div>
      <div class="field"><div class="fl">Date of Present Appointment</div><div class="fv">${fmtDate(e.date_present_appt)}</div></div>
      <div class="field"><div class="fl">Date of Birth</div><div class="fv">${fmtDate(e.dob)}${e.dob ? ' (' + calcAge(e.dob) + ')' : ''}</div></div>
      <div class="field"><div class="fl">Phone Number</div><div class="fv">${esc(e.phone || '—')}</div></div>
      <div class="field"><div class="fl">LGA of Origin</div><div class="fv">${esc(e.lga || '—')}</div></div>
      <div class="field"><div class="fl">Present Station</div><div class="fv">${esc(e.station || '—')}</div></div>
    </div>
    ${e.remarks ? `<div style="padding:10px 16px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#78350f;"><strong>Remarks:</strong> ${esc(e.remarks)}</div>` : ''}
    <div class="foot">
      <span>AMEB — Permanent & Pensionable Officers Register</span>
      <span>Printed: ${new Date().toLocaleDateString('en-GB')}</span>
    </div>
  </div>
  <script>window.onload=()=>{window.print();}<\\/script>
  </body></html>`);
  w.document.close();
}
