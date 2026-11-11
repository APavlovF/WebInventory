// src/features/map/BuildingNode.tsx
import { useState } from 'react';

interface BuildingNodeProps {
    name: string;
    top: string;
    left: string;
    imgSrc: string;
    onClick: () => void;
}

export default function BuildingNode({ name, top, left, imgSrc, onClick }: BuildingNodeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'absolute',
                top,
                left,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                zIndex: isHovered ? 30 : 10,
            }}
        >
            {/* Dynamic Image Slot Layer */}
            {!imgFailed ? (
                <img
                    src={imgSrc}
                    alt={name}
                    onError={() => setImgFailed(true)} // Falls back gracefully if image file doesn't exist
                    style={{
                        width: '140px',
                        height: 'auto',
                        filter: isHovered
                            ? 'drop-shadow(0 0 12px rgba(20, 184, 166, 0.6)) brightness(1.2)'
                            : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3)) opacity(0.85)',
                        transition: 'all 0.2s'
                    }}
                />
            ) : (
                /* Stand-in fallback asset box if file path missing */
                <div style={{
                    width: '120px', height: '80px',
                    border: '2px solid #14b8a6', background: 'rgba(20, 184, 166, 0.1)',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '10px', color: '#14b8a6' }}>Missing File</span>
                </div>
            )}

            {/* Floating Node Label */}
            <span style={{
                marginTop: '8px',
                padding: '3px 8px',
                background: '#0f172a',
                color: isHovered ? '#2dd4bf' : '#14b8a6',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
            }}>
                {name}
            </span>
        </div>
    );
}