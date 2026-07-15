'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './AdminLayout.module.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Overview', path: '/', icon: '📊' },
    { name: 'Devices', path: '/devices', icon: '💻' },
    { name: 'Calculator', path: '/calculator', icon: '🧮' },
    { name: 'Graphs', path: '/graphs', icon: '📈' },
    { name: 'Settings', path: '/settings', icon: '⚙️' }
  ];

  return (
    <div className={s.layout}>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.logoIcon}></div>
          <span className={s.brandText}>Carbelim Admin</span>
        </div>
        <nav className={s.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${s.navItem} ${pathname === item.path ? s.active : ''}`}
            >
              <span className={s.icon}>{item.icon}</span>
              <span className={s.name}>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className={s.userProfile}>
          <div className={s.avatar}>A</div>
          <div className={s.userInfo}>
            <div className={s.userName}>Admin User</div>
            <div className={s.userRole}>Superadmin</div>
          </div>
        </div>
      </aside>
      <main className={s.main}>
        <header className={s.topbar}>
          <h1 className={s.pageTitle}>{navItems.find(i => i.path === pathname)?.name || 'Dashboard'}</h1>
          <div className={s.topbarActions}>
            <button className={s.btn}>🔔</button>
            <button className={s.btn}>🔍</button>
          </div>
        </header>
        <div className={s.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
