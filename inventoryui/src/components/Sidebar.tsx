// src/components/Sidebar.tsx

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
            padding: '24px 16px 16px 16px', // Increased top padding since logo is gone
            boxSizing: 'border-box',
            zIndex: 10
        }}>
            <div>
                {/* BRANDING REMOVED AS REQUESTED */}

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {menuItems.map((item) => {
                        // "Overview" stays highlighted to act as our primary staging ground anchor
                        const isActive = item === 'Overview';

                        return (
                            <button
                                key={item}
                                type="button"
                                // REMOVED 'disabled' attribute so all buttons can be hovered and clicked natively
                                onClick={() => {
                                    // PASSIVE BEHAVIOR: Do nothing on click for demo simulation mode
                                    console.log(`Demo interaction: Clicked ${item} control knob.`);
                                }}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    // Brightened text for maximum visual visibility on dark backgrounds
                                    color: isActive ? '#14b8a6' : '#cbd5e1',
                                    backgroundColor: isActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                                    borderLeft: isActive ? '4px solid #14b8a6' : '4px solid transparent',
                                    transition: 'all 0.2s ease',
                                }}
                                // Inline CSS hover logic workaround for raw inline styles
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
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