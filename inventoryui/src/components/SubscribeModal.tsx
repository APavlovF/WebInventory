// src/components/SubscribeModal.tsx
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { c, alpha } from '../theme/themes';
import { useI18n } from '../i18n/useI18n';

interface PaddleEvent {
    name: string;
    data?: {
        customer?: {
            email?: string | null;
        };
    };
}

declare global {
    interface Window {
        Paddle?: {
            Environment: { set: (env: 'sandbox' | 'production') => void };
            Initialize: (opts: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
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
}

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN; // test_... or live_...
const PADDLE_PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID;         // pri_...

export default function SubscribeModal({ isOpen, onClose, supportEmail }: SubscribeModalProps) {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [completedEmail, setCompletedEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!window.Paddle) return;
        if (PADDLE_CLIENT_TOKEN?.startsWith('test_')) {
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
    }, [email]);

    if (!isOpen) return null;

    const handleOpenCheckout = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!window.Paddle) return;

        window.Paddle.Checkout.open({
            items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
            customer: { email: email.trim() },
            customData: { login: email.trim().toLowerCase() },
        });
    };

    const handleClose = () => {
        setEmail('');
        setCompletedEmail(null);
        onClose();
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
                    maxWidth: '420px',
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

                {/* Pricing & 14-Day Free Trial Box */}
                <div
                    style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: alpha('accent', 0.08),
                        border: `1px solid ${alpha('accent', 0.3)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: c.textStrong }}>
                            14 Days Free
                        </span>
                        <span style={{ fontSize: '13px', color: c.textMuted }}>
                            then $9.99 USD / month
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: c.textMuted }}>
                        Start today for <strong>$0.00</strong> with full access. After your 14-day free trial,
                        your subscription automatically continues at <strong>$9.99 USD/month</strong>. Cancel
                        anytime before the trial ends and you won’t be charged.
                    </p>
                </div>

                {completedEmail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: c.text }}>
                            Your 14-day free trial is active! We have sent an activation link and access token to{' '}
                            <strong>{completedEmail}</strong>. Please check your inbox (and spam folder) to set your password and sign in.
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
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleOpenCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', color: c.textMuted }}>
                                Email address (we’ll send your activation link here)
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

                        <button
                            type="submit"
                            style={{
                                padding: '12px 16px',
                                backgroundColor: c.accent,
                                color: c.onAccent,
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Start 14-Day Free Trial
                        </button>

                        <p style={{ margin: 0, fontSize: '11px', textAlign: 'center', color: c.textMuted }}>
                            Supports Credit/Debit Cards, PayPal, Apple Pay & Google Pay • Questions?{' '}
                            <a href={`mailto:${supportEmail}`} style={{ color: c.accent, textDecoration: 'none' }}>
                                {supportEmail}
                            </a>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}