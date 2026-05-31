'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/analytics', label: 'Analysis', icon: '💹' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔', badge: true },
  { href: '/dashboard/plans', label: 'Memberships', icon: '⚙️' },
];

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themePref, setThemePref] = useState('light');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Theme logic removed - forced to white theme

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setUnread(data.unreadCount || 0);
        }
      } catch {}
    };
    if (session) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 60000);
      return () => clearInterval(interval);
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40, borderWidth: 4 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading GymPro...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const initials = session.user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'G';

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏋️</div>
          <div className="sidebar-logo-text">GymPro</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ position: 'relative' }}>
          <div className="sidebar-user" onClick={() => setProfileOpen(!profileOpen)} style={{ cursor: 'pointer' }}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{session.user.name}</div>
              <div className="sidebar-user-gym">{session.user.gymName}</div>
            </div>
          </div>
          
          {profileOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100, animation: 'fadeUp 0.2s ease', marginBottom: '8px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>User Profile</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}><strong>Name:</strong> {session.user.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}><strong>Email:</strong> {session.user.email}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Gym:</strong> {session.user.gymName}</div>
            </div>
          )}

          <button
            className="btn btn-secondary btn-sm btn-full"
            style={{ marginTop: 8 }}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <header className="topbar">
          <button
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 22, cursor: 'pointer' }}
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="topbar-title">
            {NAV_ITEMS.find(n => pathname.startsWith(n.href) && n.href !== '/dashboard')?.label ||
             pathname === '/dashboard' ? (pathname === '/dashboard' ? 'Overview' : '') : ''}
            {pathname.includes('/member/') ? 'Member Profile' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }} className="hide-on-mobile">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            
            <Link href="/dashboard/notifications" className="btn btn-secondary btn-sm" style={{ position: 'relative', padding: '8px', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>

    </div>
  );
}
