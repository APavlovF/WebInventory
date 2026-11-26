// src/components/SubscribeModal.tsx
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { c, alpha } from '../theme/themes';
import { useI18n } from '../i18n/useI18n';
import type { LegalDocType } from './LegalModal';

export const SUBSCRIPTION_PRICE = '$9.99 USD';

interface PaddleEvent {
    name: string;
    data?: {
        customer?: {
            email?: string | null;
        };
    };
}

interface PaddlePricePreviewResult {
    data?: {
        currency_code?: string;
        details?: {
            line_items?: Array<{
                formatted_totals?: {
                    total?: string;
                    subtotal?: string;
                };
            }>;
        };
    };
}

declare global {
    interface Window {
        Paddle?: {
            Environment: { set: (env: 'sandbox' | 'production') => void };
            Initialize: (opts: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
            PricePreview?: (opts: {
                items: { priceId: string; quantity: number }[];
            }) => Promise<PaddlePricePreviewResult>;
            Checkout: {
                open: (opts: {
                    items: { priceId: string; quantity: number }[];
                    customer?: { email: string };
                    customData?: Record<string, string>;
                }) => void;
            };
        };
    }
}

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    supportEmail: string;
    onOpenLegal: (docType: LegalDocType) => void;
}

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
const PADDLE_PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID;

export default function SubscribeModal({ isOpen, onClose, supportEmail, onOpenLegal }: SubscribeModalProps) {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [completedEmail, setCompletedEmail] = useState<string | null>(null);
    const [localApproxPrice, setLocalApproxPrice] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !window.Paddle || !PADDLE_CLIENT_TOKEN) return;

        if (PADDLE_CLIENT_TOKEN.startsWith('test_')) {
            window.Paddle.Environment.set('sandbox');
        }
        window.Paddle.Initialize({
            token: PADDLE_CLIENT_TOKEN,
            eventCallback: (event) => {
                if (event.name === 'checkout.completed') {
                    const customerEmail = event.data?.customer?.email || email;
                    setCompletedEmail(customerEmail);
                }
            },
        });

        if (PADDLE_PRICE_ID && window.Paddle.PricePreview) {
            window.Paddle.PricePreview({
                items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
            })
                .then((res) => {
                    const currency = res?.data?.currency_code;
                    const item = res?.data?.details?.line_items?.[0];
                    const formatted = item?.formatted_totals?.total || item?.formatted_totals?.subtotal;
                    if (formatted && currency && currency !== 'USD') {
                        setLocalApproxPrice(`${formatted} (${currency})`);
                    }
                })
                .catch(() => {
                    // Fallback silently if PricePreview is unavailable
                });
        }
    }, [isOpen, email]);

    if (!isOpen) return null;

    const handleOpenCheckout = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!window.Paddle || !agreed) return;

        window.Paddle.Checkout.open({
            items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
            customer: { email: email.trim() },
            customData: { login: email.trim().toLowerCase() },
        });
    };

    const handleClose = () => {
        setEmail('');
        setAgreed(false);
        setCompletedEmail(null);
        onClose();
    };

    const linkButtonStyle = {
        background: 'none',
        border: 'none',
        padding: 0,
        color: c.accent,
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: 'inherit',
        fontFamily: 'inherit',
    };

    return (
        <div
            onClick={handleClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                backgroundColor: alpha('overlay', 0.65),
                backdropFilter: 'blur(4px)',
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
                    maxWidth: '440px',
                    backgroundColor: c.bgApp,
                    border: `1px solid ${c.borderSubtle}`,
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: `0 20px 40px -10px ${alpha('overlay', 0.7)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    color: c.text,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: c.textStrong }}>
                        {t('promo.title')}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{ background: 'transparent', border: 'none', color: c.textMuted, fontSize: '18px', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Product & Pricing Summary Box */}
                <div
                    style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: alpha('accent', 0.08),
                        border: `1px solid ${alpha('accent', 0.3)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '22px', fontWeight: 700, color: c.textStrong }}>
                            {t('sub.trialHeader')}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: c.accent }}>
                            {t('sub.priceAfter').replace('{price}', SUBSCRIPTION_PRICE)}
                        </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: c.text }}>
                        {t('sub.trialDesc').replace('{price}', SUBSCRIPTION_PRICE)}
                    </p>

                    <div
                        style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: alpha('bgApp', 0.65),
                            border: `1px solid ${alpha('accent', 0.25)}`,
                            fontSize: '12.5px',
                            lineHeight: '1.45',
                            color: c.textStrong,
                            fontWeight: 500,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                        }}
                    >
                        {localApproxPrice && (
                            <span style={{ fontWeight: 700, color: c.accent }}>
                                {t('sub.localApprox').replace('{localPrice}', localApproxPrice)}
                            </span>
                        )}
                        <span>{t('sub.localCurrencyNote')}</span>
                    </div>
                </div>

                {completedEmail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: c.text }}>
                            {t('sub.successMsg').replace('{email}', completedEmail)}
                        </p>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: c.accent,
                                color: c.onAccent,
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {t('sub.done')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleOpenCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', color: c.textMuted }}>
                                {t('sub.emailLabel')}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    border: `1px solid ${c.border}`,
                                    backgroundColor: c.bgMain,
                                    color: c.text,
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Mandatory Legal Agreement Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: c.textMuted, cursor: 'pointer', lineHeight: '1.4' }}>
                            <input
                                type="checkbox"
                                required
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                style={{ marginTop: '2px', cursor: 'pointer' }}
                            />
                            <span>
                                {t('sub.agreePrefix')}{' '}
                                <button type="button" onClick={() => onOpenLegal('terms')} style={linkButtonStyle}>
                                    {t('legal.termsTitle')}
                                </button>
                                ,{' '}
                                <button type="button" onClick={() => onOpenLegal('privacy')} style={linkButtonStyle}>
                                    {t('legal.privacyTitle')}
                                </button>
                                {' & '}
                                <button type="button" onClick={() => onOpenLegal('refund')} style={linkButtonStyle}>
                                    {t('legal.refundTitle')}
                                </button>
                                .
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={!agreed}
                            style={{
                                padding: '12px 16px',
                                backgroundColor: agreed ? c.accent : c.border,
                                color: agreed ? c.onAccent : c.textMuted,
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: agreed ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {t('sub.startBtn')}
                        </button>

                        {/* Merchant of Record & Support Footer */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', fontSize: '11px', color: c.textMuted }}>
                            <div>{t('sub.morNotice')}</div>
                            <div>
                                {t('sub.paymentMethods')} •{' '}
                                <a href={`mailto:${supportEmail}`} style={{ color: c.accent, textDecoration: 'none' }}>
                                    {supportEmail}
                                </a>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
