import React from 'react';
import { LogOut } from 'lucide-react';
import AttendanceBoard from './AttendanceBoard';
import type { UserRole } from '../types/userRole';

interface CrewDashboardProps {
  onLogout: () => void;
}

export default function CrewDashboard({ onLogout }: CrewDashboardProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--mera-bg)',
      display: 'grid',
      gridTemplateRows: 'auto minmax(0, 1fr)',
      overflow: 'hidden'
    }}>
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--mera-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--mera-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-mera-white.png" style={{ height: 28, objectFit: 'contain' }} alt="Mera" />
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Crew Dashboard</h1>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--mera-radius-md)',
            border: '1px solid var(--mera-error-border)',
            background: 'var(--mera-error-bg)',
            color: 'var(--mera-error)',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </header>

      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        <AttendanceBoard />
      </div>
    </div>
  );
}
