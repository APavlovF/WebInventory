// src/components/MainFrame.tsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapCanvas from '../features/map/MapCanvas';
import ScribeAdvisor from './ScribeAdvisor';
import LoginModal from './LoginModal';
import InventoryTable from '../reports/InventoryTable';
import ProductsTable from '../reports/ProductsTable';
import { useInventory } from '../features/workshop/UseInventory';
import { InventoryContext } from '../data/InventoryContext';
import { useI18n } from '../i18n/I18nContext';
import type { TKey } from '../i18n/en';
import { c, alpha } from '../theme/themes';

const EXPIRATION_TIME_MS = 5 * 60 * 1000;
const SUPPORT_EMAIL = 'pavlovfontanka@gmail.com';

type TabType = 'Overview' | 'Inventory' | 'Products';

// Building -> form tab (same order as the form files)
const buildingToTab: Record<string, TabType> = {
    Warehouse: 'Inventory',
    Workshop: 'Products',
};

// The header title is stored as a translation key, so it follows the language switch
const tabTitleKey: Record<TabType, TKey> = {
    Overview: 'nav.overview',
    Inventory: 'nav.inventory',
    Products: 'nav.products',
};
const buildingTitleKey: Record<string, TKey> = {
    Warehouse: 'building.warehouse',
    Office: 'building.office',
    Workshop: 'building.workshop',
    Market: 'building.market',
};

export default function MainFrame() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<TabType>('Overview');
    const [viewportKey, setViewportKey] = useState<TKey>('nav.overview');
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
        setViewportKey(tabTitleKey[tab]);
    };

    // Logged in: building opens its form. Demo mode: only the header title changes.
    const handleBuildingClick = (buildingName: string) => {
        if (isAuthenticated) {
            handleTabChange(buildingToTab[buildingName]);
        } else {
            setViewportKey(buildingTitleKey[buildingName] ?? 'nav.overview');
        }
    };

    const inventory = useInventory(isAuthenticated);
    const { unitStocks, products, productStocks, isLoading, error } = inventory;

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

    // The promo text has an {email} placeholder, which is rendered as a mailto link
    const [promoBefore, promoAfter] = t('promo.text').split('{email}');

    return (
        <InventoryContext.Provider value={inventory}>
            <div style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                backgroundColor: c.bgApp,
                color: c.text,
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
                    backgroundColor: c.bgMain,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `1px solid ${c.borderSubtle}`, paddingBottom: '12px' }}>
                        <h1 style={{ fontSize: '20px', fontWeight: 600, color: c.textStrong, margin: 0 }}>
                            {!isAuthenticated && `${t('main.simulatedViewport')} - `}{t(viewportKey)}
                        </h1>
                        <span style={{
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            border: `1px solid ${alpha(isAuthenticated ? 'accent' : 'warning', 0.4)}`,
                            color: isAuthenticated ? c.accent : c.warning,
                            backgroundColor: alpha(isAuthenticated ? 'accent' : 'warning', 0.05)
                        }}>
                            {isAuthenticated ? t('main.systemConnected') : t('main.guestMode')}
                        </span>
                    </header>

                    <div style={{ position: 'relative', flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${c.borderSubtle}`, backgroundColor: alpha('bgSurface', 0.2) }}>
                        {renderViewport()}
                    </div>

                    {/* Bottom-left promo card: only on the map */}
                    {!isFormView && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '24px',
                                left: '24px',
                                zIndex: 20,
                                width: '300px',
                                padding: '16px',
                                borderRadius: '12px',
                                backgroundColor: alpha('bgApp', 0.92),
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${c.borderSubtle}`,
                                boxShadow: `0 10px 25px -5px ${alpha('overlay', 0.5)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}
                        >
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: c.text }}>
                                    {t('promo.title')}
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', color: c.textMuted }}>
                                    {promoBefore}
                                    <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: c.accent, textDecoration: 'none' }}>
                                        {SUPPORT_EMAIL}
                                    </a>
                                    {promoAfter}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => alert(t('promo.alert', { email: SUPPORT_EMAIL }))}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: c.accent,
                                    color: c.onAccent,
                                    cursor: 'pointer',
                                    alignSelf: 'center',
                                }}
                            >
                                {t('promo.subscribe')}
                            </button>
                        </div>
                    )}

                    {!isFormView && (
                        <ScribeAdvisor
                            message={isAuthenticated ? t('advisor.connected') : t('advisor.guest')}
                            isDemoMode={!isAuthenticated}
                        />
                    )}
                </main>

                {showLoginModal && <LoginModal onSuccess={() => { setIsAuthenticated(true); setShowLoginModal(false); }} onClose={() => setShowLoginModal(false)} />}
            </div>
        </InventoryContext.Provider>
    );
}
