'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Loading dashboard...</div>;

  const { stats = {}, totalRevenue = 0, gymName, ownerName } = data || {};

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,61,224,0.2), rgba(67,97,238,0.15))',
        border: '1px solid rgba(108,61,224,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.08 }}>🏋️</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{greeting},</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
          {ownerName || session?.user?.name} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{gymName || session?.user?.gymName} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <div className="stat-label">Total Members</div>
            <div className="stat-value">{stats.totalMembers || 0}</div>
            <div className="stat-sub">All time</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <div className="stat-label">Active Members</div>
            <div className="stat-value">{stats.activeMembers || 0}</div>
            <div className="stat-sub">Current plans</div>
          </div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">⚠️</div>
          <div className="stat-info">
            <div className="stat-label">Expiring Soon</div>
            <div className="stat-value">{stats.expiringSoon || 0}</div>
            <div className="stat-sub">Within 7 days</div>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">💤</div>
          <div className="stat-info">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{stats.inactiveMembers || 0}</div>
            <div className="stat-sub">Left or no plan</div>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan">💰</div>
          <div className="stat-info">
            <div className="stat-label">Active Revenue</div>
            <div className="stat-value">₹{totalRevenue?.toLocaleString('en-IN') || 0}</div>
            <div className="stat-sub">From active plans</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { href: '/dashboard/add-member', icon: '➕', label: 'Add New Member', color: 'var(--primary)', desc: 'Register a new gym member' },
          { href: '/dashboard/track', icon: '🎯', label: 'Track Memberships', color: 'var(--warning)', desc: 'View expiring memberships' },
          { href: '/dashboard/members', icon: '📋', label: 'View All Records', color: 'var(--success)', desc: 'Browse member database' },
          { href: '/dashboard/analytics', icon: '💹', label: 'Financial Report', color: 'var(--accent2)', desc: 'Revenue analytics' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transition: 'all 0.2s',
            textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Expiring Soon table */}
      {stats.expiringSoon > 0 && (
        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title">⚠️ Expiring This Week</div>
              <div className="table-subtitle">Members needing immediate attention</div>
            </div>
            <Link href="/dashboard/track" className="btn btn-warning btn-sm">View All →</Link>
          </div>
          <ExpiringWidget />
        </div>
      )}
    </div>
  );
}

function ExpiringWidget() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    fetch('/api/members?daysLeft=7')
      .then(r => r.json())
      .then(d => setMembers((d.members || []).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)).slice(0, 5)));
  }, []);

  if (!members.length) return <div className="empty-state" style={{ padding: '30px' }}><p>No members expiring in the next 7 days 🎉</p></div>;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Member</th><th>Plan</th><th>Expires</th><th>Status</th></tr></thead>
        <tbody>
          {members.map(m => {
            const dl = m.daysLeft;
            return (
              <tr key={m._id}>
                <td className="text-muted font-mono">#{m.serialId}</td>
                <td>
                  <div className="member-cell">
                    <div className="member-avatar">{m.name.charAt(0)}</div>
                    <div>
                      <Link href={`/dashboard/member/${m._id}`} className="member-name">{m.name}</Link>
                      <div className="member-id">{m.mobile}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{m.currentPlan?.planName}</td>
                <td style={{ fontSize: 13 }}>{m.currentPlan?.endDate ? new Date(m.currentPlan.endDate).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <span className={`days-badge ${dl === 0 ? 'days-critical' : dl <= 3 ? 'days-critical' : 'days-warning'}`}>
                    {dl === 0 ? '🔴 Today' : `⏳ ${dl}d left`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
