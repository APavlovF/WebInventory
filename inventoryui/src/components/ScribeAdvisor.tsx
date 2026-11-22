// src/components/ScribeAdvisor.tsx
import { useI18n } from '../i18n/useI18n';
import { c, alpha } from '../theme/themes';
import MinimizeButton, { RestoreButton } from './MinimizeButton';
import { useHiddenPanel } from './useHiddenPanel';
import { useAdvisorAlert } from './useAdvisor';

// Injected at build time by vite.config.ts (git tag, commit or package.json version)
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

interface ScribeAdvisorProps {
    message: string;
    isDemoMode?: boolean; // no longer used: the advisor says the same thing in demo mode (kept so callers still compile)
}

export default function ScribeAdvisor({ message }: ScribeAdvisorProps) {
    const { t } = useI18n();
    const [hidden, setHidden] = useHiddenPanel('advisor'); // the advisor can be minimised  

    // A warning/error repeated from an open window (see useAdvisorMessage): it replaces the usual speech
    const notice = useAdvisorAlert();
    const noticeColor = notice ? (notice.kind === 'error' ? c.danger : notice.kind === 'warning' ? c.warning : c.info) : undefined;

    if (hidden) {
        return (
            <RestoreButton side="right" title={t('panel.showAdvisor')} onClick={() => setHidden(false)}>
                <img src="advisor-man.png" alt={t('advisor.alt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </RestoreButton>
        );
    }

    const displayedMessage = notice ? notice.text : message;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: c.bgApp,
                border: `1px solid ${notice ? noticeColor : c.borderSubtle}`,
                padding: '16px 20px',
                borderRadius: '12px',
                boxShadow: `0 20px 25px -5px ${alpha('overlay', 0.5)}`,
                width: '400px',
                maxWidth: 'calc(100% - 48px)',
                boxSizing: 'border-box',
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                cursor: 'default',
                userSelect: 'none',
                transition: 'border-color 0.2s ease'
            }}
        >
            <MinimizeButton title={t('panel.hide')} onClick={() => setHidden(true)} />

            {/* Text on the left */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p
                    aria-live="polite"
                    style={{ fontSize: '14px', color: noticeColor ?? c.text, fontWeight: '500', fontStyle: 'italic', margin: '4px 0 0 0', lineHeight: '1.4' }}
                >
                    {notice ? `⚠ ${displayedMessage}` : `"${displayedMessage}"`}
                </p>
            </div>

            {/* Portrait and version on the right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{
                    width: '112px',
                    height: '112px',
                    borderRadius: '50%',
                    border: `2px solid ${c.accent}`,
                    backgroundColor: c.bgSurface,
                    overflow: 'hidden'
                }}>
                    <img
                        src="advisor-man.png"
                        alt={t('advisor.alt')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                        }}
                    />
                </div>
                <span style={{ fontSize: '11px', color: c.textMuted }}>
                    {t('advisor.version', { version: APP_VERSION })}
                </span>
            </div>
        </div>
    );
}
