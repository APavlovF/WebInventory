// src/features/shared/modalStyles.ts
// One set of styles for all four modals, so they always look the same.
import type { CSSProperties } from 'react';

export const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    fontFamily: 'monospace',
};

export const modalStyle: CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(20, 184, 166, 0.5)',
    borderRadius: '8px',
    padding: '24px',
    width: '580px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(20, 184, 166, 0.5) #0f172a', // dark theme scrollbar
    color: '#f8fafc',
    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
};

// The list of rows scrolls when there are many; the header row is sticky inside it
export const scrollAreaStyle: CSSProperties = {
    maxHeight: '240px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(20, 184, 166, 0.5) #0f172a', // dark theme scrollbar
    scrollbarGutter: 'stable',
};

export const rowStyle = (isHeader: boolean): CSSProperties => ({
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    ...(isHeader && {
        position: 'sticky',
        top: 0,
        background: '#0f172a',
        zIndex: 1,
        paddingBottom: '6px',
    }),
});

export const headerLabelStyle: CSSProperties = {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
};

export const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
};

export const summaryStyle: CSSProperties = {
    background: '#1e293b',
    border: '1px solid rgba(20, 184, 166, 0.25)',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '14px',
    maxHeight: '140px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(20, 184, 166, 0.5) #0f172a', // dark theme scrollbar
};

export const inputStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    padding: '8px 10px',
    background: '#1e293b',
    border: '1px solid rgba(20, 184, 166, 0.4)',
    borderRadius: '4px',
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
};

export const addBtnStyle: CSSProperties = {
    background: 'rgba(20, 184, 166, 0.1)',
    color: '#2dd4bf',
    border: '1px dashed rgba(20, 184, 166, 0.6)',
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
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    borderRadius: '4px',
    padding: '8px 0',
    cursor: 'pointer',
};

export const cancelBtnStyle: CSSProperties = {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    cursor: 'pointer',
};

export const submitBtnStyle: CSSProperties = {
    background: '#14b8a6',
    color: '#0f172a',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
};
