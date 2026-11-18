/* Generates the editable Word version of the Board's Staff Records Update
   notice (docs/ADSMEB-Staff-PSN-Notice.docx). Kept out of public/ on purpose:
   the Word master is for the Board Office, not a download on the website.

   Self-contained: builds the OOXML parts and zips them with Node's built-ins,
   so it needs no third-party package. Run with:
       node scripts/generate-notice-docx.mjs
   The signature and the Executive Secretary's name are deliberately left blank
   for the ES to complete before the notice is issued. */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/ADSMEB-Staff-PSN-Notice.docx');

// ── Design tokens (match src/pages/public/StaffNoticePage.tsx) ──────────────
const GREEN = '1A5C38';
const GREEN_DARK = '0F3D25';
const GOLD = 'D4A017';
const INK = '1A1A1A';
const MUTED = '4A5568';
const BORDER = 'D1D9D4';
const WARM = 'F2F7F4';
const CREAM = 'FDF8E8';

const WEBSITE = 'asmeb.vercel.app';
const EMAIL = 'emis.adsmeb@gmail.com';
const PHONE = '0803 577 8419';

// ── XML helpers ────────────────────────────────────────────────────────────
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function run(text, o = {}) {
  const rpr = [
    o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>` : '',
    o.bold ? '<w:b/><w:bCs/>' : '',
    o.italic ? '<w:i/><w:iCs/>' : '',
    o.color ? `<w:color w:val="${o.color}"/>` : '',
    o.size ? `<w:sz w:val="${Math.round(o.size * 2)}"/><w:szCs w:val="${Math.round(o.size * 2)}"/>` : '',
    o.spacing ? `<w:spacing w:val="${o.spacing}"/>` : '',
  ].join('');
  return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(content, o = {}) {
  const ppr = [
    o.align ? `<w:jc w:val="${o.align}"/>` : '',
    `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 0}" w:line="${o.line ?? 240}" w:lineRule="auto"/>`,
    o.shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>` : '',
    o.borders ?? '',
    o.tabs ?? '',
    o.keepNext ? '<w:keepNext/>' : '',
    o.indent ? `<w:ind w:left="${o.indent}" w:hanging="${o.hanging ?? 0}"/>` : '',
  ].join('');
  const runs = Array.isArray(content) ? content.join('') : content;
  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}

const bottomBorder = (color, size = 18, space = 1) =>
  `<w:pBdr><w:bottom w:val="single" w:sz="${size}" w:space="${space}" w:color="${color}"/></w:pBdr>`;

function cell(content, { width, shd, borders } = {}) {
  const tcpr = [
    width ? `<w:tcW w:w="${width}" w:type="dxa"/>` : '',
    shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : '',
    borders ? `<w:tcBorders>${borders}</w:tcBorders>` : '',
  ].join('');
  const body = Array.isArray(content) ? content.join('') : content;
  return `<w:tc><w:tcPr>${tcpr}</w:tcPr>${body}</w:tc>`;
}

const NO_BORDERS = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  .map((s) => `<w:${s} w:val="none" w:sz="0" w:space="0" w:color="auto"/>`).join('');

function table({ rows, widths, borders, cellMar = 90 }) {
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>
      <w:tblBorders>${borders ?? NO_BORDERS}</w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="${cellMar}" w:type="dxa"/><w:left w:w="140" w:type="dxa"/>
        <w:bottom w:w="${cellMar}" w:type="dxa"/><w:right w:w="140" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>${grid}</w:tblGrid>
    ${rows.join('')}
  </w:tbl>`;
}

const row = (cells) => `<w:tr>${cells.join('')}</w:tr>`;

// ── Document content ───────────────────────────────────────────────────────
const CONTENT_WIDTH = 10092; // A4 minus 1.6 cm margins on each side (twips)

const steps = [
  ['Visit the Board website', `Open ${WEBSITE} on your phone or computer.`],
  ['Enter your PSN', 'Type your Staff Number (PSN) into the “Update your details” box at the top of the page, then press the search button.'],
  ['Confirm it is you', 'Enter your date of birth, or the last 4 digits of the phone number on your file, to open your record.'],
  ['Update and submit', 'Check every entry, review the changes, then press “Submit — Apply Now”.'],
];

const stepParagraphs = [];
for (let i = 0; i < steps.length; i += 2) {
  const pair = [steps[i], steps[i + 1]].filter(Boolean);
  stepParagraphs.push(`<w:p><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`);
  stepParagraphs.push(table({
    widths: [4906, 4906],
    rows: [row(pair.map(([title, body]) => cell([
      para(run(title, { bold: true, size: 10, color: INK }), { after: 10 }),
      para(run(body, { size: 9, color: MUTED }), { line: 240 }),
    ], { width: 4906 })))],
  }));
}

