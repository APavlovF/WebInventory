import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { c, alpha } from '../theme/themes';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SUPPORTED_LANGS = ['en', 'pt', 'es', 'ru'] as const;
type GuideLang = (typeof SUPPORTED_LANGS)[number];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    const i18n = useI18n() as ReturnType<typeof useI18n> & { lang?: string; language?: string; locale?: string };
    const { t } = i18n;
    const rawLang = (i18n.lang || i18n.language || i18n.locale || 'en').slice(0, 2).toLowerCase();
    const activeLang: GuideLang = SUPPORTED_LANGS.includes(rawLang as GuideLang)
        ? (rawLang as GuideLang)
        : 'en';    

    const [result, setResult] = useState<{
        key: string;
        content: string;
        error: boolean;
    }>({ key: '', content: '', error: false });

    const currentKey = `${isOpen}:${activeLang}`;
    const isLoading = isOpen && result.key !== currentKey;
    const content = result.key === currentKey ? result.content : '';
    const error = result.key === currentKey && result.error;

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;

        const base = import.meta.env.BASE_URL.endsWith('/')
            ? import.meta.env.BASE_URL
            : `${import.meta.env.BASE_URL}/`;

        fetch(`${base}guides/guide_${activeLang}.txt`)
            .then(async (res) => {
                const text = await res.text();
                if (!res.ok || text.trimStart().startsWith('<')) {
                    throw new Error('Failed to load guide');
                }
                return text;
            })
            .then((text) => {
                if (!isCancelled) {
                    setResult({ key: currentKey, content: text, error: false });
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setResult({ key: currentKey, content: '', error: true });
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, activeLang, currentKey]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const renderFormattedGuide = (rawText: string) => {
        const lines = rawText.split(/\r?\n/);
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return <div key={idx} style={{ height: '8px' }} />;
            }
            if (trimmed.startsWith('===') || trimmed.startsWith('---')) {
                return (
                    <hr
                        key={idx}
                        style={{
                            border: 'none',
                            borderTop: `1px solid ${c.borderSubtle}`,
                            margin: '12px 0',
                        }}
                    />
                );
            }
            // Section headers (e.g., PHASE 1: ... or all-caps lines)
            if (/^(PHASE|FASE|ЭТАП)\s+\d+/i.test(trimmed) || trimmed === trimmed.toUpperCase()) {
                return (
                    <h3
                        key={idx}
                        style={{
                            margin: '14px 0 6px 0',
                            fontSize: '13px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            color: c.accent,
                        }}
                    >
                        {trimmed}
                    </h3>
                );
            }
            // Numbered or bulleted items
            if (/^(\d+\.|[-•*])\s+/.test(trimmed)) {
                return (
                    <div
                        key={idx}
                        style={{
                            paddingLeft: '8px',
                            marginBottom: '4px',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            color: c.textStrong,
                            fontWeight: 600,
                        }}
                    >
                        {trimmed}
                    </div>
                );
            }
            return (
                <p
                    key={idx}
                    style={{
                        margin: '0 0 6px 16px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: c.textMuted,
                    }}
                >
                    {trimmed}
                </p>
            );
        });
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                backgroundColor: alpha('overlay', 0.65),
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '580px',
                    maxHeight: '82vh',
                    backgroundColor: c.bgSurface,
                    border: `1px solid ${c.border}`,
                    borderRadius: '12px',
                    boxShadow: `0 20px 40px ${alpha('overlay', 0.6)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: `1px solid ${c.borderSubtle}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: alpha('accent', 0.15),
                                color: c.accent,
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                            }}
                        >
                            ?
                        </span>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: 600,
                                color: c.textStrong,
                            }}
                        >
                            {t('header.getStarted')}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: c.textMuted,
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div
                    style={{
                        padding: '18px 22px',
                        overflowY: 'auto',
                        flex: 1,
                    }}
                >
                    {isLoading && (
                        <div style={{ color: c.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                            Loading...
                        </div>
                    )}

                    {error && (
                        <div style={{ color: c.warning, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                            Could not load quick-start guide (`/guides/guide_{activeLang}.txt`).
                        </div>
                    )}

                    {!isLoading && !error && renderFormattedGuide(content)}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: `1px solid ${c.borderSubtle}`,
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '7px 16px',
                            backgroundColor: c.accent,
                            color: c.onAccent,
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
