// src/components/MainFrame.tsx
import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import MapCanvas from '../features/map/MapCanvas';
import ScribeAdvisor from './ScribeAdvisor';
import LoginModal from './LoginModal';
import InventoryTable from '../reports/InventoryTable';
import ProductsTable from '../reports/ProductsTable';
import { useInventory } from '../features/workshop/UseInventory';
import { InventoryContext } from '../data/InventoryContext';
import { useI18n } from '../i18n/useI18n';
import type { TKey } from '../i18n/en';
import { c, alpha } from '../theme/themes';
import { apiFetch } from '../api';
import MinimizeButton, { RestoreButton } from './MinimizeButton';
import { useHiddenPanel } from './useHiddenPanel';
import ProductionMapModal from '../features/warehouse/ProductionMapModal';
import PreferencesBar from './PreferencesBar';
import SubscribeModal from './SubscribeModal';
import LegalModal, { type LegalDocType } from './LegalModal';

const EXPIRATION_TIME_MS = 5 * 60 * 1000;
const SUPPORT_EMAIL = 'pavlovfontanka@gmail.com';
const DEFAULT_LOGO = './logo.png';
const MAX_LOGO_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

type TabType = 'Overview' | 'Inventory' | 'Products' | 'Production Map';

// Building -> screen (Office only have action buttons, no screen of their own)
const buildingToTab: Record<string, TabType> = {
    Warehouse: 'Inventory',
    Market: 'Products',
    Workshop: 'Production Map'
};

// The header title is stored as a translation key, so it follows the language switch
const tabTitleKey: Record<TabType, TKey> = {
    Overview: 'nav.overview',
    Inventory: 'nav.inventory',
    Products: 'nav.products',
    "Production Map": 'prodMap.title',
};

// A saved login that has not expired yet (checked once at start so the first screen is already right)
const hasValidSession = (): boolean => {
    const loginTime = localStorage.getItem('session_login_time');
    return (
        !!loginTime &&
        !!localStorage.getItem('authToken') &&
        new Date().getTime() - parseInt(loginTime, 10) <= EXPIRATION_TIME_MS
    );
};