const checklist = [
  'Full name', 'Gender',
  'Grade level and step', 'Cadre',
  'Date of first appointment', 'Date of present appointment',
  'Date of birth', 'Phone number',
  'LGA of origin', 'Present station',
  'Residential address', 'Passport photograph',
];
const checklistRows = [];
for (let i = 0; i < checklist.length; i += 2) {
  checklistRows.push(row([checklist[i], checklist[i + 1]].map((item) => cell(
    para([run('✓  ', { size: 9.5, bold: true, color: GREEN }), run(item, { size: 9.5, color: MUTED })]),
    { width: 5046 },
  ))));
}

const importantPoints = [
  ['You can update your details ', 'only once', '. Check every entry before you submit.'],
  ['Changes take effect on the Board\u2019s register ', 'immediately', ' \u2014 there is no approval stage.'],
  ['Your ', 'PSN cannot be changed', ' on the portal. It identifies your record.'],
  ['Staff not yet on the register should contact the EMIS / Records Unit on the details below.'],
  ['Keep your login details private. Never ask another officer to update your record for you.'],
];

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>

  ${para(run('ADAMAWA STATE GOVERNMENT', { bold: true, size: 8.5, color: MUTED, spacing: 70 }), { align: 'center', after: 20 })}
  ${para(run('ADAMAWA STATE MASS EDUCATION BOARD', { bold: true, size: 17, color: GREEN_DARK, font: 'Times New Roman' }), { align: 'center', after: 30 })}
  ${para(run('OFFICE OF THE EXECUTIVE SECRETARY  \u00b7  BOARD HEADQUARTERS, YOLA', { size: 8, color: MUTED, spacing: 24 }), { align: 'center', after: 60 })}

  <w:p><w:pPr><w:pBdr>
    <w:top w:val="single" w:sz="24" w:space="1" w:color="${GREEN}"/>
    <w:bottom w:val="single" w:sz="8" w:space="3" w:color="${GOLD}"/>
  </w:pBdr><w:spacing w:after="140"/></w:pPr></w:p>

  ${table({
    widths: [CONTENT_WIDTH],
    rows: [row([cell([
      para(run('NOTICE TO ALL STAFF', { bold: true, size: 14, color: 'FFFFFF', spacing: 60 }), { align: 'center', after: 40 }),
      para(run('STAFF RECORDS UPDATE \u2014 LOG IN WITH YOUR PSN', { bold: true, size: 8.5, color: 'F3E7C4', spacing: 24 }), { align: 'center' }),
    ], { width: CONTENT_WIDTH, shd: GREEN })])],
    borders: `<w:top w:val="single" w:sz="4" w:space="0" w:color="${GREEN}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="${GREEN}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${GREEN}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="${GREEN}"/>`,
    cellMar: 160,
  })}

  ${para([
    run('Ref: ADSMEB/EMIS/STAFF-REC/____', { size: 8.5, color: MUTED }),
    '<w:r><w:tab/></w:r>',
    run('Date: 18 November 2026', { size: 8.5, color: MUTED }),
  ], {
    before: 160, after: 120,
    tabs: `<w:tabs><w:tab w:val="right" w:pos="${CONTENT_WIDTH}"/></w:tabs>`,
    borders: bottomBorder(BORDER, 6, 4),
  })}

  ${para([
    run('All staff of the Adamawa State Mass Education Board are hereby informed that the Board has opened its '),
    run('Staff Self-Service Portal', { bold: true }),
    run(' for the update of staff records. Every officer is required to log in to the portal with his or her '),
    run('Staff Number (PSN)', { bold: true }),
    run(' and update his or her details.'),
  ], { size: 11, align: 'both', after: 100 })}

  ${para([
    run('No password is required.', { bold: true }),
    run(' Your PSN is your identity on the portal.'),
  ], { size: 11, align: 'both', after: 140 })}

  ${table({
    widths: [CONTENT_WIDTH],
    rows: [row([cell([
      para(run('HOW TO LOG IN AND UPDATE YOUR DETAILS', { bold: true, size: 8.5, color: GREEN_DARK, spacing: 24 }), { after: 80 }),
      ...stepParagraphs,
      para([
        run('Website   ', { size: 9, color: MUTED }),
        run(WEBSITE, { bold: true, size: 10.5, color: INK, spacing: 16 }),
        run(' \u2014 the PSN box is labelled \u201cUpdate your details\u201d at the top of the page.', { size: 9, color: MUTED }),
      ], { before: 100, borders: bottomBorder(BORDER, 6, 6) }),
    ], { width: CONTENT_WIDTH, shd: WARM })])],
    borders: `<w:top w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/><w:left w:val="single" w:sz="24" w:space="0" w:color="${GREEN}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>`,
    cellMar: 120,
  })}

  ${para('', { after: 60 })}

  ${table({
    widths: [CONTENT_WIDTH],
    rows: [row([cell([
      para(run('IMPORTANT \u2014 PLEASE READ BEFORE SUBMITTING', { bold: true, size: 8.5, color: '8A6600', spacing: 24 }), { after: 70 }),
      ...importantPoints.map((parts) => para(parts.map((t, i) => run(t, { bold: i % 2 === 1, size: 9.5, color: i % 2 === 1 ? INK : MUTED })), {
        size: 9.5, indent: 260, hanging: 140, after: 40,
      })),
    ], { width: CONTENT_WIDTH, shd: CREAM })])],
    borders: `<w:top w:val="single" w:sz="4" w:space="0" w:color="${GOLD}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="${GOLD}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${GOLD}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="${GOLD}"/>`,
    cellMar: 120,
  })}

  ${para(run('PLEASE HAVE THE FOLLOWING READY', { bold: true, size: 8.5, color: GREEN_DARK, spacing: 24 }), { before: 160, after: 80 })}

  ${table({ widths: [5046, 5046], rows: checklistRows })}

  ${para('This notice is issued for the information and immediate compliance of all staff of the Board.', { size: 11, after: 160 })}

  ${table({
    widths: [5500, 4592],
    rows: [row([
      cell([
        para(run('ENQUIRIES', { bold: true, size: 8, color: GREEN_DARK, spacing: 24 }), { after: 40 }),
        para(run('EMIS / Records Unit', { size: 9, color: MUTED })),
        para([run('Email: ', { size: 9, color: MUTED }), run(EMAIL, { size: 9, bold: true, color: INK })]),
        para([run('Telephone: ', { size: 9, color: MUTED }), run(PHONE, { size: 9, bold: true, color: INK })]),
        para([run('Website: ', { size: 9, color: MUTED }), run(WEBSITE, { size: 9, bold: true, color: INK })]),
      ], { width: 5500 }),
      cell([
        para(run('Signed for the Board', { size: 8.5, color: MUTED }), { align: 'center', after: 40 }),
        // Space for the Executive Secretary's signature.
        para('', { after: 60 }), para('', { after: 60 }), para('', { after: 60 }),
        para(run('Name: ______________________________', { size: 10, color: INK }), { align: 'center', after: 40 }),
        para(run('Executive Secretary', { bold: true, size: 10, color: INK }), { align: 'center', after: 20 }),
        para(run('Adamawa State Mass Education Board', { size: 8.5, color: MUTED }), { align: 'center' }),
      ], { width: 4592 }),
    ])],
  })}

  ${para([
    run('ADAMAWA STATE MASS EDUCATION BOARD', { size: 7.5, color: MUTED, spacing: 16 }),
    '<w:r><w:tab/></w:r>',
    run('STAFF RECORDS UPDATE \u00b7 NOVEMBER 2026', { size: 7.5, color: MUTED, spacing: 16 }),
  ], {
    before: 220,
    borders: bottomBorder(GREEN, 24, 4),
    tabs: `<w:tabs><w:tab w:val="right" w:pos="${CONTENT_WIDTH}"/></w:tabs>`,
  })}

  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="737" w:right="907" w:bottom="680" w:left="907" w:header="425" w:footer="425" w:gutter="0"/>
  </w:sectPr>
</w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
      <w:sz w:val="21"/><w:szCs w:val="21"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
  </w:style>
</w:styles>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Notice to All Staff \u2014 Staff Records Update</dc:title>
  <dc:subject>Log in to the staff portal with your PSN and update your details</dc:subject>
  <dc:creator>Adamawa State Mass Education Board</dc:creator>
  <cp:lastModifiedBy>ADSMEB</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-11-18T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-18T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
</Properties>`;

// ── ZIP (stored, no compression) ───────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const crc = crc32(body);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);      // version needed
    local.writeUInt16LE(0x0800, 6);  // UTF-8 names
    local.writeUInt16LE(0, 8);       // stored
    local.writeUInt16LE(0, 10);      // time
    local.writeUInt16LE(0x21, 12);   // date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(body.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, end]);
}

const files = [
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels', data: rootRels },
  { name: 'docProps/core.xml', data: coreXml },
  { name: 'docProps/app.xml', data: appXml },
  { name: 'word/document.xml', data: documentXml },
  { name: 'word/styles.xml', data: stylesXml },
  { name: 'word/_rels/document.xml.rels', data: documentRels },
];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, zip(files));
console.log(`✓ Wrote ${OUT} (${files.length} parts)`);
