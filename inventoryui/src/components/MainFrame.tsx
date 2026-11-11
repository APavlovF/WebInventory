// src/components/MainFrame.tsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapCanvas from '../features/map/MapCanvas';
import ScribeAdvisor from './ScribeAdvisor';
import LoginModal from './LoginModal';

const EXPIRATION_TIME_MS = 5 * 60 * 1000;

export default function MainFrame() {
    const [activeTab, setActiveTab] = useState<'Overview' | 'Inventory' | 'Products' | 'Orders' | 'Reports'>('Overview');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

    useEffect(() => {
        const checkSessionExpiration = () => {
            const loginTime = localStorage.getItem("session_login_time");
            if (loginTime) {
                const now = new Date().getTime();
                if (now - parseInt(loginTime, 10) > EXPIRATION_TIME_MS) {
                    handleLogout();
                } else {
                    setIsAuthenticated(true);
                }
            }
        };
        checkSessionExpiration();
        const interval = setInterval(checkSessionExpiration, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("session_login_time");
        setIsAuthenticated(false);
    };

    const handleBuildingClick = (buildingName: string) => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        alert(`Authorized Access: Loading data forms for ${buildingName}`);
    };

    return (
        <div style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'sans-serif',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
        }}>
            {/* Fixed Sidebar container at exactly 240px */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAuthenticated={isAuthenticated} onLoginClick={() => setShowLoginModal(true)} onLogoutClick={handleLogout} />

            {/* Main content field dynamically calculated to take up remaining viewport space */}
            <main style={{
                position: 'relative',
                width: 'calc(100vw - 240px)',
                height: '100%',
                backgroundColor: '#020617',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Simulated Viewport - {activeTab}</h1>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 12px', borderRadius: '9999px', border: isAuthenticated ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)', color: isAuthenticated ? '#14b8a6' : '#f59e0b', backgroundColor: isAuthenticated ? 'rgba(20, 184, 166, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>
                        {isAuthenticated ? 'System Connected' : 'Guest Sandbox Mode (Read-Only)'}
                    </span>
                </header>

                {/* Viewport content block maps perfectly over dimensions */}
                <div style={{ position: 'relative', flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', backgroundColor: 'rgba(30, 41, 59, 0.2)' }}>
                    <MapCanvas onBuildingClick={handleBuildingClick} />
                </div>

                <ScribeAdvisor message={isAuthenticated ? "All systems operational, milord." : "Sign in to manage our production, milord!"} />
            </main>

            {showLoginModal && <LoginModal onSuccess={() => { setIsAuthenticated(true); setShowLoginModal(false); }} onClose={() => setShowLoginModal(false)} />}
        </div>
    );
}