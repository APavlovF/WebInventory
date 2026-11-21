// src/features/shared/SpinnerButton.tsx
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { c, alpha } from '../../theme/themes';

interface SpinnerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
    children: ReactNode;
}

export default function SpinnerButton({
    loading = false,
    loadingText,
    disabled,
    style,
    children,
    ...rest
}: SpinnerButtonProps) {
    const isDisabled = disabled || loading;

    const mergedStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...style,
    };

    return (
        <button {...rest} disabled={isDisabled} style={mergedStyle}>
            {loading && (
                <>
                    <style>{`
                        @keyframes btn-spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    <span
                        style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: `2px solid ${alpha('onAccent', 0.35)}`,
                            borderTopColor: c.onAccent,
                            animation: 'btn-spin 1.5s linear infinite',
                            flexShrink: 0,
                        }}
                    />
                </>
            )}
            <span>{loading && loadingText ? loadingText : children}</span>
        </button>
    );
}