export default function MainFrame() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<TabType>('Overview');
    const [viewportKey, setViewportKey] = useState<TKey>('nav.overview');
    // Signed in = real data from the database. Not signed in = demo mode (data kept in this browser tab only)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasValidSession);
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    
    const [inviteToken, setInviteToken] = useState<string | undefined>(undefined);
    const [showSubscribeModal, setShowSubscribeModal] = useState<boolean>(false);
    const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

    // Logo state & hidden file input ref
    const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
    const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isFormView = activeTab !== 'Overview';
    const [promoHidden, setPromoHidden] = useHiddenPanel('promo'); // the subscription card can be minimised

    // Load user's saved logo URL upon login
    const fetchUserLogo = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setLogoUrl(DEFAULT_LOGO);
            return;
        }

        try {
            const response = await apiFetch(`/api/logo/get`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLogoUrl(data.logoUrl || DEFAULT_LOGO);
            } else {
                setLogoUrl(DEFAULT_LOGO);
            }
        } catch {
            setLogoUrl(DEFAULT_LOGO);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("session_login_time");
        setIsAuthenticated(false);
        setLogoUrl(DEFAULT_LOGO);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('inviteToken');
        if (tokenFromUrl) {
            const timeoutId = window.setTimeout(() => {
                setInviteToken(tokenFromUrl);
                setShowLoginModal(true);
            }, 0);
            window.history.replaceState({}, '', window.location.pathname);
            return () => window.clearTimeout(timeoutId);
        }
    }, []);

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

    useEffect(() => {
        if (!isAuthenticated) return;

        let lastWrite = 0;

        // Refresh last-activity timestamp (throttled to at most once every 5s)
        const recordActivity = () => {
            const now = Date.now();
            if (now - lastWrite < 5000) return;
            if (!localStorage.getItem('authToken')) return;

            lastWrite = now;
            localStorage.setItem('session_login_time', now.toString());
        };

        const checkSessionExpiration = () => {
            const loginTime = localStorage.getItem('session_login_time');
            const token = localStorage.getItem('authToken');

            if (!token || !loginTime) {
                handleLogout();
                return;
            }

            if (Date.now() - parseInt(loginTime, 10) > EXPIRATION_TIME_MS) {
                handleLogout();
            }
        };

        // Stamp activity right away on mount/login, then listen for user input
        recordActivity();
        const events: (keyof WindowEventMap)[] = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
        ];
        events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

        const interval = setInterval(checkSessionExpiration, 10000);

        return () => {
            events.forEach((ev) => window.removeEventListener(ev, recordActivity));
            clearInterval(interval);
        };
    }, [isAuthenticated]);

    const handleLogoClick = () => {
        // The logo is stored on the server, which demo mode never talks to: explain instead of failing
        if (!isAuthenticated) {
            alert(t('logo.demoDisabled'));
            return;
        }
        fileInputRef.current?.click();
    };

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so re-selecting the same file still triggers onChange
        e.target.value = '';

        if (file.type !== 'image/png') {
            alert(t('logo.errorType'));
            return;
        }

        if (file.size > MAX_LOGO_SIZE_BYTES) {
            alert(t('logo.errorSize'));
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploadingLogo(true);
        try {
            const response = await apiFetch(`/api/logo/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(t('logo.errorUpload'));
            }

            const data = await response.json();
            setLogoUrl(data.logoUrl ? `${data.logoUrl}?t=${Date.now()}` : DEFAULT_LOGO);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('logo.errorUpload');
            alert(message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    // Updates both the active sidebar tab and the header title
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setViewportKey(tabTitleKey[tab]);
    };

    // A building with a screen opens it (same in demo mode and signed in)
    const handleBuildingClick = (buildingName: string) => {
        const tab = buildingToTab[buildingName];
        if (tab) handleTabChange(tab);
    };

    const inventory = useInventory(isAuthenticated);
    const { unitStocks, products, productStocks, isLoading, error } = inventory;

    // A screen tab is selected -> show it, otherwise the map
    const renderViewport = () => {
        switch (activeTab) {
            case 'Inventory': return <InventoryTable unitStocks={unitStocks} isLoading={isLoading} error={error} onClose={() => handleTabChange('Overview')} />;
            case 'Products': return <ProductsTable productStocks={productStocks} products={products} isLoading={isLoading} error={error} onClose={() => handleTabChange('Overview')} />;
            case 'Production Map': return <ProductionMapModal isOpen products={products} onClose={() => handleTabChange('Overview')} />;
            default: return <MapCanvas onBuildingClick={handleBuildingClick} />;
        }
    };

    // The promo text has an {email} placeholder, which is rendered as a mailto link
    const [promoBefore, promoAfter] = t('promo.text').split('{email}');

    const footerLinkStyle = {
        background: 'none',
        border: 'none',
        padding: 0,
        color: c.textMuted,
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'inherit',
    };

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
                />

                <main style={{
                    position: 'relative',
                    width: 'calc(100vw - 240px)',
                    height: '100%',
                    backgroundColor: c.bgMain,
                    padding: '20px 24px 12px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}>
                    {/* 3-column grid keeps the title truly centered horizontally above the canvas */}
                    <header style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px',
                        borderBottom: `1px solid ${c.borderSubtle}`,
                        paddingBottom: '12px'
                    }}>
                        {/* Upper-left corner: App Name + Logo + Connection status badge */}
                        <div style={{
                            justifySelf: 'start',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'nowrap',
                            gap: '10px',
                            minWidth: 0
                        }}>                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png"
                                onChange={handleLogoFileChange}
                                style={{ display: 'none' }}
                            />
                            <div
                                onClick={handleLogoClick}
                                title={isAuthenticated ? t('logo.uploadHover') : t('logo.demoDisabled')}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isUploadingLogo ? 0.5 : 1,
                                    transition: 'border-color 0.2s, transform 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.accent)}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.borderSubtle)}
                            >
                                <img
                                    src={logoUrl}
                                    alt={t('logo.alt')}
                                    onError={() => setLogoUrl(DEFAULT_LOGO)}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>

                            <span
                                title={isAuthenticated ? undefined : t('main.demoHint')}
                                style={{
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    border: `1px solid ${alpha(isAuthenticated ? 'accent' : 'warning', 0.4)}`,
                                    color: isAuthenticated ? c.accent : c.warning,
                                    backgroundColor: alpha(isAuthenticated ? 'accent' : 'warning', 0.05),
                                    cursor: isAuthenticated ? 'default' : 'help',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {isAuthenticated ? t('main.systemConnected') : t('main.demoMode')}
                            </span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: c.textStrong,
                                whiteSpace: 'nowrap',
                                letterSpacing: '-0.01em'
                            }}>
                                {t('app.name')}
                            </span>
                        </div>

                        {/* Horizontal center: Active Tab Title */}
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: c.textStrong,
                            margin: 0,
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        }}>
                            {t(viewportKey)}
                        </h1>

                        {/* Upper-right corner: Theme, Language & Session controls */}
                        <div style={{
                            justifySelf: 'end',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'nowrap',
                            gap: '12px'
                        }}>
                            <PreferencesBar />

                            <span style={{ width: '1px', height: '16px', backgroundColor: c.borderSubtle }} />

                            {isAuthenticated ? (
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title={t('header.signOut')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: `1px solid ${c.border}`,
                                        backgroundColor: 'transparent',
                                        color: c.textMuted,
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = c.textStrong;
                                        e.currentTarget.style.borderColor = c.textMuted;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = c.textMuted;
                                        e.currentTarget.style.borderColor = c.border;
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    <span>{t('header.signOut')}</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowLoginModal(true)}
                                    style={{
                                        padding: '6px 14px',
                                        backgroundColor: c.accent,
                                        color: c.onAccent,
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        fontFamily: 'monospace',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        boxShadow: `0 2px 8px ${alpha('accent', 0.2)}`
                                    }}
                                >
                                    {t('sidebar.signIn')}
                                </button>
                            )}
                        </div>

                    </header>


                    <div style={{ position: 'relative', flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${c.borderSubtle}`, backgroundColor: alpha('bgSurface', 0.2) }}>
                        {renderViewport()}

                        {/* Bottom-left promo card: inside viewport so it doesn't overlap the footer */}
                        {!isFormView && promoHidden && (
                            <RestoreButton side="left" title={t('panel.showSubscribe')} onClick={() => setPromoHidden(false)}>
                                ✉
                            </RestoreButton>
                        )}
                        {!isFormView && !promoHidden && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '16px',
                                    left: '16px',
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
                                <MinimizeButton title={t('panel.hide')} onClick={() => setPromoHidden(true)} />
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', paddingRight: '24px', fontSize: '14px', fontWeight: 600, color: c.text }}>
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
                                    onClick={() => setShowSubscribeModal(true)}
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
                                key={isAuthenticated ? t('advisor.connected') : t('advisor.guest')}
                                message={isAuthenticated ? t('advisor.connected') : t('advisor.guest')}
                                isDemoMode={!isAuthenticated}
                            />
                        )}
                    </div>

                    {/* MainFrame Footer: Visible directly on landing page for Paddle Domain Verification */}
                    <footer style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${c.borderSubtle}`,
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '11px',
                        color: c.textMuted
                    }}>
                        <div>
                            {t('footer.tagline')}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setActiveLegalDoc('terms')} style={footerLinkStyle}>
                                {t('legal.termsTitle')}
                            </button>
                            <span>•</span>
                            <button type="button" onClick={() => setActiveLegalDoc('privacy')} style={footerLinkStyle}>
                                {t('legal.privacyTitle')}
                            </button>
                            <span>•</span>
                            <button type="button" onClick={() => setActiveLegalDoc('refund')} style={footerLinkStyle}>
                                {t('legal.refundTitle')}
                            </button>
                            <span>•</span>
                            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: c.accent, textDecoration: 'none' }}>
                                {SUPPORT_EMAIL}
                            </a>
                        </div>
                    </footer>
                </main>

                {showLoginModal && <LoginModal
                    initialToken={inviteToken}
                    onSuccess={() => {
                        localStorage.setItem('session_login_time', Date.now().toString());
                        setIsAuthenticated(true);
                        setPromoHidden(true);
                        setInviteToken(undefined);
                        void fetchUserLogo();
                        setShowLoginModal(false);
                    }}
                    onClose={() => {
                        setInviteToken(undefined);
                        setShowLoginModal(false);
                    }}
                />}

                <SubscribeModal
                    isOpen={showSubscribeModal}
                    onClose={() => setShowSubscribeModal(false)}
                    supportEmail={SUPPORT_EMAIL}
                    onOpenLegal={(docType) => setActiveLegalDoc(docType)}
                />

                <LegalModal
                    docType={activeLegalDoc}
                    onClose={() => setActiveLegalDoc(null)}
                    supportEmail={SUPPORT_EMAIL}
                />
            </div>
        </InventoryContext.Provider>
    );
}
