// src/components/MainFrame.tsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapCanvas from '../features/map/MapCanvas';
import ScribeAdvisor from './ScribeAdvisor';
import LoginModal from './LoginModal';
import InventoryTable from '../reports/InventoryTable';
import ProductsTable from '../reports/ProductsTable';
import { useInventory } from '../features/workshop/UseInventory';

const EXPIRATION_TIME_MS = 5 * 60 * 1000;

type TabType = 'Overview' | 'Inventory' | 'Products';

// Building -> form tab (same order as the form files)
const buildingToTab: Record<string, TabType> = {
    Warehouse: 'Inventory',
    Workshop: 'Products',    
};

export default function MainFrame() {
    const [activeTab, setActiveTab] = useState<TabType>('Overview');
    const [viewportTitle, setViewportTitle] = useState<string>('Overview');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const isFormView = isAuthenticated && activeTab !== 'Overview';

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

    const { unitStocks, products, productStocks, isLoading, error } = useInventory(isAuthenticated);

    // Logged in + a form tab selected -> show the form, otherwise the map
    const renderViewport = () => {
        if (isAuthenticated) {
            switch (activeTab) {
                case 'Inventory': return <InventoryTable unitStocks={unitStocks} isLoading={isLoading} error={error} onClose={() => handleTabChange('Overview')} />;
                case 'Products': return <ProductsTable productStocks={productStocks} products={products} isLoading={isLoading} error={error} onClose={() => handleTabChange('Overview')} />;
            }
        }
        return <MapCanvas onBuildingClick={handleBuildingClick} isLoggedIn={isAuthenticated} />;
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
                        {!isAuthenticated && 'Simulated Viewport - '}{viewportTitle}
                    </h1>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 12px', borderRadius: '9999px', border: isAuthenticated ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)', color: isAuthenticated ? '#14b8a6' : '#f59e0b', backgroundColor: isAuthenticated ? 'rgba(20, 184, 166, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>
                        {isAuthenticated ? 'System Connected' : 'Guest Sandbox Mode (Read-Only)'}
                    </span>
                </header>

                <div style={{ position: 'relative', flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', backgroundColor: 'rgba(30, 41, 59, 0.2)' }}>
                    {renderViewport()}
                </div>

                { }
                {!isFormView && (
                    <div
                        onSubmit={(e) => {
                            e.preventDefault();
                            // Add your subscription logic here
                        }}
                        style={{
                            position: 'absolute',
                            bottom: '24px',
                            left: '24px',
                            zIndex: 20,
                            width: '300px',
                            padding: '16px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(15, 23, 42, 0.92)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #1e293b',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                                Like this inventory system?
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', color: '#94a3b8' }}>
                                Use this platform for your business or request a custom-built solution. Subscribe or reach out at{' '}
                                <a href="mailto:pavlovfontanka@gmail.com" style={{ color: '#14b8a6', textDecoration: 'none' }}>
                                    pavlovfontanka@gmail.com
                                </a>.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                alert(
                                    'Thank you for your interest!\n' +
                                    'The subscription system is not available yet.\n' +
                                    'If you need a custom inventory, automation, production, warehouse, or business management solution, please contact:\n' +
                                    'pavlovfontanka@gmail.com\n' +
                                    'Our team would be happy to discuss your requirements and build a solution tailored to your business.'
                                )
                            }
                            style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#14b8a6',
                                color: '#020617',
                                cursor: 'pointer',
                                alignSelf: 'center',
                            }}
                        >
                            Subscribe
                        </button>
                    </div>
                )}

                {!isFormView && (
                    <ScribeAdvisor message={isAuthenticated ? "All systems operational, milord." : "Sign in to manage our production, milord!"}
                        isDemoMode={!isAuthenticated} />
                )}
            </main>

            {showLoginModal && <LoginModal onSuccess={() => { setIsAuthenticated(true); setShowLoginModal(false); }} onClose={() => setShowLoginModal(false)} />}
        </div>
    );

}