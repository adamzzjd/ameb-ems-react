import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../components/ui/Modal';
import { LGAs } from '../data/constants';
import type { Centre } from '../types';
import { dbLoadCentres, dbSaveCentre, dbDeleteCentre } from '../supabase/centres';
import { useToast } from '../hooks/useToast';

interface CentresManagerProps {
  onNavigate?: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

const CENTRE_TYPES = [
  'Literacy Centre',
  'Vocational Training Centre',
  'Home Economics Centre',
  'Nomadic Education Centre',
  'Adult Education Centre',
  'Non-Formal Education Centre',
  'Other',
];

const CENTRE_STATUSES = ['Active', 'Inactive', 'Under Construction', 'Closed'];

function statusColor(s: string | null | undefined): string {
  switch (s) {
    case 'Active':             return '#16a34a';
    case 'Inactive':           return '#64748b';
    case 'Under Construction': return '#d97706';
    case 'Closed':             return '#dc2626';
    default:                   return '#64748b';
  }
}

function statusBg(s: string | null | undefined): string {
  switch (s) {
    case 'Active':             return 'rgba(22,163,74,.1)';
    case 'Inactive':           return 'rgba(100,116,139,.1)';
    case 'Under Construction': return 'rgba(217,119,6,.1)';
    case 'Closed':             return 'rgba(220,38,38,.1)';
    default:                   return 'rgba(100,116,139,.1)';
  }
}

export function CentresManager({ onNavigate: _onNavigate }: CentresManagerProps) {
  const { toast } = useToast();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterLGA, setFilterLGA] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Centre | null>(null);
  const [formName, setFormName] = useState('');
  const [formLga, setFormLga] = useState('');
  const [formWard, setFormWard] = useState('');
  const [formCommunity, setFormCommunity] = useState('');
  const [formType, setFormType] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formCapacity, setFormCapacity] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formFacilitator, setFormFacilitator] = useState('');
  const [formNgo, setFormNgo] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // View modal state
  const [viewCentre, setViewCentre] = useState<Centre | null>(null);
  const [showView, setShowView] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadCentres();
    if (!error && data) {
      setCentres(data);
    } else {
      setCentres([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived stats
  const stats = useMemo(() => {
    const byLGA: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    centres.forEach(c => {
      if (c.lga)    byLGA[c.lga]    = (byLGA[c.lga] || 0) + 1;
      if (c.type)   byType[c.type]  = (byType[c.type] || 0) + 1;
      if (c.status) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });
    return {
      total: centres.length,
      active: byStatus['Active'] || 0,
      lgasCovered: Object.keys(byLGA).length,
      withNgo: centres.filter(c => c.ngo_partner).length,

    };
  }, [centres]);

  // Filtered centres
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return centres.filter(c =>
      (!q || (c.name||'').toLowerCase().includes(q) ||
             (c.community||'').toLowerCase().includes(q) ||
             (c.facilitator||'').toLowerCase().includes(q) ||
             (c.ngo_partner||'').toLowerCase().includes(q))
      && (!filterLGA    || c.lga    === filterLGA)
      && (!filterType   || c.type   === filterType)
      && (!filterStatus || c.status === filterStatus)
    );
  }, [centres, search, filterLGA, filterType, filterStatus]);

  const clearFilters = () => {
    setSearch('');
    setFilterLGA('');
    setFilterType('');
    setFilterStatus('');
  };

  // ── Form handlers ──

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormLga('');
    setFormWard('');
    setFormCommunity('');
    setFormType('');
    setFormStatus('Active');
    setFormCapacity('');
    setFormPhone('');
    setFormFacilitator('');
    setFormNgo('');
    setFormRemarks('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c: Centre) => {
    setEditing(c);
    setFormName(c.name);
    setFormLga(c.lga || '');
    setFormWard(c.ward || '');
    setFormCommunity(c.community || '');
    setFormType(c.type || '');
    setFormStatus(c.status || 'Active');
    setFormCapacity(c.capacity != null ? String(c.capacity) : '');
    setFormPhone(c.phone || '');
    setFormFacilitator(c.facilitator || '');
    setFormNgo(c.ngo_partner || '');
    setFormRemarks(c.remarks || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    const lga  = formLga.trim();
    if (!name) { setFormError('Centre name is required'); return; }
    if (!lga)  { setFormError('LGA is required'); return; }

    setSaving(true);
    const payload = {
      id: editing?.id,
      name,
      lga,
      ward: formWard.trim(),
      community: formCommunity.trim(),
      type: formType,
      status: formStatus || 'Active',
      capacity: formCapacity ? parseInt(formCapacity) || null : null,
      phone: formPhone.trim(),
      facilitator: formFacilitator,
      ngo_partner: formNgo.trim(),
      remarks: formRemarks.trim(),
    };

    const { data, error } = await dbSaveCentre(payload);
    if (error) {
      toast('Failed to save centre: ' + error.message, true);
      setSaving(false);
      return;
    }
    if (data) {
      if (editing) {
        setCentres(prev => prev.map(c => c.id === data.id ? data : c));
      } else {
        setCentres(prev => [...prev, data]);
      }
    }
    setSaving(false);
    setShowForm(false);
    toast(`✓ ${name} ${editing ? 'updated' : 'added'} successfully.`);
  };

  const openView = async (id: string) => {
    const c = centres.find(x => x.id === id);
    if (c) {
      setViewCentre(c);
      setShowView(true);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const { error } = await dbDeleteCentre(showDelete.id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setCentres(prev => prev.filter(c => c.id !== showDelete.id));
    toast(`Centre "${showDelete.name}" deleted.`);
    setShowDelete(null);
  };

  // ── Print ──

  const handlePrintCentres = (items: Centre[]) => {
    if (!items.length) { toast('No centres to print.', true); return; }
    const rows = items.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:600;">${esc(c.name)}</td>
        <td>${esc(c.lga||'—')}</td>
        <td>${esc(c.ward||'—')}</td>
        <td>${esc(c.community||'—')}</td>
        <td>${esc(c.type||'—')}</td>
        <td>${esc(c.facilitator||'—')}</td>
        <td>${esc(c.ngo_partner||'—')}</td>
        <td>${esc(c.capacity != null ? String(c.capacity) : '—')}</td>
        <td>${esc(c.status||'—')}</td>
      </tr>`).join('');

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Learning Centres Register</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;}body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:#27313b;}
      .hdr{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
      .org{font-size:16px;font-weight:800;color:#0f6e56;}.sub{font-size:11px;color:#64748b;}
      h2{font-size:13px;font-weight:700;color:#0f6e56;margin:10px 0 3px;}
      p{font-size:11px;color:#64748b;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#0f6e56;color:#fff;padding:7px 8px;text-align:left;font-size:10px;font-weight:700;}
      td{padding:6px 8px;border-bottom:1px solid #eef0f6;}
      tr:nth-child(even) td{background:#f7f8fc;}
      .foot{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;}
      @media print{body{padding:0;}@page{margin:.8cm;size:A4 landscape;}}
    </style></head><body>
    <div class="hdr"><div style="width:44px;height:44px;background:#0f6e56;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#e1f5ee;">🏛</div>
      <div><div class="org">Adamawa State Mass Education Board</div>
      <div class="sub">Learning Centres Register — EMIS</div></div>
    </div>
    <h2>Learning Centres Register</h2>
    <p>Total: <strong>${items.length}</strong> centre${items.length !== 1 ? 's' : ''} &middot; Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    <table><thead><tr>
      <th>#</th><th>Centre Name</th><th>LGA</th><th>Ward</th><th>Community</th>
      <th>Type</th><th>Facilitator</th><th>NGO Partner</th><th>Capacity</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="foot"><span>AMEB EMS &middot; Learning Centres Register</span><span>Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const handlePrintSingle = (c: Centre) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Inter',sans-serif;padding:20px;}
      .sheet{max-width:600px;margin:0 auto;border:2px solid #0f6e56;border-radius:8px;overflow:hidden;}
      .hdr{background:#0f6e56;padding:18px 20px;}
      .org-name{font-size:10px;font-weight:800;color:#e1f5ee;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
      .cname{font-size:18px;font-weight:800;color:#fff;}.ctype{font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;}
      .fields{display:grid;grid-template-columns:1fr 1fr;}
      .field{padding:9px 16px;border-bottom:1px solid #eef0f6;}.field:nth-child(odd){border-right:1px solid #eef0f6;}
      .fl{font-size:10px;font-weight:700;color:#8e99b0;text-transform:uppercase;letter-spacing:.4px;}
      .fv{font-size:13px;font-weight:600;color:#27313b;margin-top:2px;}
      .foot{background:#f7f8fc;border-top:1px solid #dde1ec;padding:9px 16px;font-size:10px;color:#8e99b0;display:flex;justify-content:space-between;}
      .rem{background:#fffbeb;border-top:1px solid #fde68a;padding:10px 16px;font-size:12px;color:#78350f;}
      @media print{body{padding:0;}@page{margin:.8cm;size:A4 portrait;}}
    </style></head><body>
    <div class="sheet">
      <div class="hdr">
        <div class="org-name">Adamawa State Mass Education Board</div>
        <div class="cname">${esc(c.name)}</div>
        <div class="ctype">${esc(c.type||'—')}</div>
      </div>
      <div class="fields">
        <div class="field"><div class="fl">LGA</div><div class="fv">${esc(c.lga||'—')}</div></div>
        <div class="field"><div class="fl">Ward</div><div class="fv">${esc(c.ward||'—')}</div></div>
        <div class="field"><div class="fl">Community</div><div class="fv">${esc(c.community||'—')}</div></div>
        <div class="field"><div class="fl">Capacity</div><div class="fv">${c.capacity != null ? c.capacity : '—'}</div></div>
        <div class="field"><div class="fl">Facilitator</div><div class="fv">${esc(c.facilitator||'—')}</div></div>
        <div class="field"><div class="fl">Phone</div><div class="fv">${esc(c.phone||'—')}</div></div>
        <div class="field"><div class="fl">NGO Partner</div><div class="fv">${esc(c.ngo_partner||'—')}</div></div>
        <div class="field"><div class="fl">Status</div><div class="fv">${esc(c.status||'—')}</div></div>
      </div>
      ${c.remarks ? `<div class="rem"><strong>Remarks:</strong> ${esc(c.remarks)}</div>` : ''}
      <div class="foot"><span>AMEB — Learning Centres Register</span><span>Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
    </div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #d3ded9', borderTopColor: '#0f6e56', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading centres…
      </div>
    );
  }

  return (
    <div>
      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#0f6e56', borderRadius: 10, padding: '14px 16px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Total Centres</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Across all LGAs</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2eae6', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Active</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{stats.active}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Currently operating</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2eae6', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>LGAs Covered</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f6e56', marginTop: 2 }}>{stats.lgasCovered}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>of {LGAs.length} LGAs</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2eae6', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>With NGO Partner</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f6e56', marginTop: 2 }}>{stats.withNgo}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Supported centres</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14,
        padding: '11px 14px', background: '#fff', border: '1px solid #e2eae6',
        borderRadius: 10, alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, community, facilitator, NGO…"
            style={{ padding: '7px 10px', border: '1px solid #d3ded9', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', background: '#f7faf8' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.3px' }}>LGA</div>
          <select
            value={filterLGA} onChange={e => setFilterLGA(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d3ded9', borderRadius: 6, fontSize: 12, outline: 'none', background: '#f7faf8', appearance: 'none', paddingRight: 24, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="">All LGAs</option>
            {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.3px' }}>Type</div>
          <select
            value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d3ded9', borderRadius: 6, fontSize: 12, outline: 'none', background: '#f7faf8', appearance: 'none', paddingRight: 24, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="">All Types</option>
            {CENTRE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.3px' }}>Status</div>
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d3ded9', borderRadius: 6, fontSize: 12, outline: 'none', background: '#f7faf8', appearance: 'none', paddingRight: 24, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="">All Statuses</option>
            {CENTRE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={clearFilters} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#475569', whiteSpace: 'nowrap' }}>
            Clear
          </button>
          <button onClick={() => handlePrintCentres(filtered)} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#475569' }}>
            🖨 Print
          </button>
          <button onClick={openAdd} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#0f6e56', color: '#fff', whiteSpace: 'nowrap' }}>
            + Add Centre
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e2eae6', borderRadius: 12, overflow: 'hidden', boxShadow: 'none' }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid #e2eae6' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Showing <strong style={{ color: '#27313b' }}>{filtered.length}</strong> of {stats.total} centres
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Centre Name</th>
                <th style={thStyle}>LGA</th>
                <th style={thStyle}>Ward</th>
                <th style={thStyle}>Community</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Facilitator</th>
                <th style={thStyle}>NGO Partner</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🏫</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                      {centres.length > 0 ? 'No centres match your filters.' : 'No centres yet.'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {centres.length > 0
                        ? <span onClick={clearFilters} style={{ color: '#0f6e56', cursor: 'pointer', fontWeight: 600 }}>Clear filters</span>
                        : 'Click "+ Add Centre" to register your first learning centre.'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2eae6', background: i % 2 === 0 ? '#fff' : '#f7faf8' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#27313b', cursor: 'pointer' }}
                    onClick={() => openView(c.id)}>
                    {esc(c.name)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.lga || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.ward || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.community || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.type || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.facilitator || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.ngo_partner || '—')}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      background: statusBg(c.status), color: statusColor(c.status),
                    }}>
                      {esc(c.status || '—')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openView(c.id)} title="View" style={actionBtnStyle}>👁</button>
                      <button onClick={() => openEdit(c)} title="Edit" style={{ ...actionBtnStyle, background: '#0f6e56', color: '#fff' }}>✏️</button>
                      <button onClick={() => setShowDelete({ id: c.id, name: c.name })} title="Delete" style={{ ...actionBtnStyle, color: '#c0392b' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Centre' : 'Add New Learning Centre'}
        subtitle="AMEB — Learning Centres Register"
        maxWidth="560px"
        footer={
          <>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#475569' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: '#0f6e56', color: '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Centre'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {formError && (
            <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {formError}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', paddingBottom: 2, borderBottom: '1px solid #e2eae6' }}>
            Centre Information
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Centre Name <span style={{ color: '#c0392b' }}>*</span></label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Yola Adult Literacy Centre" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>LGA <span style={{ color: '#c0392b' }}>*</span></label>
              <select value={formLga} onChange={e => setFormLga(e.target.value)} style={selectStyle}>
                <option value="">— Select LGA —</option>
                {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Ward</label>
              <input value={formWard} onChange={e => setFormWard(e.target.value)} placeholder="e.g. Doubeli Ward" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Community</label>
              <input value={formCommunity} onChange={e => setFormCommunity(e.target.value)} placeholder="e.g. Jambutu" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Centre Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} style={selectStyle}>
                <option value="">— Select Type —</option>
                {CENTRE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={selectStyle}>
                {CENTRE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Capacity (learners)</label>
              <input type="number" value={formCapacity} onChange={e => setFormCapacity(e.target.value)} placeholder="e.g. 50" style={inputStyle} min={0} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Phone Number</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="080XXXXXXXXX" style={inputStyle} />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', paddingBottom: 2, borderBottom: '1px solid #e2eae6', marginTop: 4 }}>
            Facilitator & Partner
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Assigned Facilitator</label>
              <input value={formFacilitator} onChange={e => setFormFacilitator(e.target.value)} placeholder="Facilitator name" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>NGO Partner</label>
              <input value={formNgo} onChange={e => setFormNgo(e.target.value)} placeholder="e.g. UNICEF, Save the Children" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Remarks</label>
            <textarea value={formRemarks} onChange={e => setFormRemarks(e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
          </div>
        </div>
      </Modal>

      {/* ── View Modal ── */}
      <Modal
        open={showView}
        onClose={() => { setShowView(false); setViewCentre(null); }}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            {viewCentre && (
              <>
                <button onClick={() => handlePrintSingle(viewCentre)} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#475569' }}>
                  🖨 Print
                </button>
                <button onClick={() => { setShowView(false); openEdit(viewCentre); }} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: '#0f6e56', color: '#fff' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => { setShowView(false); setShowDelete({ id: viewCentre.id, name: viewCentre.name }); }} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#c0392b', marginLeft: 'auto' }}>
                  🗑 Delete
                </button>
              </>
            )}
          </div>
        }
      >
        {viewCentre && (
          <div>
            {/* Header */}
            <div style={{ background: '#0f6e56', margin: '-16px -16px 16px', padding: '18px 20px', borderRadius: '12px 12px 0 0' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#e1f5ee', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                Adamawa State Mass Education Board
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{esc(viewCentre.name)}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>{esc(viewCentre.type || '—')}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg(viewCentre.status), color: statusColor(viewCentre.status) }}>
                  {esc(viewCentre.status || '—')}
                </span>
                <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  📍 {esc(viewCentre.lga || '—')}
                </span>
                {viewCentre.ngo_partner && (
                  <span style={{ background: 'rgba(225,245,238,.15)', color: '#e1f5ee', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    🤝 {esc(viewCentre.ngo_partner)}
                  </span>
                )}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                ['LGA', viewCentre.lga],
                ['Ward', viewCentre.ward],
                ['Community', viewCentre.community],
                ['Capacity', viewCentre.capacity != null ? String(viewCentre.capacity) : null],
                ['Facilitator', viewCentre.facilitator],
                ['Phone', viewCentre.phone],
                ['NGO Partner', viewCentre.ngo_partner],
                ['Status', viewCentre.status],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ padding: '9px 14px', borderBottom: '1px solid #e2eae6', borderRight: label === 'LGA' || label === 'Community' || label === 'Phone' || label === 'Status' ? '1px solid #e2eae6' : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{String(label)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#27313b', marginTop: 2 }}>{val ? esc(val) : '—'}</div>
                </div>
              ))}
            </div>

            {viewCentre.remarks && (
              <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '10px 14px', fontSize: 12, color: '#78350f', marginTop: 8, borderRadius: 6 }}>
                <strong>Remarks:</strong> {esc(viewCentre.remarks)}
              </div>
            )}

            <div style={{ padding: '7px 14px 0', fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2eae6', marginTop: 12, paddingTop: 8 }}>
              <span>AMEB — Learning Centres Register</span>
              <span>Viewed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation ── */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        maxWidth="420px"
        footer={
          <>
            <button onClick={() => setShowDelete(null)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #d3ded9', cursor: 'pointer', background: 'transparent', color: '#475569' }}>
              Cancel
            </button>
            <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#c0392b', color: '#fff' }}>
              Delete Centre
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            Delete "{showDelete?.name}"?
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            This will permanently remove the centre from the register.
          </div>
        </div>
      </Modal>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px',
  background: '#f7faf8', borderBottom: '1px solid #d3ded9', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, verticalAlign: 'middle',
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px 8px', borderRadius: 6, fontSize: 12,
  border: '1px solid #d3ded9', cursor: 'pointer',
  background: 'transparent', color: '#475569',
  width: 30, height: 28, lineHeight: 1,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
  appearance: 'none', paddingRight: 24,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
};
