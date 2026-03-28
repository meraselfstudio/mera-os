
import React, { useState } from 'react';
import type { UserRole } from '../types/userRole';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [role, setRole] = useState<UserRole | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mera-bg)' }}>
      <div style={{ background: 'var(--mera-surface)', borderRadius: 24, padding: 40, boxShadow: 'var(--mera-shadow-lg)', minWidth: 320, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 24 }}>Login</h1>
        <p style={{ color: 'var(--mera-text-secondary)', marginBottom: 24 }}>Pilih peran untuk masuk ke dashboard:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <button
            onClick={() => { setRole('owner'); onLogin('owner'); }}
            style={{
              padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 18,
              background: '#88D49E', color: '#0f1812', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(136,212,158,0.15)'
            }}
          >
            Masuk sebagai Owner
          </button>
          <button
            onClick={() => { setRole('crew'); onLogin('crew'); }}
            style={{
              padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 18,
              background: '#6A9AB0', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(106,154,176,0.15)'
            }}
          >
            Masuk sebagai Crew
          </button>
        </div>
      </div>
    </div>
  );
}
