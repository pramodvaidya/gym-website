'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AddMemberPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    name: '', age: '', gender: '', mobile: '',
    planName: '', durationUnit: 'months', durationValue: '', fee: '', startDate: new Date().toISOString().split('T')[0],
  });
  const [endDate, setEndDate] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  const fileRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => setPlans(d.plans || []));
  }, []);

  // Auto-calculate end date
  useEffect(() => {
    if (form.startDate && form.durationValue) {
      const start = new Date(form.startDate);
      const end = new Date(start);
      if (form.durationUnit === 'days') {
        end.setDate(end.getDate() + parseInt(form.durationValue));
      } else {
        end.setMonth(end.getMonth() + parseInt(form.durationValue));
      }
      setEndDate(end.toISOString().split('T')[0]);
    } else {
      setEndDate('');
    }
  }, [form.startDate, form.durationUnit, form.durationValue]);

  const handlePlanSelect = (e) => {
    const selected = plans.find(p => p.name === e.target.value);
    if (selected) {
      setForm(f => ({
        ...f,
        planName: selected.name,
        durationUnit: selected.durationUnit || 'months',
        durationValue: selected.durationValue ?? selected.durationMonths ?? '',
        fee: selected.fee,
      }));
    } else {
      setForm(f => ({ ...f, planName: '', durationUnit: 'months', durationValue: '', fee: '' }));
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
      setCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(canvas.toDataURL('image/jpeg'));
    }, 'image/jpeg');
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setCameraOpen(false);
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    const fd = new FormData();
    fd.append('photo', photoFile);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    return data.url || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name || !form.age || !form.gender || !form.mobile || !form.planName || !form.startDate) {
      setError('Please fill all required fields');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }
    setLoading(true);

    let photoUrl = null;
    if (photoFile) {
      photoUrl = await uploadPhoto();
    }

    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, photoUrl }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Failed to add member'); return; }

    setSuccess(`✅ Member added! Serial ID: #${data.member?.serialId}`);
    setTimeout(() => router.push('/dashboard/members'), 2000);
  };

  const selectedPlan = plans.find(p => p.name === form.planName);

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Member</h1>
          <p className="page-subtitle">Register a new gym member with their plan</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Camera modal */}
      {cameraOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">📸 Capture Photo</h3>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12, background: '#000', marginBottom: 12 }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={stopCamera}>Cancel</button>
              <button className="btn btn-primary" onClick={capturePhoto}>📷 Capture</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Photo */}
        <div className="form-section">
          <div className="form-section-title">📸 Profile Photo</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div
              className={`photo-upload-area ${photoPreview ? 'has-photo' : ''}`}
              style={{ width: 180 }}
              onClick={() => !photoPreview && fileRef.current.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="photo-preview" />
              ) : (
                <>
                  <div className="photo-upload-icon">🖼️</div>
                  <div className="photo-upload-text">Click to upload<br /><span style={{ fontSize: 11 }}>JPG, PNG, WebP</span></div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current.click()}>📁 Choose from Gallery</button>
              <button type="button" className="btn btn-secondary" onClick={openCamera}>📷 Open Camera</button>
              {photoPreview && <button type="button" className="btn btn-danger btn-sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>🗑 Remove</button>}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>

        {/* Personal Info */}
        <div className="form-section">
          <div className="form-section-title">👤 Personal Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input className="form-input" placeholder="10-digit mobile" value={form.mobile} maxLength={10} onChange={e => setForm({ ...form, mobile: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input type="number" className="form-input" placeholder="e.g. 25" min={5} max={100} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select className="form-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} required>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Membership Plan */}
        <div className="form-section">
          <div className="form-section-title">🏷️ Membership Plan</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Select Plan *</label>
              <select className="form-input" value={form.planName} onChange={handlePlanSelect} required>
                <option value="">Choose a plan</option>
                {plans.map(p => (
                  <option key={p.name} value={p.name}>{p.name} — ₹{p.fee}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date (Auto-calculated)</label>
              <input type="date" className="form-input" value={endDate} readOnly style={{ opacity: 0.7, cursor: 'default' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Plan Fee (₹)</label>
              <input type="number" className="form-input" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} placeholder="Auto-filled" />
            </div>
          </div>

          {/* Plan preview */}
          {selectedPlan && endDate && (
            <div className="plan-preview" style={{ marginTop: 16 }}>
              <div className="plan-preview-item">
                <span className="plan-preview-label">Plan</span>
                <span className="plan-preview-value">{form.planName}</span>
              </div>
              <div className="plan-preview-item">
                <span className="plan-preview-label">Duration</span>
                <span className="plan-preview-value">{form.durationValue} {form.durationUnit === 'days' ? `day${form.durationValue !== 1 ? 's' : ''}` : `month${form.durationValue !== 1 ? 's' : ''}`}</span>
              </div>
              <div className="plan-preview-item">
                <span className="plan-preview-label">Start</span>
                <span className="plan-preview-value" style={{ fontSize: 14 }}>{new Date(form.startDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>→</div>
              <div className="plan-preview-item">
                <span className="plan-preview-label">End</span>
                <span className="plan-preview-value" style={{ fontSize: 14 }}>{new Date(endDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="plan-preview-item" style={{ marginLeft: 'auto' }}>
                <span className="plan-preview-label">Fee</span>
                <span className="plan-preview-value">₹{form.fee?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Adding Member...</> : '✅ Add Member to Gym'}
          </button>
        </div>
      </form>
    </div>
  );
}
