import s from './Dashboard.module.css';

export default function OverviewPage() {
  const stats = [
    { label: 'Total CO₂ Captured', value: '1,245', unit: 'kg', icon: '🌍', trend: '+12% this month' },
    { label: 'Active Devices', value: '34', unit: 'units', icon: '💻', trend: 'All online' },
    { label: 'Avg Productivity', value: '1.82', unit: 'g/L/day', icon: '🌿', trend: 'Optimal' },
    { label: 'Energy Usage', value: '876', unit: 'kWh', icon: '⚡', trend: '-2% vs last week' },
  ];

  return (
    <div className={s.root}>
      <div className={s.welcome}>
        <h2>Welcome back, Admin 👋</h2>
        <p>Here is what is happening with your Carbelim devices today.</p>
      </div>

      <div className={s.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={s.statCard}>
            <div className={s.statIcon}>{stat.icon}</div>
            <div className={s.statInfo}>
              <div className={s.statLabel}>{stat.label}</div>
              <div className={s.statValue}>{stat.value} <span className={s.statUnit}>{stat.unit}</span></div>
              <div className={s.statTrend}>{stat.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={s.recentActivity}>
        <h3>Recent Activity</h3>
        <div className={s.activityCard}>
          <div className={s.activityItem}>
            <span className={s.activityTime}>10:42 AM</span>
            <span className={s.activityDesc}><strong>PRO15-Alpha</strong> successfully completed harvest cycle.</span>
          </div>
          <div className={s.activityItem}>
            <span className={s.activityTime}>09:15 AM</span>
            <span className={s.activityDesc}><strong>MiniForest-01</strong> firmware updated to v2.1.</span>
          </div>
          <div className={s.activityItem}>
            <span className={s.activityTime}>Yesterday</span>
            <span className={s.activityDesc}><strong>PRO15-Beta</strong> reported slight pH drift, automatically corrected.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
