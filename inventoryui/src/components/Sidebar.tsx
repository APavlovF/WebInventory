// src/components/Sidebar.tsx
import PreferencesBar from './PreferencesBar';
import { useI18n } from '../i18n/I18nContext';
import type { TKey } from '../i18n/en';
import { c, alpha } from '../theme/themes';

type TabType = 'Overview' | 'Inventory' | 'Products' | 'Production Map';

const menuLabelKey: Record<TabType, TKey> = {
    Overview: 'nav.overview',
    Inventory: 'nav.inventory',
    Products: 'nav.products',
    "Production Map": 'prodMap.title',
};

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    isAuthenticated: boolean;
    onLoginClick: () => void;
    onLogoutClick: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isAuthenticated, onLoginClick, onLogoutClick }: SidebarProps) {
    const { t } = useI18n();
    const menuItems: TabType[] = ['Overview', 'Inventory', 'Products', 'Production Map'];

    return (
        <aside style={{
            width: '240px',
            height: '100%',
            backgroundColor: c.bgSurface,
            borderRight: `1px solid ${c.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 16px 16px 16px',
            boxSizing: 'border-box',
            zIndex: 10
        }}>
            <div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {menuItems.map((item) => {
                        const isActive = item === activeTab;

                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setActiveTab(item)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isActive ? c.accent : c.textStrong,
                                    backgroundColor: isActive ? alpha('accent', 0.15) : 'transparent',
                                    borderLeft: isActive ? `4px solid ${c.accent}` : '4px solid transparent',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = alpha('border', 0.5);
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {t(menuLabelKey[item])}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div style={{ paddingTop: '16px', borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <PreferencesBar />
                {isAuthenticated ? (
                    <button onClick={onLogoutClick} style={{ width: '100%', padding: '10px', backgroundColor: alpha('danger', 0.2), color: c.danger, border: `1px solid ${alpha('danger', 0.4)}`, borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer' }}>
                        {t('sidebar.disconnect')}
                    </button>
                ) : (
                    <button onClick={onLoginClick} style={{ width: '100%', padding: '12px', backgroundColor: c.accent, color: c.onAccent, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', boxShadow: `0 4px 12px ${alpha('accent', 0.2)}` }}>
                        {t('sidebar.signIn')}
                    </button>
                )}
            </div>
        </aside>
    );
}
