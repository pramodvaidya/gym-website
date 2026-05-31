'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DEFAULT_PLANS = [
  { name: '1 Month', durationMonths: 1, fee: 800 },
  { name: '3 Month', durationMonths: 3, fee: 2000 },
  { name: '6 Month', durationMonths: 6, fee: 3500 },
  { name: '1 Year', durationMonths: 12, fee: 6000 },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', gymName: '', gymLocation: '' });
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [newPlan, setNewPlan] = useState({ name: '', durationMonths: '', fee: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addPlan = () => {
    if (!newPlan.name || !newPlan.durationMonths || !newPlan.fee) return;
    setPlans([...plans, { ...newPlan, durationMonths: +newPlan.durationMonths, fee: +newPlan.fee }]);
    setNewPlan({ name: '', durationMonths: '', fee: '' });
  };

  const removePlan = (i) => setPlans(plans.filter((_, idx) => idx !== i));

  const updatePlanFee = (i, fee) => {
    const updated = [...plans];
    updated[i] = { ...updated[i], fee: +fee };
    setPlans(updated);
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (plans.length === 0) { setError('Add at least one membership plan'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, gymName: form.gymName, gymLocation: form.gymLocation, plans }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
    router.push('/login?registered=1');
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🏋️</div>
          <div className="auth-logo-text">
            <h1>GymPro</h1>
            <p>Create your gym account</p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: step >= s ? 'linear-gradient(90deg,#6c3de0,#4361ee)' : 'var(--border)', transition: 'background 0.4s' }} />
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <h2 className="auth-title">Your Details</h2>
            <p className="auth-subtitle">Tell us about you and your gym</p>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Pramod Vaidya" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="owner@mygym.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-input" placeholder="Re-enter password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Gym Name</label>
              <input className="form-input" placeholder="Power Fitness Center" value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Gym Location (optional)</label>
              <input className="form-input" placeholder="City, State" value={form.gymLocation} onChange={(e) => setForm({ ...form, gymLocation: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => {
              if (!form.name || !form.email || !form.password || !form.gymName) { setError('Please fill all required fields'); return; }
              if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
              setError(''); setStep(2);
            }}>
              Next — Set Up Plans →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <h2 className="auth-title">Membership Plans</h2>
            <p className="auth-subtitle">Set the plans you offer at your gym (you can modify fees)</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {plans.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p.durationMonths}m)</span></span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>₹</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 90, padding: '6px 10px', fontSize: 13 }}
                    value={p.fee}
                    onChange={(e) => updatePlanFee(i, e.target.value)}
                  />
                  <button onClick={() => removePlan(i)} style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--danger)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 14, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-input)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Add custom plan</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: 2, minWidth: 100 }} placeholder="Plan name (e.g. 2 Year)" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
                <input type="number" className="form-input" style={{ flex: 1, minWidth: 70 }} placeholder="Months" value={newPlan.durationMonths} onChange={(e) => setNewPlan({ ...newPlan, durationMonths: e.target.value })} />
                <input type="number" className="form-input" style={{ flex: 1, minWidth: 80 }} placeholder="Fee ₹" value={newPlan.fee} onChange={(e) => setNewPlan({ ...newPlan, fee: e.target.value })} />
                <button className="btn btn-secondary btn-sm" onClick={addPlan}>+ Add</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-full btn-lg" disabled={loading} onClick={handleSubmit}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating Account...</> : '🎉 Create Account'}
              </button>
            </div>
          </div>
        )}

        <div className="auth-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
