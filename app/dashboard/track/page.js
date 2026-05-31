'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TrackMembershipPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('');
  const [renewModal, setRenewModal] = useState(null);
  const [plans, setPlans] = useState([]);
  const [renewForm, setRenewForm] = useState({ planName: '', durationUnit: 'months', durationValue: '', fee: '', startDate: new Date().toISOString().split('T')[0] });
  const [renewLoading, setRenewLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    // Fetch active with <=7 days + all expired
    const [activeRes, expiredRes] = await Promise.all([
      fetch('/api/members?status=active'),
      fetch('/api/members?status=expired'),
    ]);
    const activeData = await activeRes.json();
    const expiredData = await expiredRes.json();

    const now = new Date();
    const active = (activeData.members || [])
      .filter(m => m.daysLeft !== null && m.daysLeft <= 7)
      .map(m => ({ ...m, _sortKey: m.daysLeft ?? 0 }));

    const expired = (expiredData.members || [])
      .map(m => {
        const dl = m.currentPlan?.endDate
          ? Math.ceil((new Date(m.currentPlan.endDate) - now) / (1000 * 60 * 60 * 24))
          : null;
        return { ...m, daysLeft: dl, _sortKey: dl ?? -9999 };
      });

    const combined = [...active, ...expired].sort((a, b) => a._sortKey - b._sortKey);
    setMembers(combined);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => setPlans(d.plans || []));
  }, []);

  const openRenew = (m) => {
    setRenewModal(m);
    setRenewForm({ planName: '', durationUnit: 'months', durationValue: '', fee: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const handlePlanSelect = (e) => {
    const p = plans.find(pl => pl.name === e.target.value);
    if (p) setRenewForm(f => ({ ...f, planName: p.name, durationUnit: p.durationUnit || 'months', durationValue: p.durationValue ?? p.durationMonths, fee: p.fee }));
  };

  const handleRenew = async () => {
    if (!renewForm.planName || !renewForm.startDate) return;
    if (!window.confirm("Are you sure you want to renew this plan?")) return;
    setRenewLoading(true);
    const res = await fetch(`/api/members/${renewModal._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'renew', ...renewForm }),
    });
    setRenewLoading(false);
    if (res.ok) {
      setMessage(`✅ ${renewModal.name} renewed successfully!`);
      setRenewModal(null);
      fetchMembers();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLeft = async (m) => {
    if (!confirm(`Mark ${m.name} as "Left"?`)) return;
    await fetch(`/api/members/${m._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'left' }),
    });
    fetchMembers();
  };

  const filtered = daysFilter
    ? members.filter(m => m.daysLeft !== null && m.daysLeft <= parseInt(daysFilter))
    : members;

  const getDaysBadge = (m) => {
    const dl = m.daysLeft;
    if (dl === null) return <span className="text-muted">—</span>;
    if (dl < 0) return <span className="days-badge days-expired">🔴 Expired {Math.abs(dl)}d ago</span>;
    if (dl === 0) return <span className="days-badge days-critical">🚨 Expires TODAY</span>;
    if (dl <= 3) return <span className="days-badge days-critical">⚠ {dl}d left</span>;
    return <span className="days-badge days-warning">⏳ {dl}d left</span>;
  };

  // Calculate end date for renew preview
  const renewEnd = renewForm.startDate && renewForm.durationValue
    ? (() => {
      const d = new Date(renewForm.startDate);
      if (renewForm.durationUnit === 'days') {
        d.setDate(d.getDate() + +renewForm.durationValue);
      } else {
        d.setMonth(d.getMonth() + +renewForm.durationValue);
      }
      return d.toLocaleDateString('en-IN');
    })()
    : '';

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎯 Track Membership</h1>
          <p className="page-subtitle">Members expiring within 7 days or already expired</p>
        </div>
        <div className="table-actions">
          <select className="filter-select" value={daysFilter} onChange={e => setDaysFilter(e.target.value)}>
            <option value="">All expiring</option>
            <option value="0">Expires today</option>
            <option value="1">≤ 1 day</option>
            <option value="3">≤ 3 days</option>
            <option value="7">≤ 7 days</option>
          </select>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {/* Renew modal */}
      {renewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">🔄 Renew Membership</h3>
            <p className="modal-subtitle">Renewing plan for <strong>{renewModal.name}</strong> (#{renewModal.serialId})</p>
            <div className="form-group">
              <label className="form-label">Select New Plan</label>
              <select className="form-input" value={renewForm.planName} onChange={handlePlanSelect}>
                <option value="">Choose plan</option>
                {plans.map(p => <option key={p.name} value={p.name}>{p.name} — ₹{p.fee}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={renewForm.startDate} onChange={e => setRenewForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            {renewEnd && (
              <div className="plan-preview" style={{ marginBottom: 16 }}>
                <div className="plan-preview-item">
                  <span className="plan-preview-label">Plan</span>
                  <span className="plan-preview-value" style={{ fontSize: 14 }}>{renewForm.planName}</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>→</div>
                <div className="plan-preview-item">
                  <span className="plan-preview-label">New End Date</span>
                  <span className="plan-preview-value" style={{ fontSize: 14 }}>{renewEnd}</span>
                </div>
                <div className="plan-preview-item" style={{ marginLeft: 'auto' }}>
                  <span className="plan-preview-label">Fee</span>
                  <span className="plan-preview-value">₹{renewForm.fee}</span>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setRenewModal(null)}>Cancel</button>
              <button className="btn btn-success" disabled={renewLoading || !renewForm.planName} onClick={handleRenew}>
                {renewLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Renewing...</> : '✅ Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">{filtered.length} member{filtered.length !== 1 ? 's' : ''} in alert zone</div>
            <div className="table-subtitle">Sorted by urgency — earliest expiring first</div>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Scanning memberships...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-title">All Clear!</div>
            <div className="empty-state-text">No memberships expiring in the selected window</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Member</th>
                  <th>Mobile</th>
                  <th>Age / Gender</th>
                  <th>Plan</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m._id}>
                    <td><span className="font-mono text-muted" style={{ fontSize: 12 }}>#{String(m.serialId).padStart(3, '0')}</span></td>
                    <td>
                      <div className="member-cell">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} className="member-avatar" />
                        ) : (
                          <div className="member-avatar">{m.name.charAt(0)}</div>
                        )}
                        <div>
                          <Link href={`/dashboard/member/${m._id}`} className="member-name">{m.name}</Link>
                          <div className="member-id">{m.status === 'expired' ? <span className="text-danger">Expired</span> : <span style={{ color: 'var(--warning)' }}>Expiring</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>📱 {m.mobile}</td>
                    <td style={{ fontSize: 13 }}>{m.age} / {m.gender?.charAt(0)}</td>
                    <td style={{ fontSize: 13 }}>{m.currentPlan?.planName || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.currentPlan?.startDate ? new Date(m.currentPlan.startDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.currentPlan?.endDate ? new Date(m.currentPlan.endDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{getDaysBadge(m)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => openRenew(m)}>🔄 Renew</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleLeft(m)}>🚪 Left</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
