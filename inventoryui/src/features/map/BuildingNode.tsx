// src/features/map/BuildingNode.tsx
import { useState } from 'react';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';
import type { TKey } from '../../i18n/en';

export type WarehouseStatus = 'low stock' | 'ok' | 'near full';

// The map passes English names ('Warehouse'...): they are only identifiers, the label shown is translated
const BUILDING_LABEL_KEYS: Record<string, TKey> = {
    warehouse: 'building.warehouse',
    office: 'building.office',
    workshop: 'building.workshop',
    market: 'building.market',
};

interface BuildingNodeProps {
    name: string;
    top: string;
    left: string;
    imgSrc: string;
    onClick?: () => void;
    // Optional handlers for the building-specific action buttons
    onBuyMaterials?: () => void;
    onSellProducts?: () => void;
    onNewProduct?: () => void;
    onCreateProducts?: () => void;
    onSetupStockLimits?: () => void;
    onImportInvoice?: () => void;    
    onRemoveMaterial?: () => void;
    onRemoveProduct?: () => void;
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
    onSetupStockLimits,
    onImportInvoice,    
    onRemoveMaterial,
    onRemoveProduct,
}: BuildingNodeProps) {
    const { t } = useI18n();
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    const normalizedName = name.trim().toLowerCase();
    const labelKey = BUILDING_LABEL_KEYS[normalizedName];
    const label = labelKey ? t(labelKey) : name;

    // Shared styling matching your floating node label
    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        padding: '8px 12px',
        background: c.bgApp,
        fontFamily: 'monospace',
        borderRadius: '6px',
        border: `1px solid ${alpha('accent', 0.4)}`,
        boxShadow: `0 4px 6px ${alpha('overlay', 0.4)}`,
        display: 'flex',
        gap: '8px',
        zIndex: 20,
        whiteSpace: 'nowrap',
    };

    const buttonStyle: React.CSSProperties = {
        background: alpha('accent', 0.15),
        color: c.accentBright,
        border: `1px solid ${alpha('accent', 0.5)}`,
        borderRadius: '4px',
        padding: '4px 10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
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
                        {t('building.addProductType')}
                    </button>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onCreateProducts)}
                    >
                        {t('building.produceBatch')}
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
                        {t('building.buyMaterials')}
                    </button>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onSellProducts)}
                    >
                        {t('building.sellProducts')}
                    </button>
                </div>
            )}

            {/* Dynamic Image Slot Layer */}
            {!imgFailed ? (
                <img
                    src={imgSrc}
                    alt={label}
                    onError={() => setImgFailed(true)}
                    style={{
                        width: '140px',
                        height: 'auto',
                        filter: isHovered
                            ? `drop-shadow(0 0 12px ${alpha('accent', 0.6)}) brightness(1.2)`
                            : `drop-shadow(0 4px 6px ${alpha('overlay', 0.3)}) opacity(0.85)`,
                        transition: 'all 0.2s',
                    }}
                />
            ) : (
                <div
                    style={{
                        width: '120px',
                        height: '80px',
                        border: `2px solid ${c.accent}`,
                        background: alpha('accent', 0.1),
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span style={{ fontSize: '10px', color: c.accent }}>{t('building.missingFile')}</span>
                </div>
            )}

            {/* Floating Node Label */}
            <span
                style={{
                    marginTop: '8px',
                    padding: '6px 14px',
                    background: c.bgApp,
                    color: isHovered ? c.accentBright : c.accent,
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    borderRadius: '6px',
                    border: `1px solid ${alpha('accent', 0.4)}`,
                    boxShadow: `0 4px 6px ${alpha('overlay', 0.4)}`,
                }}
            >{label}</span>

            {/* WAREHOUSE: Action button inside a frame, matching Workshop & Market */}
            {normalizedName === 'warehouse' && onSetupStockLimits && (
                <div
                    style={{
                        marginTop: '8px',
                        padding: '16px 14px',
                        background: alpha('bgApp', 0.9),
                        border: `1px solid ${alpha('accentBright', 0.35)}`,
                        borderRadius: '6px',
                        boxShadow: `0 4px 10px ${alpha('overlay', 0.5)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSetupStockLimits();
                        }}
                        style={{
                            padding: '5px 10px',
                            background: alpha('accent', 0.1),
                            color: c.accentBright,
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            letterSpacing: '0.3px',
                            borderRadius: '4px',
                            border: `1px solid ${alpha('accentBright', 0.4)}`,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                        }}
                    >
                        {t('building.setupLimits')}
                    </button>                    
                </div>
            )}

            {/* OFFICE: Rectangular panel TO THE RIGHT of the picture */}
            {normalizedName === 'office' && (
                <div
                    style={{
                        ...panelStyle,
                        left: '100%',
                        top: '35%',
                        transform: 'translateY(-50%)',
                        marginLeft: '12px',
                        flexDirection: 'column',
                        padding: '16px 20px',
                    }}
                >
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onImportInvoice)}
                    >
                        {t('building.importInvoice')}
                    </button>

                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onRemoveMaterial)}
                    >
                        {t('common.removeMaterial')}
                    </button>

                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={(e) => handleActionClick(e, onRemoveProduct)}
                    >
                        {t('common.removeProduct')}
                    </button>
                </div>
            )}

        </div>
    );
}