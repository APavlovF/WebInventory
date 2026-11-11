// src/features/forms/reports.tsx
export default function Reports() {
    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            boxSizing: 'border-box', padding: '32px',
            backgroundColor: '#0f172a', color: '#14b8a6', overflow: 'auto', zIndex: 20
        }}>
            <label style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold' }}>Reports</label>
        </div>
    );
}
