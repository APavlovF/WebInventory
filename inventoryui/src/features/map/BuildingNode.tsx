// src/features/map/BuildingNode.tsx
import { useState } from 'react';

export type WarehouseStatus = 'low stock' | 'ok' | 'near full';

interface BuildingNodeProps {
    name: string;
    top: string;
    left: string;
    imgSrc: string;
    onClick: () => void;
    // Optional handlers for the building-specific action buttons
    onBuyMaterials?: () => void;
    onSellProducts?: () => void;
    onNewProduct?: () => void;
    onCreateProducts?: () => void;
    // Optional status for the Warehouse building
    warehouseStatus?: WarehouseStatus;
}

export default function BuildingNode({
    name,
    top,
    left,
    imgSrc,
    onClick,
    onBuyMaterials,
    onSellProducts,
    onNewProduct,
    onCreateProducts,
    warehouseStatus = 'ok',
}: BuildingNodeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    const normalizedName = name.trim().toLowerCase();

    // Shared styling matching your floating node label
    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        padding: '8px 12px',
        background: '#0f172a',
        fontFamily: 'monospace',
        borderRadius: '6px',
        border: '1px solid rgba(20, 184, 166, 0.4)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
        display: 'flex',
        gap: '8px',
        zIndex: 20,
        whiteSpace: 'nowrap',
    };

    const buttonStyle: React.CSSProperties = {
        background: 'rgba(20, 184, 166, 0.15)',
        color: '#2dd4bf',
        border: '1px solid rgba(20, 184, 166, 0.5)',
        borderRadius: '4px',
        padding: '4px 10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
    };

    // Color indicator helper for Warehouse status
    const getStatusColor = (status: WarehouseStatus) => {
        switch (status) {
            case 'low stock':
                return '#f87171'; // Red
            case 'near full':
                return '#fbbf24'; // Amber/Yellow
            case 'ok':
            default:
                return '#2dd4bf'; // Teal
        }
    };

    // Prevents clicking a button from also firing the building's main onClick
    const handleActionClick = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        if (action) action();
    };

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
            {/* WORKSHOP: Rectangular panel ABOVE the picture */}
            {normalizedName === 'workshop' && (
                <div
                    style={{
                        ...panelStyle,
                        bottom: '100%',
                        marginBottom: '10px',
                        flexDirection: 'column',
                        padding: '16px 20px',
                    }}
                >
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onNewProduct)}
                    >
                        Add product type
                    </button>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onCreateProducts)}
                    >
                        Produce batch
                    </button>
                </div>
            )}

            {/* MARKET: Rectangular panel TO THE LEFT of the picture */}
            {normalizedName === 'market' && (
                <div
                    style={{
                        ...panelStyle,
                        right: '100%',
                        top: '35%',
                        transform: 'translateY(-50%)',
                        marginRight: '12px',
                        flexDirection: 'column',
                        padding: '16px 20px',                        
                    }}
                >
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onBuyMaterials)}
                    >
                        Buy materials
                    </button>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onSellProducts)}
                    >
                        Sell products
                    </button>
                </div>
            )}

            {/* Dynamic Image Slot Layer */}
            {!imgFailed ? (
                <img
                    src={imgSrc}
                    alt={name}
                    onError={() => setImgFailed(true)}
                    style={{
                        width: '140px',
                        height: 'auto',
                        filter: isHovered
                            ? 'drop-shadow(0 0 12px rgba(20, 184, 166, 0.6)) brightness(1.2)'
                            : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3)) opacity(0.85)',
                        transition: 'all 0.2s',
                    }}
                />
            ) : (
                <div
                    style={{
                        width: '120px',
                        height: '80px',
                        border: '2px solid #14b8a6',
                        background: 'rgba(20, 184, 166, 0.1)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span style={{ fontSize: '10px', color: '#14b8a6' }}>Missing File</span>
                </div>
            )}

            {/* Floating Node Label */}
            <span
                style={{
                    marginTop: '8px',
                    padding: '6px 14px',
                    background: '#0f172a',
                    color: isHovered ? '#2dd4bf' : '#14b8a6',
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 184, 166, 0.4)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                }}
            >
                {name}
            </span>

            {/* WAREHOUSE: Rectangular status box BELOW the building/label */}
            {normalizedName === 'warehouse' && (
                <div
                    style={{
                        marginTop: '8px',
                        padding: '5px 12px',
                        background: '#0f172a',
                        color: getStatusColor(warehouseStatus),
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderRadius: '6px',
                        border: `1px solid ${getStatusColor(warehouseStatus)}`,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Status: {warehouseStatus}
                </div>
            )}
        </div>
    );
}