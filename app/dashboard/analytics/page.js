'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6c3de0', '#4361ee', '#4cc9f0', '#10d9a0', '#fbbf24', '#f43f5e', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent2)' }}>₹{payload[0].value?.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Loading analytics...</div>;

  const { totalRevenue = 0, planBreakdown = {}, genderBreakdown = {}, ageBreakdown = {}, monthlyRevenue = [], stats = {}, gymName } = data || {};

  const genderData = Object.entries(genderBreakdown).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  const ageData = Object.entries(ageBreakdown).map(([name, value]) => ({ name, value }));

  const pieData = Object.entries(planBreakdown).map(([name, val]) => ({ name, value: val.count, revenue: val.revenue }));
  const maxRevenue = Math.max(...Object.values(planBreakdown).map(v => v.revenue), 1);

  const formatMonth = (m) => {
    const [y, mo] = m.split('-');
    return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">💹 Financial Analytics</h1>
          <p className="page-subtitle">{gymName} — Revenue Overview</p>
        </div>
      </div>

      {/* Revenue header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,61,224,0.2), rgba(67,97,238,0.15))',
        border: '1px solid rgba(108,61,224,0.3)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ font: '11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Total Active Revenue</p>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #fff, var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ₹{totalRevenue?.toLocaleString('en-IN')}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>From {stats.activeMembers || 0} currently active members</p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Active Members', val: stats.activeMembers || 0, color: 'var(--success)' },
            { label: 'Expiring ≤7d', val: stats.expiringSoon || 0, color: 'var(--warning)' },
            { label: 'Total Ever', val: stats.totalMembers || 0, color: 'var(--accent2)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-grid">
        {/* Monthly Revenue Chart */}
        <div className="chart-card">
          <div className="chart-card-title">📅 Monthly Revenue (Last 12 Months)</div>
          {monthlyRevenue.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No data yet</div>
              <div className="empty-state-text">Revenue appears after members are added</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRevenue.map(m => ({ ...m, month: formatMonth(m.month) }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,61,224,0.08)' }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c3de0" />
                    <stop offset="100%" stopColor="#4361ee" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan Breakdown */}
        <div className="chart-card">
          <div className="chart-card-title">🏷️ Revenue by Plan</div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-title">No active plans</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val, name, props) => [`${val} members — ₹${props.payload.revenue?.toLocaleString('en-IN')}`, name]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="plan-breakdown-list" style={{ marginTop: 12 }}>
                {Object.entries(planBreakdown).map(([name, val], i) => (
                  <div key={name} className="plan-breakdown-item">
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <div className="plan-breakdown-name">{name}</div>
                    <div className="plan-bar-wrap">
                      <div className="plan-bar" style={{ width: `${(val.revenue / maxRevenue) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <div className="plan-breakdown-val">₹{val.revenue?.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30 }}>{val.count}×</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Gender Breakdown */}
        <div className="chart-card">
          <div className="chart-card-title">🚻 Gender Demographics</div>
          {genderData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No gender data</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {genderData.map((entry, i) => <Cell key={i} fill={entry.name === 'Male' ? '#4361ee' : entry.name === 'Female' ? '#f43f5e' : '#10d9a0'} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} members`, name]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Age Group Breakdown */}
        <div className="chart-card">
          <div className="chart-card-title">🎂 Age Demographics</div>
          {ageData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No age data</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(val) => [`${val} members`, 'Count']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} cursor={{ fill: 'rgba(16,217,160,0.08)' }} />
                <Bar dataKey="value" fill="#10d9a0" radius={[0, 6, 6, 0]} barSize={28}>
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#ageGrad)`} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="ageGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10d9a0" />
                    <stop offset="100%" stopColor="#4cc9f0" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
