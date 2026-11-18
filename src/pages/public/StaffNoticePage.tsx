/* Board notice — Staff Records Update (PSN self-service portal).
   Designed as an A4 portrait sheet: the same markup is the on-screen notice
   and the print/PDF version. Print CSS lives in the <style> block so the
   poster is not distorted by the portal's global print rules. */

import { ArrowLeft, Printer, Download } from 'lucide-react';
import { SITE_URL } from '@/lib/seo';
import { usePageMeta } from '@/hooks/usePageMeta';

/** Contact details printed on the notice. */
const EMAIL = 'emis.adsmeb@gmail.com';
const PHONE = '0803 577 8419';
/** The Board's live website, shown without the protocol (staff type it). */
const WEBSITE = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
/** Picture version of this notice, ready to share on WhatsApp. */
const IMAGE_FILE = '/ADSMEB-Staff-PSN-Notice.png';

const GREEN = '#1A5C38';
const GREEN_DARK = '#0F3D25';
const GOLD = '#D4A017';
const INK = '#1A1A1A';
const MUTED = '#4A5568';
const BORDER = '#D1D9D4';

const CHECKLIST = [
  'Full name', 'Gender',
  'Grade level and step', 'Cadre',
  'Date of first appointment', 'Date of present appointment',
  'Date of birth', 'Phone number',
  'LGA of origin', 'Present station',
  'Residential address', 'Passport photograph',
];

const STEPS = [
  { title: 'Visit the Board website', body: `Open ${WEBSITE} on your phone or computer.` },
  { title: 'Enter your PSN', body: 'Type your Staff Number (PSN) into the “Update your details” box at the top of the page.' },
  { title: 'Confirm it is you', body: 'Enter your date of birth, or the last 4 digits of the phone number on file.' },
  { title: 'Update and submit', body: 'Check every entry, review the changes, then press “Submit — Apply Now”.' },
];

interface StaffNoticePageProps {
  onBack: () => void;
}

