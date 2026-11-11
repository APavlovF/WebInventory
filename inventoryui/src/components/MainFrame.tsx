// src/components/MainFrame.tsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapCanvas from '../features/map/MapCanvas';
import Inventory from '../forms/inventory';
import Products from '../forms/products';
import Orders from '../forms/orders';
import Reports from '../forms/reports';
import ScribeAdvisor from './ScribeAdvisor';
import LoginModal from './LoginModal';

const EXPIRATION_TIME_MS = 5 * 60 * 1000;

type TabType = 'Overview' | 'Inventory' | 'Products' | 'Orders' | 'Reports';

// Building -> form tab (same order as the form files)
const buildingToTab: Record<string, TabType> = {
    Warehouse: 'Inventory',
    Workshop: 'Products',
    Market: 'Orders',
    Office: 'Reports',
};

export default function MainFrame() {
    const [activeTab, setActiveTab] = useState<TabType>('Overview');
    const [viewportTitle, setViewportTitle] = useState<string>('Overview');
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

    // Updates both the active sidebar tab and the header title
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setViewportTitle(tab);
    };

    // Logged in: building opens its form. Demo mode: only the header title changes.
    const handleBuildingClick = (buildingName: string) => {
        if (isAuthenticated) {
            handleTabChange(buildingToTab[buildingName]);
        } else {
            setViewportTitle(buildingName);
        }
    };

    // Logged in + a form tab selected -> show the form, otherwise the map
    const renderViewport = () => {
        if (isAuthenticated) {
            switch (activeTab) {
                case 'Inventory': return <Inventory />;
                case 'Products': return <Products />;
                case 'Orders': return <Orders />;
                case 'Reports': return <Reports />;
            }
        }
        return <MapCanvas onBuildingClick={handleBuildingClick} />;
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
            <Sidebar
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                isAuthenticated={isAuthenticated}
                onLoginClick={() => setShowLoginModal(true)}
                onLogoutClick={handleLogout}
            />

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
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                        Simulated Viewport - {viewportTitle}
                    </h1>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 12px', borderRadius: '9999px', border: isAuthenticated ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)', color: isAuthenticated ? '#14b8a6' : '#f59e0b', backgroundColor: isAuthenticated ? 'rgba(20, 184, 166, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>
                        {isAuthenticated ? 'System Connected' : 'Guest Sandbox Mode (Read-Only)'}
                    </span>
                </header>

                <div style={{ position: 'relative', flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', backgroundColor: 'rgba(30, 41, 59, 0.2)' }}>
                    {renderViewport()}
                </div>

                <ScribeAdvisor message={isAuthenticated ? "All systems operational, milord." : "Sign in to manage our production, milord!"}
                    isDemoMode={!isAuthenticated} />
            </main>

            {showLoginModal && <LoginModal onSuccess={() => { setIsAuthenticated(true); setShowLoginModal(false); }} onClose={() => setShowLoginModal(false)} />}
        </div>
    );
}