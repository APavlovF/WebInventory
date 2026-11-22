// src/components/Sidebar.tsx
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
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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

            <div style={{
                paddingTop: '16px',
                borderTop: `1px solid ${c.border}`,
                fontSize: '11px',
                lineHeight: '1.4',
                color: c.textMuted,
                textAlign: 'center',
                opacity: 0.85,
            }}>
                <div>{t('footer.copyright')}</div>
                <div>{t('footer.noCookies')}</div>
            </div>
        </aside>
    );
}
