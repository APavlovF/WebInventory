// src/components/ScribeAdvisor.tsx
import { useState, useEffect } from 'react';

interface ScribeAdvisorProps {
    message: string;
    isDemoMode?: boolean;
}

const DEMO_ADVISOR_MESSAGES = [
    "Sign in to manage our production, milord!",
    "Our stocks are nearly empty, sire!",
    "The stockpile is full, milord!",
    "Our workshops are running low on supplies, sire!",
    "All systems operational, sire"
];

export default function ScribeAdvisor({ message, isDemoMode = true }: ScribeAdvisorProps) {
    const [demoIndex, setDemoIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Reset to the default prompt if auth state changes
    useEffect(() => {
        setDemoIndex(0);
    }, [message]);

    const handleAdvisorClick = () => {
        if (!isDemoMode) return;
        setDemoIndex((prev) => (prev + 1) % DEMO_ADVISOR_MESSAGES.length);
    };

    const displayedMessage = isDemoMode ? DEMO_ADVISOR_MESSAGES[demoIndex] : message;

    return (
        <div
            onClick={handleAdvisorClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={isDemoMode ? "Click to cycle advisor messages" : undefined}
            style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: '#111827',
                border: isHovered && isDemoMode ? '1px solid #14b8a6' : '1px solid #1f2937',
                padding: '16px 20px',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                width: '400px',
                maxWidth: 'calc(100% - 48px)',
                boxSizing: 'border-box',
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                cursor: isDemoMode ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'border-color 0.2s ease'
            }}
        >
            {/* Text Section on the Left (Original Initial Sizes) */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>                
                <p style={{ fontSize: '14px', color: '#f3f4f6', fontWeight: '500', fontStyle: 'italic', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    "{displayedMessage}"
                </p>
            </div>

            {/* Scribe Character Portrait Image Wrapper on the Right (2x Initial Size) */}
            <div className="flex flex-col items-center gap-2 shrink-0">
                <div style={{
                    width: '112px',
                    height: '112px',
                    borderRadius: '50%',
                    border: '2px solid #14b8a6',
                    backgroundColor: '#1f2937',
                    overflow: 'hidden'
                }}>
                    <img
                        src="advisor-man.png"
                        alt="System Scribe Advisor"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                        }}
                    />
                </div>
                <span
                    className="text-gray-400"
                    style={{ fontSize: '11px' }}
                >
                    Version 1.0.0
                </span>
            </div>
        </div>
    );
}