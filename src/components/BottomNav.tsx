import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const items: { to: string; label: string; icon: JSX.Element }[] = [
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
        <path
          d="M4 6h16M4 12h16M4 18h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    to: '/forest',
    label: 'Forest',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
        <path
          d="M12 3 L18 13 L15 13 L15 20 L9 20 L9 13 L6 13 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path
          d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' is-active' : ''}`}
        >
          {item.icon}
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
