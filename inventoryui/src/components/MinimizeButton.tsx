// src/components/MinimizeButton.tsx
import { useState, type ReactNode } from 'react';
import { c, alpha } from '../theme/themes';

/** Small "−" button for the top-right corner of a floating card (the card must be position: absolute) */
export default function MinimizeButton({ onClick, title }: { onClick: () => void; title: string }) {
    const [hover, setHover] = useState(false);

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={(e) => {
                e.stopPropagation(); // do not trigger the card's own click (e.g. the advisor cycling messages)
                onClick();
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '22px',
                height: '22px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: `1px solid ${hover ? c.accent : c.border}`,
                background: alpha('bgSurface', 0.8),
                color: hover ? c.accent : c.textMuted,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '16px',
                lineHeight: 1,
                zIndex: 2,
            }}
        >
            −
        </button>
    );
}

/** Round button that brings a minimised card back. It sits in the corner the card was in. */
export function RestoreButton({
    side,
    title,
    onClick,
    children,
}: {
    side: 'left' | 'right';
    title: string;
    onClick: () => void;
    children: ReactNode;
}) {
    const [hover, setHover] = useState(false);

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'absolute',
                bottom: '24px',
                [side]: '24px',
                zIndex: side === 'right' ? 100 : 20,
                width: '44px',
                height: '44px',
                padding: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${hover ? c.accentBright : c.accent}`,
                background: c.bgApp,
                color: c.accent,
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: `0 6px 14px -4px ${alpha('overlay', 0.6)}`,
                transition: 'border-color 0.2s ease, transform 0.15s ease',
                transform: hover ? 'scale(1.08)' : 'scale(1)',
            }}
        >
            {children}
        </button>
    );
}
