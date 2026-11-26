// src/components/LegalModal.tsx
import { c, alpha } from '../theme/themes';
import { useI18n } from '../i18n/useI18n';
import { SUBSCRIPTION_PRICE } from './SubscribeModal';

export type LegalDocType = 'terms' | 'privacy' | 'refund';

interface LegalModalProps {
    docType: LegalDocType | null;
    onClose: () => void;
    supportEmail: string;
    companyName?: string;
}

export default function LegalModal({
    docType,
    onClose,
    supportEmail,
    companyName = 'PAVLOVIT (OLEKSANDR PAVLOV SITEMA DE COMPUTACAO)',
}: LegalModalProps) {
    const { t } = useI18n();

    if (!docType) return null;

    const titleKey =
        docType === 'terms'
            ? 'legal.termsTitle'
            : docType === 'privacy'
              ? 'legal.privacyTitle'
              : 'legal.refundTitle';

    const bodyKey =
        docType === 'terms'
            ? 'legal.termsBody'
            : docType === 'privacy'
              ? 'legal.privacyBody'
              : 'legal.refundBody';

    const formattedBody = t(bodyKey)
        .replace(/\{company\}/g, companyName)
        .replace(/\{email\}/g, supportEmail)
        .replace(/\{price\}/g, SUBSCRIPTION_PRICE);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                backgroundColor: alpha('overlay', 0.75),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '580px',
                    maxHeight: '80vh',
                    backgroundColor: c.bgApp,
                    border: `1px solid ${c.borderSubtle}`,
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    color: c.text,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c.borderSubtle}`, paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: c.textStrong }}>
                        {t(titleKey)}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: c.textMuted, fontSize: '18px', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        overflowY: 'auto',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: c.text,
                        whiteSpace: 'pre-line',
                        paddingRight: '6px',
                    }}
                >
                    {formattedBody}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${c.borderSubtle}`, paddingTop: '12px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 18px',
                            backgroundColor: c.accent,
                            color: c.onAccent,
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {t('sub.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
