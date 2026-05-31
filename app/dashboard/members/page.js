'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_TABS = ['All', 'Active', 'Inactive', 'Expired'];

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [plans, setPlans] = useState([]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTab !== 'All') params.set('status', activeTab.toLowerCase());
    if (planFilter) params.set('plan', planFilter);

    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);

    // Gather unique plans
    const uniquePlans = [...new Set((data.members || []).map(m => m.currentPlan?.planName).filter(Boolean))];
    setPlans(uniquePlans);
  }, [activeTab, planFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    String(m.serialId).includes(search) ||
    m.mobile?.includes(search)
  );

  const getStatusBadge = (m) => {
    if (m.status === 'active') return <span className="badge badge-active">● Active</span>;
    if (m.status === 'inactive') return <span className="badge badge-inactive">● Inactive</span>;
    if (m.status === 'expired') return <span className="badge badge-expired">● Expired {m.daysSinceExpired > 0 ? `(${m.daysSinceExpired}d ago)` : ''}</span>;
  };

  const getDaysLeft = (m) => {
    const dl = m.daysLeft;
    if (m.status !== 'active' || dl === null) return <span className="text-muted">—</span>;
    if (dl <= 0) return <span className="days-badge days-expired">Expired</span>;
    if (dl <= 3) return <span className="days-badge days-critical">⚠ {dl}d left</span>;
    if (dl <= 7) return <span className="days-badge days-warning">⏳ {dl}d left</span>;
    return <span className="days-badge days-ok">✓ {dl}d left</span>;
  };

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Records</h1>
          <p className="page-subtitle">Browse and manage all gym members</p>
        </div>
        <Link href="/dashboard/add-member" className="btn btn-primary">➕ Add Member</Link>
      </div>

      {/* Status tabs */}
      <div className="tabs">
        {STATUS_TABS.map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab} {tab !== 'All' && <span style={{ fontSize: 11, opacity: 0.7 }}>({members.filter(m => tab === 'All' ? true : m.status === tab.toLowerCase()).length})</span>}
          </button>
        ))}
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="table-actions">
            <input
              className="form-input"
              style={{ width: 200 }}
              placeholder="🔍 Search name, ID, mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
              <option value="">All Plans</option>
              {plans.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading members...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">No members found</div>
            <div className="empty-state-text">
              {search ? 'Try a different search term' : 'Add your first member to get started'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Member</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Plan</th>
                  <th>End Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
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
                          <div className="member-avatar">{m.name.charAt(0).toUpperCase()}</div>
                        )}
                        <div>
                          <div className="member-name" onClick={() => router.push(`/dashboard/member/${m._id}`)}>{m.name}</div>
                          <div className="member-id">📱 {m.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{m.gender}</td>
                    <td style={{ fontSize: 13 }}>{m.age}</td>
                    <td style={{ fontSize: 13 }}>{m.currentPlan?.planName || <span className="text-muted">—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {m.currentPlan?.endDate ? new Date(m.currentPlan.endDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>{getDaysLeft(m)}</td>
                    <td>{getStatusBadge(m)}</td>
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
