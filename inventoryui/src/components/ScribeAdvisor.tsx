// src/components/ScribeAdvisor.tsx

interface ScribeAdvisorProps {
    message: string;
}

export default function ScribeAdvisor({ message }: ScribeAdvisorProps) {
    return (
        <div style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            width: '340px',
            boxSizing: 'border-box',
            zIndex: 100,
            backdropFilter: 'blur(12px)'
        }}>
            {/* Scribe Character Portrait Image Wrapper */}
            <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid #14b8a6',
                backgroundColor: '#1f2937',
                overflow: 'hidden',
                flexShrink: 0
            }}>
                <img
                    src="advisor-man.png"
                    alt="System Scribe Advisor"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        // Generates simple line styling placeholder if file missing
                        (e.target as HTMLElement).style.display = 'none';
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'monospace', color: '#14b8a6', fontWeight: 'bold' }}>
                    System Advisor
                </span>
                <p style={{ fontSize: '14px', color: '#f3f4f6', fontWeight: '500', fontStyle: 'italic', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    "{message}"
                </p>
            </div>
        </div>
    );
}