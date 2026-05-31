'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [themePreference, setThemePreference] = useState('light');
  const [notificationTime, setNotificationTime] = useState('19:40');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/owner/settings');
        if (!res.ok) return;
        const data = await res.json();
        setThemePreference(data.themePreference || 'light');
        setNotificationTime(data.notificationTime || '19:40');
      } catch (err) {
        console.error(err);
      }
    };

    if (session) loadSettings();
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themePreference, notificationTime }),
      });
      if (!res.ok) {
        setMessage('Unable to save settings.');
      } else {
        setMessage('Settings saved successfully.');
        if (themePreference === 'light') {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      }
    } catch (err) {
      console.error(err);
      setMessage('Unable to save settings.');
    }

    setSaving(false);
  };

  if (status === 'loading' || !session) {
    return <div className="page-shell">Loading settings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-subtitle">Dashboard settings</p>
          <h1 className="page-title">Preferences</h1>
          <p className="page-subtitle">Set your dashboard theme and notification delivery time.</p>
        </div>
      </div>

      <div className="form-card" style={{ padding: '24px', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label">Theme</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${themePreference === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setThemePreference('light')}
            >
              🌞 Light
            </button>
            <button
              type="button"
              className={`btn ${themePreference === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setThemePreference('dark')}
            >
              🌙 Dark
            </button>
          </div>
          <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Choose the dashboard look you prefer.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notification time</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="time"
              className="form-input"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
          <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Notifications are generated on the first internal cron run after this time each day.
          </div>
        </div>

        {message && (
          <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
