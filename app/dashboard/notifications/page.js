'use client';
import { useState, useEffect } from 'react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnread(data.unreadCount || 0);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const getIcon = (daysLeft) => {
    if (daysLeft === 0) return { icon: '🚨', cls: 'critical' };
    if (daysLeft <= 2) return { icon: '🔴', cls: 'critical' };
    if (daysLeft <= 4) return { icon: '🟡', cls: 'warning' };
    return { icon: '🔵', cls: 'info' };
  };

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const groupedByDays = notifications.reduce((acc, n) => {
    const dayKey = n.daysLeft;
    if (!acc[dayKey]) {
      acc[dayKey] = {
        daysLeft: dayKey,
        label:
          dayKey === 0
            ? 'Expires Today'
            : dayKey === 1
            ? 'Expires in 1 day'
            : `Expires in ${dayKey} days`,
        items: [],
      };
    }
    acc[dayKey].items.push(n);
    return acc;
  }, {});

  const sortedGroups = Object.values(groupedByDays).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 780 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">Daily membership expiry alerts</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>
            ✓ Mark all read ({unread})
          </button>
        )}
      </div>

      {/*  Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ label: 'Expires Today', color: 'var(--danger)', icon: '🚨' }, { label: '1-2 days', color: '#f43f5e', icon: '🔴' }, { label: '3-4 days', color: 'var(--warning)', icon: '🟡' }, { label: '5-7 days', color: 'var(--accent2)', icon: '🔵' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '5px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
            <span>{l.icon}</span> {l.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔕</div>
          <div className="empty-state-title">No Notifications Yet</div>
          <div className="empty-state-text">Alerts will appear here when members are within 7 days of expiry.<br />The daily cron job runs every morning.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sortedGroups.map((group) => (
            <div key={group.daysLeft} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-title)' }}>{group.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    {group.items.length} member{group.items.length !== 1 ? 's' : ''} expiring {group.daysLeft === 0 ? 'today' : `${group.daysLeft} day${group.daysLeft !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '8px 10px', borderRadius: '999px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--text-title)', fontSize: 13, fontWeight: 600 }}>{getIcon(group.daysLeft).icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{group.daysLeft === 0 ? 'Expires today' : `${group.daysLeft} day${group.daysLeft !== 1 ? 's' : ''} left`}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {group.items.map((n) => (
                  <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.8)', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-title)' }}>{n.memberName}</div>
                      {n.memberSerialId ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{n.memberSerialId}</div> : null}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'right' }}>
                      {n.daysLeft === 0 ? 'Today' : `${n.daysLeft} day${n.daysLeft !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: 32, background: 'rgba(108,61,224,0.07)', border: '1px solid rgba(108,61,224,0.2)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          💡 <strong>How alerts work:</strong> Every day at 8 AM, GymPro scans all active memberships. Any member with 7 or fewer days remaining is added here <em>and</em> an email alert is sent to your registered email. This continues daily until the plan expires or is renewed.
        </p>
      </div>
    </div>
  );
}
