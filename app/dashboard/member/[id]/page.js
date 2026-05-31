'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function MemberProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewModal, setRenewModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [renewForm, setRenewForm] = useState({ planName: '', durationUnit: 'months', durationValue: '', fee: '', startDate: new Date().toISOString().split('T')[0] });
  const [renewLoading, setRenewLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, planIndex: null, planName: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMember = async () => {
    const res = await fetch(`/api/members/${params.id}`);
    const data = await res.json();
    setMember(data.member);
    setLoading(false);
  };

  useEffect(() => {
    fetchMember();
    fetch('/api/analytics').then(r => r.json()).then(d => setPlans(d.plans || []));
  }, [params.id]);

  const handlePlanSelect = (e) => {
    const p = plans.find(pl => pl.name === e.target.value);
    if (p) setRenewForm(f => ({ ...f, planName: p.name, durationUnit: p.durationUnit || 'months', durationValue: p.durationValue ?? p.durationMonths, fee: p.fee }));
  };

  const handleRenew = async () => {
    if (!renewForm.planName) return;
    if (!window.confirm("Are you sure you want to renew this plan?")) return;
    setRenewLoading(true);
    const res = await fetch(`/api/members/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'renew', ...renewForm }),
    });
    setRenewLoading(false);
    if (res.ok) {
      setMessage('✅ Membership renewed successfully!');
      setRenewModal(false);
      fetchMember();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLeft = async () => {
    if (!confirm('Mark this member as "Left"?')) return;
    await fetch(`/api/members/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'left' }),
    });
    fetchMember();
  };

  const handleDeleteMembership = async () => {
    if (!deletePassword) { setDeleteError('Please enter password'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/members/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-membership', password: deletePassword, planIndex: deleteModal.planIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete');
        setDeleteLoading(false);
        return;
      }
      setMessage('✅ Membership deleted successfully!');
      setDeleteModal({ open: false, planIndex: null, planName: '' });
      setDeletePassword('');
      setDeleteLoading(false);
      fetchMember();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setDeleteError('Something went wrong');
      setDeleteLoading(false);
    }
  };

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

  if (loading) return <div className="loading"><div className="spinner" /> Loading profile...</div>;
  if (!member) return <div className="empty-state"><div className="empty-state-title">Member not found</div></div>;

  const daysLeft = member.daysLeft;
  const getStatusBadge = () => {
    if (member.status === 'active') return <span className="badge badge-active">● Active</span>;
    if (member.status === 'inactive') return <span className="badge badge-inactive">● Inactive</span>;
    return <span className="badge badge-expired">● Expired</span>;
  };

  const getDaysChip = () => {
    if (!daysLeft && daysLeft !== 0) return null;
    if (daysLeft < 0) return <span className="days-badge days-expired">Expired {Math.abs(daysLeft)}d ago</span>;
    if (daysLeft === 0) return <span className="days-badge days-critical">🚨 Expires TODAY</span>;
    if (daysLeft <= 7) return <span className="days-badge days-warning">⏳ {daysLeft} days left</span>;
    return <span className="days-badge days-ok">✓ {daysLeft} days left</span>;
  };

  // Sort plan history newest first
  const history = [...(member.planHistory || [])].reverse();

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 860 }}>
      <button className="back-btn" onClick={() => router.back()} style={{ marginBottom: 16 }}>← Back to Members</button>

      {message && <div className="alert alert-success">{message}</div>}

      {/* Renew modal */}
      {renewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">🔄 Renew Membership</h3>
            <p className="modal-subtitle">Renewing for <strong>{member.name}</strong></p>
            <div className="form-group">
              <label className="form-label">Select Plan</label>
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
              <button className="btn btn-secondary" onClick={() => setRenewModal(false)}>Cancel</button>
              <button className="btn btn-success" disabled={renewLoading || !renewForm.planName} onClick={handleRenew}>
                {renewLoading ? 'Renewing...' : '✅ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Membership Modal */}
      {deleteModal.open && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3 className="modal-title">🗑️ Delete Membership</h3>
<p className="modal-subtitle">
  You are about to permanently delete the plan <strong>&quot;{deleteModal.planName}&quot;</strong> from this member&#39;s history. This action cannot be undone.
</p>            {deleteError && <div className="alert alert-error">{deleteError}</div>}
            <div className="form-group">
              <label className="form-label">Enter Admin Password to confirm</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleDeleteMembership()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setDeleteModal({ open: false, planIndex: null, planName: '' }); setDeletePassword(''); setDeleteError(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={deleteLoading} onClick={handleDeleteMembership}>
                {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile hero */}
      <div className="profile-hero">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="profile-photo" style={{ width: 110, height: 110, objectFit: 'cover' }} />
        ) : (
          <div className="profile-photo">{member.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="profile-info">
          <div className="profile-serial">Member #{String(member.serialId).padStart(3, '0')} · Joined {new Date(member.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
          <div className="profile-name">{member.name}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {getStatusBadge()} {getDaysChip()}
          </div>
          <div className="profile-meta">
            <div className="profile-meta-item">👤 {member.age} yrs</div>
            <div className="profile-meta-item">{member.gender === 'Male' ? '♂' : member.gender === 'Female' ? '♀' : '⚧'} {member.gender}</div>
            <div className="profile-meta-item">📱 {member.mobile}</div>
          </div>
          {member.currentPlan && (
            <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(108,61,224,0.1)', border: '1px solid rgba(108,61,224,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Current Plan</span><br />
                <strong>{member.currentPlan.planName}</strong>
              </div>
              <div style={{ background: 'rgba(108,61,224,0.1)', border: '1px solid rgba(108,61,224,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Expires</span><br />
                <strong>{new Date(member.currentPlan.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div style={{ background: 'rgba(16,217,160,0.08)', border: '1px solid rgba(16,217,160,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Plan Fee</span><br />
                <strong style={{ color: 'var(--success)' }}>₹{member.currentPlan.fee?.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-success" onClick={() => setRenewModal(true)}>🔄 Renew Plan</button>
          {member.status !== 'inactive' && <button className="btn btn-danger btn-sm" onClick={handleLeft}>🚪 Mark Left</button>}
        </div>
      </div>

      {/* Plan History */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">📅 Plan History</div>
            <div className="table-subtitle">{history.length} plan{history.length !== 1 ? 's' : ''} total · lifetime revenue: <strong style={{ color: 'var(--success)' }}>₹{history.reduce((s, p) => s + (p.fee || 0), 0).toLocaleString('en-IN')}</strong></div>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}><div className="empty-state-title">No plan history</div></div>
          ) : (
            <div className="timeline">
              {history.map((p, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${i === 0 && member.status === 'active' ? 'current' : ''}`} />
                  <div className="timeline-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div className="timeline-plan-name">{p.planName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {i === 0 && member.status === 'active' && <span className="badge badge-active">● Current</span>}
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => {
                            // planHistory is reversed for display; convert back to original index
                            const originalIndex = history.length - 1 - i;
                            setDeleteModal({ open: true, planIndex: originalIndex, planName: p.planName });
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="timeline-dates">
                      <span>📅 Start: {new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>🏁 End: {new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>⏱ {p.durationValue ?? p.durationMonths} {p.durationUnit === 'days' ? 'day' : 'month'}{((p.durationUnit === 'days' ? p.durationValue : p.durationMonths) ?? p.durationValue) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="timeline-fee">₹{p.fee?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
