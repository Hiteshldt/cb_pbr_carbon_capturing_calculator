import s from './Devices.module.css';

export default function DevicesPage() {
  const devices = [
    { id: 'PRO15-Alpha', type: 'PRO15', location: 'Lab 1', status: 'Online', ip: '192.168.1.104', pass: 'Admin#Carb!24' },
    { id: 'PRO15-Beta', type: 'PRO15', location: 'Rooftop', status: 'Online', ip: '192.168.1.105', pass: 'Beta@PBR$99' },
    { id: 'MiniForest-01', type: 'Miniforest', location: 'Lobby', status: 'Online', ip: '192.168.1.112', pass: 'Mf01_Secure*' },
    { id: 'ParkBench-HQ', type: 'Park Bench', location: 'Courtyard', status: 'Offline', ip: '192.168.1.130', pass: 'PBhq_Outdoor26!' },
  ];

  return (
    <div className={s.root}>
      <div className={s.headerRow}>
        <h2>Managed Devices</h2>
        <button className={s.addBtn}>+ Add Device</button>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Model</th>
              <th>Location</th>
              <th>Status</th>
              <th>IP Address</th>
              <th>Admin Password</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td className={s.idCol}><strong>{d.id}</strong></td>
                <td>{d.type}</td>
                <td>{d.location}</td>
                <td>
                  <span className={`${s.badge} ${d.status === 'Online' ? s.on : s.off}`}>
                    {d.status}
                  </span>
                </td>
                <td className={s.mono}>{d.ip}</td>
                <td className={s.mono}>{d.pass}</td>
                <td>
                  <button className={s.actionBtn}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
