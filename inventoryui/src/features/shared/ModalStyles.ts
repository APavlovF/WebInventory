// src/features/shared/modalStyles.ts
// One set of styles for all four modals, so they always look the same.
import type { CSSProperties } from 'react';
import './modalForm.css';
import { c, alpha } from '../../theme/themes';

export const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: alpha('overlay', 0.7),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    fontFamily: 'monospace',
};

export const modalStyle: CSSProperties = {
    background: c.bgApp,
    border: `1px solid ${alpha('accent', 0.5)}`,
    borderRadius: '8px',
    padding: '24px',
    width: '580px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha('accent', 0.5)} ${c.bgApp}`, // dark theme scrollbar
    color: c.text,
    boxShadow: `0 10px 25px ${alpha('overlay', 0.6)}`,
};

// The list of rows scrolls when there are many; the header row is sticky inside it
export const scrollAreaStyle: CSSProperties = {
    maxHeight: '240px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha('accent', 0.5)} ${c.bgApp}`, // dark theme scrollbar
    scrollbarGutter: 'stable',
};

export const rowStyle = (isHeader: boolean): CSSProperties => ({
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    ...(isHeader && {
        position: 'sticky',
        top: 0,
        background: c.bgApp,
        zIndex: 1,
        paddingBottom: '6px',
    }),
});

export const headerLabelStyle: CSSProperties = {
    fontSize: '13px',
    color: c.textMuted,
    textAlign: 'center',
};

export const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '13px',
    color: c.textMuted,
    marginBottom: '6px',
};

export const summaryStyle: CSSProperties = {
    background: c.bgSurface,
    border: `1px solid ${alpha('accent', 0.25)}`,
    borderRadius: '6px',
    padding: '12px',
    marginTop: '14px',
    maxHeight: '140px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha('accent', 0.5)} ${c.bgApp}`, // dark theme scrollbar
};

export const inputStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    padding: '8px 10px',
    background: c.bgSurface,
    border: `1px solid ${alpha('accent', 0.4)}`,
    borderRadius: '4px',
    color: c.text,
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
};

export const addBtnStyle: CSSProperties = {
    background: alpha('accent', 0.1),
    color: c.accentBright,
    border: `1px dashed ${alpha('accent', 0.6)}`,
    borderRadius: '4px',
    padding: '6px 12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    marginTop: '8px',
    cursor: 'pointer',
};

export const removeBtnStyle: CSSProperties = {
    width: '36px',
    flexShrink: 0,
    background: alpha('danger', 0.15),
    color: c.danger,
    border: `1px solid ${alpha('danger', 0.4)}`,
    borderRadius: '4px',
    padding: '8px 0',
    cursor: 'pointer',
};

export const cancelBtnStyle: CSSProperties = {
    background: 'transparent',
    color: c.textMuted,
    border: `1px solid ${c.border}`,
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    cursor: 'pointer',
};

export const submitBtnStyle: CSSProperties = {
    background: c.accent,
    color: c.bgApp,
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
};
