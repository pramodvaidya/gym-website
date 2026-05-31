"use client";
import { useState, useEffect } from 'react';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', durationValue: '', durationUnit: 'months', fee: '' });
  const [newPlan, setNewPlan] = useState({ name: '', durationValue: '', durationUnit: 'months', fee: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data.plans || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const DEFAULT_PLANS = [
    { name: '1 Month', durationUnit: 'months', durationValue: 1, fee: 800 },
    { name: '3 Month', durationUnit: 'months', durationValue: 3, fee: 2000 },
    { name: '6 Month', durationUnit: 'months', durationValue: 6, fee: 3500 },
    { name: '1 Year', durationUnit: 'months', durationValue: 12, fee: 6000 },
  ];

  const importDefaults = async () => {
    setSaving(true);
    try {
      for (const p of DEFAULT_PLANS) {
        const res = await fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        // ignore duplicates
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || ((prev)=>prev));
        }
      }
      showMsg('✅ Default plans imported');
    } catch (err) {
      showMsg('Failed to import defaults', true);
    } finally {
      setSaving(false);
    }
  };

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 3000);
  };

  const handleAdd = async () => {
    if (!newPlan.name || Number(newPlan.durationValue) < 1 || Number(newPlan.fee) < 0) {
      showMsg('Please fill all fields correctly', true); return;
    }
    setSaving(true);
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPlan,
        durationValue: Number(newPlan.durationValue),
        fee: Number(newPlan.fee),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showMsg(data.error || 'Failed to add plan', true); return; }
    setPlans(data.plans);
    setNewPlan({ name: '', durationValue: '', durationUnit: 'months', fee: '' });
    setAddOpen(false);
    showMsg('✅ Plan added successfully!');
  };

  const startEdit = (i) => {
    const plan = plans[i];
    setEditIdx(i);
    setEditForm({
      name: plan.name,
      durationUnit: plan.durationUnit || 'months',
      durationValue: plan.durationValue ?? plan.durationMonths ?? '',
      fee: plan.fee,
    });
  };

  const handleEdit = async () => {
    setSaving(true);
    const res = await fetch('/api/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index: editIdx,
        ...editForm,
        durationValue: Number(editForm.durationValue),
        fee: Number(editForm.fee),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showMsg(data.error || 'Failed to update plan', true); return; }
    setPlans(data.plans);
    setEditIdx(null);
    showMsg('✅ Plan updated!');
  };

  const handleDelete = async (i) => {
    if (!confirm(`Delete plan "${plans[i].name}"? This won't affect existing members.`)) return;
    setSaving(true);
    const res = await fetch('/api/plans', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: i }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showMsg(data.error || 'Failed to delete plan', true); return; }
    setPlans(data.plans);
    showMsg('🗑 Plan removed');
  };

  const durationLabel = (value, unit) => {
    if (!value) return '';
    if (unit === 'days') return value === 1 ? '1 Day' : `${value} Days`;
    return value === 1 ? '1 Month' : value === 12 ? '1 Year' : `${value} Months`;
  };
  const activePlanCount = plans.filter((plan) => (plan.activeMembers || 0) > 0).length;
  const activeMemberTotal = plans.reduce((sum, plan) => sum + (plan.activeMembers || 0), 0);

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏷️ Membership Plans</h1>
          <p className="page-subtitle">Manage the plans offered at your gym</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={importDefaults} disabled={saving}>⬇️ Import Defaults</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>➕ Add New Plan</button>
        </div>
      </div>

      {plans.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(38, 110, 247, 0.08)', border: '1px solid rgba(38, 110, 247, 0.18)', borderRadius: 999, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
            🔥 {activePlanCount} plan{activePlanCount !== 1 ? 's' : ''} currently in use
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.18)', borderRadius: 999, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
            👥 {activeMemberTotal} active member{activeMemberTotal !== 1 ? 's' : ''} on plans
          </div>
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Add Plan Modal */}
      {addOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">➕ Add New Plan</h3>
            <p className="modal-subtitle">Create a new membership plan for your gym</p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Plan Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. 3 Month, 7 Days, Annual"
                  value={newPlan.name}
                  onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration *</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 7"
                    min={1}
                    style={{ flex: 1, minWidth: 90 }}
                    value={newPlan.durationValue}
                    onChange={e => setNewPlan({ ...newPlan, durationValue: e.target.value })}
                  />
                  <select
                    className="form-input"
                    value={newPlan.durationUnit}
                    onChange={e => setNewPlan({ ...newPlan, durationUnit: e.target.value })}
                    style={{ width: 120 }}
                  >
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '2 / -1' }}>
                <label className="form-label">Fee (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 2000"
                  min={0}
                  value={newPlan.fee}
                  onChange={e => setNewPlan({ ...newPlan, fee: e.target.value })}
                />
              </div>
            </div>
            {newPlan.durationValue && newPlan.fee && (
              <div className="plan-preview" style={{ marginBottom: 16 }}>
                <div className="plan-preview-item">
                  <span className="plan-preview-label">Duration</span>
                  <span className="plan-preview-value">{durationLabel(Number(newPlan.durationValue), newPlan.durationUnit)}</span>
                </div>
                <div className="plan-preview-item">
                  <span className="plan-preview-label">Unit Cost</span>
                  <span className="plan-preview-value">₹{Math.round(newPlan.fee / Number(newPlan.durationValue))}/{newPlan.durationUnit === 'days' ? 'day' : 'month'}</span>
                </div>
                <div className="plan-preview-item">
                  <span className="plan-preview-label">Total Fee</span>
                  <span className="plan-preview-value" style={{ color: 'var(--success)' }}>₹{Number(newPlan.fee).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setAddOpen(false); setNewPlan({ name: '', durationValue: '', durationUnit: 'months', fee: '' }); }}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleAdd}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : '✅ Add Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editIdx !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">✏️ Edit Plan</h3>
            <p className="modal-subtitle">Updating <strong>{plans[editIdx]?.name}</strong></p>
            <div className="form-group">
              <label className="form-label">Plan Name</label>
              <input
                className="form-input"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    style={{ flex: 1, minWidth: 90 }}
                    value={editForm.durationValue}
                    onChange={e => setEditForm({ ...editForm, durationValue: e.target.value })}
                  />
                  <select
                    className="form-input"
                    value={editForm.durationUnit}
                    onChange={e => setEditForm({ ...editForm, durationUnit: e.target.value })}
                    style={{ width: 120 }}
                  >
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fee (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  value={editForm.fee}
                  onChange={e => setEditForm({ ...editForm, fee: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditIdx(null)}>Cancel</button>
              <button className="btn btn-success" disabled={saving} onClick={handleEdit}>
                {saving ? 'Saving...' : '✅ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="loading"><div className="spinner" /> Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏷️</div>
          <div className="empty-state-title">No plans yet</div>
          <div className="empty-state-text">Add your first membership plan to get started</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAddOpen(true)}>➕ Add First Plan</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map((plan, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,61,224,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Plan color accent */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, var(--primary), var(--accent2))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}>🏷️</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>⏱ {durationLabel(plan.durationValue ?? plan.durationMonths, plan.durationUnit)}</span>
                  <span>📅 {plan.durationValue ?? plan.durationMonths} {plan.durationUnit === 'days' ? 'day' : 'month'}{(plan.durationUnit === 'days' ? plan.durationValue : plan.durationMonths) !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ≈ ₹{Math.round(plan.fee / (plan.durationUnit === 'days' ? Math.max(1, plan.durationValue ?? 1) : (plan.durationValue ?? plan.durationMonths))).toLocaleString('en-IN')}/{plan.durationUnit === 'days' ? 'day' : 'month'}
                  </span>
                  <span style={{ color: plan.activeMembers > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    👥 {plan.activeMembers} active member{plan.activeMembers !== 1 ? 's' : ''}
                  </span>
                </div>
                {plan.activeMembers > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                    <span style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.18)', borderRadius: 999, padding: '4px 8px' }}>In use</span>
                    <span>{plan.activeMembers} member{plan.activeMembers !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--success)',
                }}>₹{plan.fee.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>total fee</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(i)}
                  title="Edit plan"
                >✏️ Edit</button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(i)}
                  title={plan.activeMembers > 0 ? 'Cannot delete while members are active on this plan' : 'Delete plan'}
                  disabled={plan.activeMembers > 0 || saving}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      {plans.length > 0 && (
        <div style={{ marginTop: 24, background: 'rgba(108,61,224,0.07)', border: '1px solid rgba(108,61,224,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            💡 <strong>Note:</strong> Editing a plan updates only future memberships. Existing members keep their current plan details, and a plan cannot be deleted while active members remain on it.
          </p>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
