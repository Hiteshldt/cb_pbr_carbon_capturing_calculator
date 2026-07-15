import s from './Settings.module.css';

export default function SettingsPage() {
  return (
    <div className={s.root}>
      <h2>Admin Settings</h2>
      <div className={s.settingsCard}>
        
        <div className={s.settingGroup}>
          <div className={s.settingInfo}>
            <h4>Global Default Productivity (k)</h4>
            <p>Baseline factor for OD conversion</p>
          </div>
          <div className={s.settingControl}>
            <input type="text" defaultValue="0.60" className={s.input} />
          </div>
        </div>

        <div className={s.settingGroup}>
          <div className={s.settingInfo}>
            <h4>Notification Alerts</h4>
            <p>Send email when a device goes offline</p>
          </div>
          <div className={s.settingControl}>
            <label className={s.switch}>
              <input type="checkbox" defaultChecked />
              <span className={s.slider}></span>
            </label>
          </div>
        </div>

        <div className={s.settingGroup}>
          <div className={s.settingInfo}>
            <h4>API Access Token</h4>
            <p>Used for remote device management</p>
          </div>
          <div className={s.settingControl}>
            <button className={s.btnSecondary}>Regenerate Token</button>
          </div>
        </div>

        <div className={s.formActions}>
          <button className={s.btnPrimary}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
