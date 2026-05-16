import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { DASHBOARD_MODULES, EARNINGS } from '../data/modules.jsx';
import { api } from '../api.ts';

function statusClass(s) {
  if (s === 'Live' || s === 'live') return 'live';
  if (s === 'Manual Review' || s === 'pending_review') return 'review';
  if (s === 'AI Review' || s === 'sandbox_running' || s === 'pending_sandbox_test') return 'ai';
  return '';
}

// Backend status enum → human label for the status pill.
function statusLabel(s) {
  switch (s) {
    case 'live': return 'Live';
    case 'pending_review': return 'Manual Review';
    case 'sandbox_running':
    case 'pending_sandbox_test': return 'AI Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'sandbox_failed': return 'Sandbox Failed';
    case 'sandbox_passed': return 'Sandbox Passed';
    default: return s;
  }
}

const STATS_FALLBACK = [
  { l: 'Total Earnings', v: '$2,340' },
  { l: 'Live Modules', v: '3' },
  { l: 'Total Integrations', v: '142' },
  { l: 'In Review', v: '1' },
];

const ACTIVITY = [
  { i: 'check-circle', c: '#15803D', t: 'AuthForge integrated by Stitchroom', when: '2h ago' },
  { i: 'wallet',       c: '#15803D', t: '$45 royalty earned from NotifyStack', when: '8h ago' },
  { i: 'star',         c: '#F59E0B', t: 'New 5-star review on DataPour', when: '1d ago' },
  { i: 'inbox',        c: '#3730A3', t: 'Integration support request from Pearwell', when: '2d ago' },
];

export default function Dashboard({ go }) {
  // Try real /api/dashboard; if it 501s or errors, fall back to local mocks.
  const [dash, setDash] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getDashboard()
      .then((d) => { if (alive) setDash(d); })
      .catch(() => { /* stay on mocks */ });
    return () => { alive = false; };
  }, []);

  const stats = dash
    ? [
        { l: 'Total Earnings',     v: '$' + Math.round((dash.stats.totalEarnings || 0) / 100).toLocaleString() },
        { l: 'Live Modules',       v: String(dash.stats.liveModules ?? 0) },
        { l: 'Total Integrations', v: String(dash.stats.totalIntegrations ?? 0) },
        { l: 'In Review',          v: String(dash.stats.inReview ?? 0) },
      ]
    : STATS_FALLBACK;

  // Backend MonthlyEarning.amount assumed to be cents → display dollars.
  const earnings = dash?.earnings?.length
    ? dash.earnings.map((e) => ({ month: e.month, value: Math.round(e.amount / 100) }))
    : EARNINGS;

  const dashboardModules = dash?.modules?.length
    ? dash.modules.map((m) => ({
        name: m.name,
        status: statusLabel(m.status),
        earnings: Math.round((m.price || 0) / 100) * (m.integrationCount || 0),
        integrations: m.integrationCount || 0,
      }))
    : DASHBOARD_MODULES;

  const maxE = Math.max(...earnings.map((e) => e.value), 1);

  return (
    <main className="fade-in dash-shell">
      <div className="container">
        <div className="between" style={{ flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="v3-mono-label" style={{ color: 'var(--primary-700)' }}>Builder dashboard</div>
            <h2 style={{ marginTop: 14 }}>Welcome back, Priya.</h2>
            <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
              Last login 2 hours ago · Next payout in 12 days
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost"><Icon name="github" size={14} /> Connect another repo</button>
            <button className="btn btn-vermillion" onClick={() => go('submit')}>
              <Icon name="plus" size={14} /> Submit a build
            </button>
          </div>
        </div>

        <div className="stat-grid">
          {stats.map((s) => (
            <div className="stat" key={s.l}>
              <div className="stat-label v3-mono">{s.l}</div>
              <div className="stat-value">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="dash-row">
          <div className="card chart-card">
            <div className="between">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>
                  Earnings, last 6 months
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Across all live modules</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="pill">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--primary)', marginRight: 5 }} />{' '}
                  Total
                </span>
              </div>
            </div>
            <div className="bars">
              {earnings.map((e) => {
                const h = (e.value / maxE) * 100;
                return (
                  <div className="bar-col" key={e.month}>
                    <div className="bar primary" style={{ height: h + '%' }}>
                      <div className="bar-value">${e.value}</div>
                    </div>
                    <div className="bar-label">{e.month}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>This week</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
              Activity across your modules
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACTIVITY.map((a, i) => (
                <li key={i} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'var(--bg-soft)', display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Icon name={a.i} size={14} color={a.c} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{a.t}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.when}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="between" style={{ padding: '20px 24px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Your modules</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{dashboardModules.length} total</div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Earnings</th>
                <th style={{ textAlign: 'right' }}>Integrations</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dashboardModules.map((m) => (
                <tr key={m.name}>
                  <td><div style={{ fontWeight: 500 }}>{m.name}</div></td>
                  <td>
                    <span className={`v3-dash-table-status ${statusClass(m.status)}`}>
                      <span className="dot" /> {m.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {m.earnings ? '$' + m.earnings.toLocaleString() : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.integrations || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-link" style={{ fontSize: 13 }}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
