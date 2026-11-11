// src/components/Sidebar.tsx
import React from 'react';

type TabType = 'Overview' | 'Inventory' | 'Products' | 'Orders' | 'Reports';

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    isAuthenticated: boolean;
    onLoginClick: () => void;
    onLogoutClick: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isAuthenticated, onLoginClick, onLogoutClick }: SidebarProps) {
    const menuItems: TabType[] = ['Overview', 'Inventory', 'Products', 'Orders', 'Reports'];

    return (
        <aside style={{
            width: '240px',
            height: '100%',
            backgroundColor: '#1e293b',
            borderRight: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
            boxSizing: 'border-box',
            zIndex: 10
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', marginBottom: '24px', borderBottom: '1px solid #334155' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: isAuthenticated ? '#14b8a6' : '#f59e0b' }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f8fafc', letterSpacing: '1px' }}>NEXUS_INV</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {menuItems.map((item) => {
                        const isDisabled = !isAuthenticated && item !== 'Overview';
                        const isActive = activeTab === item;
                        return (
                            <button
                                key={item}
                                disabled={isDisabled}
                                onClick={() => setActiveTab(item)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: 'none',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.3 : 1,
                                    backgroundColor: isActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                                    color: isActive ? '#14b8a6' : '#94a3b8',
                                    borderLeft: isActive ? '4px solid #14b8a6' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #334155' }}>
                {isAuthenticated ? (
                    <button onClick={onLogoutClick} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(225, 29, 72, 0.2)', color: '#fb7185', border: '1px solid rgba(225, 29, 72, 0.4)', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer' }}>
                        Disconnect Session
                    </button>
                ) : (
                    <button onClick={onLoginClick} style={{ width: '100%', padding: '12px', backgroundColor: '#14b8a6', color: '#0f172a', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)' }}>
                        Sign In / Authorize
                    </button>
                )}
            </div>
        </aside>
    );
}