export function StaffNoticePage({ onBack }: StaffNoticePageProps) {
  usePageMeta({
    title: 'Notice to All Staff — Staff Records Update',
    description: 'Public notice to all staff of the Adamawa State Mass Education Board: log in to the staff portal with your PSN and update your details.',
    path: '/notice',
  });

  return (
    <div className="notice-page" style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '24px 16px 48px' }}>
      <style>{`
        .notice-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          .notice-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .notice-toolbar { display: none !important; }
          .notice-sheet {
            width: 210mm !important; min-height: 297mm !important;
            margin: 0 !important; border: none !important; box-shadow: none !important;
          }
        }
      `}</style>

      {/* Toolbar — never printed */}
      <div className="notice-toolbar" style={{ maxWidth: '210mm', margin: '0 auto 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer"
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={13} /> Back to Website
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <a
            href={IMAGE_FILE}
            download
            className="inline-flex items-center gap-2"
            style={{
              textDecoration: 'none', fontSize: 12.5, fontWeight: 600, padding: '9px 14px',
              borderRadius: 8, border: `1px solid ${BORDER}`, color: GREEN, background: '#fff',
            }}
          >
            <Download size={14} /> Save image for WhatsApp
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 cursor-pointer"
            style={{
              fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 8,
              border: 'none', color: '#fff', background: GREEN,
            }}
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── The notice ─────────────────────────────────────────────────────── */}
      <div
        className="notice-sheet"
        style={{
          width: '210mm',
          maxWidth: '100%',
          minHeight: '297mm',
          margin: '0 auto',
          background: '#FFFFFF',
          color: INK,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          padding: '10mm 15mm 7mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Letterhead */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '3.4px', textTransform: 'uppercase', color: MUTED }}>
            Adamawa State Government
          </div>
          <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '0.2px', color: GREEN_DARK, marginTop: 5, lineHeight: 1.15 }}>
            ADAMAWA STATE MASS EDUCATION BOARD
          </div>
          <div style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: MUTED, marginTop: 5 }}>
            Office of the Executive Secretary · Board Headquarters, Yola
          </div>
        </div>

        {/* Double rule */}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 3, background: GREEN }} />
          <div style={{ height: 1, background: GOLD, marginTop: 2 }} />
        </div>

        {/* Title band */}
        <div style={{ marginTop: 10, background: GREEN, color: '#fff', textAlign: 'center', padding: '9px 12px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '3.2px' }}>NOTICE TO ALL STAFF</div>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '1.8px', marginTop: 3, color: '#F3E7C4' }}>
            STAFF RECORDS UPDATE — LOG IN WITH YOUR PSN
          </div>
        </div>

        {/* Ref / date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 9, color: MUTED, marginTop: 6, paddingBottom: 5, borderBottom: `1px solid ${BORDER}` }}>
          <span>Ref: ADSMEB/EMIS/STAFF-REC/____</span>
          <span>Date: 18 November 2026</span>
        </div>

        {/* Body */}
        <p style={{ fontSize: 10.5, lineHeight: 1.55, margin: '8px 0 0', textAlign: 'justify' }}>
          All staff of the Adamawa State Mass Education Board are hereby informed that the Board has opened its
          <strong> Staff Self-Service Portal</strong> for the update of staff records. Every officer is required to log in to the
          portal with his or her <strong>Staff Number (PSN)</strong> and update his or her details.
          <strong> No password is required.</strong> Your PSN is your identity on the portal.
        </p>

        {/* How to log in */}
        <div style={{ marginTop: 9, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GREEN}`, background: '#F2F7F4', padding: '8px 11px 9px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: GREEN_DARK }}>
            How to log in and update your details
          </div>
          <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
            {STEPS.map((s, i) => (
              <div key={s.title} style={{ display: 'flex', gap: 7 }}>
                <div style={{
                  flex: '0 0 auto', width: 18, height: 18, borderRadius: '50%', background: GREEN,
                  color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginTop: 1,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: INK }}>{s.title}</div>
                  <div style={{ fontSize: 9, lineHeight: 1.4, color: MUTED, marginTop: 1 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px dashed ${BORDER}`, fontSize: 9.5, color: INK }}>
            Website&nbsp;&nbsp;<strong style={{ letterSpacing: '0.4px' }}>{WEBSITE}</strong>
            <span style={{ color: MUTED }}> — the PSN box is labelled “Update your details” at the top of the page.</span>
          </div>
        </div>

        {/* Important */}
        <div style={{ marginTop: 8, border: `1px solid ${GOLD}`, background: '#FDF8E8', padding: '8px 11px 9px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8A6600' }}>
            Important — please read before submitting
          </div>
          <ul style={{ margin: '5px 0 0', paddingLeft: 15, fontSize: 9.8, lineHeight: 1.4 }}>
            <li>You can update your details <strong>only once</strong>, so check every entry before you submit.</li>
            <li>Changes take effect on the Board's register <strong>immediately</strong> — there is no approval stage.</li>
            <li>Your <strong>PSN cannot be changed</strong> on the portal. It identifies your record.</li>
            <li>Staff not yet on the register should contact the EMIS / Records Unit on the details below.</li>
          </ul>
        </div>

        {/* Checklist */}
        <div style={{ marginTop: 9 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: GREEN_DARK }}>
            Please have the following ready
          </div>
          <div style={{ marginTop: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px' }}>
            {CHECKLIST.map(item => (
              <div key={item} style={{ display: 'flex', gap: 6, fontSize: 9.8, color: MUTED }}>
                <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>{item}
              </div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <p style={{ fontSize: 10.5, lineHeight: 1.5, margin: '8px 0 0' }}>
          This notice is issued for the information and <strong>immediate compliance</strong> of all staff of the Board.
        </p>

        <div style={{ flex: 1, minHeight: 8 }} />

        {/* Contacts + signature */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginTop: 8 }}>
          <div style={{ fontSize: 9, lineHeight: 1.65, color: MUTED, paddingBottom: 2 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: GREEN_DARK, marginBottom: 2 }}>
              Enquiries
            </div>
            <div>EMIS / Records Unit</div>
            <div>Email: <strong style={{ color: INK }}>{EMAIL}</strong></div>
            <div>Telephone: <strong style={{ color: INK }}>{PHONE}</strong></div>
            <div>Website: <strong style={{ color: INK }}>{WEBSITE}</strong></div>
          </div>

          <div style={{ textAlign: 'center', minWidth: 190, paddingBottom: 2 }}>
            <div style={{ fontSize: 8.5, color: MUTED, marginBottom: 2 }}>Signed for the Board</div>
            {/* Signature and name are added by the Executive Secretary before issue. */}
            <div style={{ height: 40 }} />
            <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 4 }}>
              <div style={{ fontSize: 10, color: INK }}>Name: ______________________________</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: INK, marginTop: 2 }}>Executive Secretary</div>
              <div style={{ fontSize: 9, color: MUTED }}>Adamawa State Mass Education Board</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 10, paddingTop: 5, borderTop: `3px solid ${GREEN}`,
          display: 'flex', justifyContent: 'space-between', gap: 10,
          fontSize: 8, letterSpacing: '0.8px', textTransform: 'uppercase', color: MUTED,
        }}>
          <span>Adamawa State Mass Education Board</span>
          <span>Staff Records Update · November 2026</span>
        </div>
      </div>
    </div>
  );
}
