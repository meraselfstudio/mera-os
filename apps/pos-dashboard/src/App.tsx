import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import POSBoard from './components/POSBoard';
import CrewDashboard from './components/CrewDashboard';
import KioskView from './components/KioskView';
import TvDashboard from './components/TvDashboard';
import BackofficeIsland from './components/BackofficeIsland';
import Login from './components/Login';
import type { UserRole } from './types/userRole';

export default function App() {
    const [role, setRole] = useState<UserRole | null>(null);
    
    const handleLogout = () => setRole(null);
    
    if (!role) return <Login onLogin={setRole} />;
    
    // Crew users get a simplified dashboard
    if (role === 'crew') {
        return <CrewDashboard onLogout={handleLogout} />;
    }
    
    // Owner users get the full dashboard
    return (
        <Routes>
            <Route path="/" element={<POSBoard role={role} onLogout={handleLogout} />} />
            <Route path="/booking-management" element={<POSBoard role={role} onLogout={handleLogout} />} />
            <Route path="/backoffice" element={<BackofficeIsland role={role} onLogout={handleLogout} />} />
            <Route path="/kiosk" element={<KioskView />} />
            <Route path="/tv" element={<TvDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
