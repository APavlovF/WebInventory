// src/features/warehouse/WarehouseSemaphore.tsx
import { useState } from 'react';
import { alpha } from '../../theme/themes';
import {
    hasMaxStockLimit,
    type Product,
    type ProductStock,
    type UnitStock,
} from '../../types/inventory';
import { useI18n } from '../../i18n/useI18n';
import {
    overlayStyle,
    modalStyle,
    scrollAreaStyle,
    labelStyle,
    headerLabelStyle,
    cancelBtnStyle,
} from '../shared/ModalStyles';

interface WarehouseSemaphoreProps {
    top: string;
    left: string;
    unitStocks: UnitStock[];
    productStocks: ProductStock[];
    products?: Product[];
}

type LightColor = 'red' | 'yellow' | 'green';

interface StockAlertItem {
    id: string;
    name: string;
    category: 'Material' | 'Product';
    quantity: number;
    status: 'red' | 'yellow';
    reason: string;
    affectedProducts?: string[];
}

export default function WarehouseSemaphore({
    top,
    left,
    unitStocks,
    productStocks,
    products = [],
}: WarehouseSemaphoreProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useI18n();

    const getAffectedProducts = (unitId: number): string[] => {
        return products
            .filter(
                (p) =>
                    !p.isDeleted &&
                    p.items?.some((item) => item.unit?.id === unitId)
            )
            .map((p) => p.name);
    };

    const evaluateStocks = (): { status: LightColor; issues: StockAlertItem[] } => {
        const issues: StockAlertItem[] = [];

        // 1. Evaluate active raw materials
        unitStocks
            .filter((s) => !s.isDeleted)
            .forEach((s) => {
                let itemStatus: 'red' | 'yellow' | null = null;
                let reason = '';

                if (s.lowStockAlert > 0 && s.quantity <= 0) {
                    itemStatus = 'red';
                    reason = t('warehouse.semaphore.reasonEmpty', { low: s.lowStockAlert });
                } else if (s.lowStockAlert > 0 && s.quantity <= s.lowStockAlert) {
                    itemStatus = 'yellow';
                    reason = t('warehouse.semaphore.reasonLow', { low: s.lowStockAlert });
                } else if (hasMaxStockLimit(s.maxStockAlert) && s.quantity > s.maxStockAlert) {
                    itemStatus = 'yellow';
                    reason = t('warehouse.semaphore.reasonMax', { max: s.maxStockAlert });
                }

                if (itemStatus) {
                    issues.push({
                        id: `mat-${s.id}`,
                        name: s.unit.name,
                        category: 'Material',
                        quantity: s.quantity,
                        status: itemStatus,
                        reason,
                        affectedProducts: getAffectedProducts(s.unit.id),
                    });
                }
            });

        // 2. Evaluate finished products
        productStocks.forEach((s) => {
            if (s.lowStockAlert > 0 && s.quantity <= 0) {
                issues.push({
                    id: `prod-${s.id}`,
                    name: `${s.product.name} (${s.product.sku})`,
                    category: 'Product',
                    quantity: s.quantity,
                    status: 'red',
                    reason: t('warehouse.semaphore.reasonEmpty', { low: s.lowStockAlert }),
                });
            } else if (s.lowStockAlert > 0 && s.quantity <= s.lowStockAlert) {
                issues.push({
                    id: `prod-${s.id}`,
                    name: `${s.product.name} (${s.product.sku})`,
                    category: 'Product',
                    quantity: s.quantity,
                    status: 'yellow',
                    reason: t('warehouse.semaphore.reasonLow', { low: s.lowStockAlert }),
                });
            } else if (hasMaxStockLimit(s.maxStockAlert) && s.quantity > s.maxStockAlert) {
                issues.push({
                    id: `prod-${s.id}`,
                    name: `${s.product.name} (${s.product.sku})`,
                    category: 'Product',
                    quantity: s.quantity,
                    status: 'yellow',
                    reason: t('warehouse.semaphore.reasonMax', { max: s.maxStockAlert }),
                });
            }
        });

        const hasRed = issues.some((i) => i.status === 'red');
        const hasYellow = issues.some((i) => i.status === 'yellow');
        const status: LightColor = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';

        return { status, issues };
    };

    const { status, issues } = evaluateStocks();

    const statusConfig: Record<LightColor, { color: string; label: string; desc: string }> = {
        red: {
            color: '#ef4444',
            label: t('warehouse.semaphore.redLabel'),
            desc: t('warehouse.semaphore.redDesc'),
        },
        yellow: {
            color: '#eab308',
            label: t('warehouse.semaphore.yellowLabel'),
            desc: t('warehouse.semaphore.yellowDesc'),
        },
        green: {
            color: '#22c55e',
            label: t('warehouse.semaphore.greenLabel'),
            desc: t('warehouse.semaphore.greenDesc'),
        },
    };

    const activeStatus = statusConfig[status];

    return (
        <>
            {/* Map Semaphore Graphic */}
            <div
                onClick={() => setIsModalOpen(true)}
                title={t('warehouse.semaphore.tooltip')}
                style={{
                    position: 'absolute',
                    top,
                    left,
                    zIndex: 10,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
                <svg width="26" height="62" viewBox="0 0 26 62">
                    <rect
                        x="2"
                        y="2"
                        width="22"
                        height="46"
                        rx="6"
                        fill="#0f172a"
                        stroke={alpha('accent', 0.8)}
                        strokeWidth="1.5"
                    />
                    <rect x="11.5" y="48" width="3" height="12" fill={alpha('accent', 0.6)} />

                    <circle cx="13" cy="12" r="5" fill={status === 'red' ? '#ef4444' : '#3b1818'} />
                    <circle cx="13" cy="25" r="5" fill={status === 'yellow' ? '#eab308' : '#3b3012'} />
                    <circle cx="13" cy="38" r="5" fill={status === 'green' ? '#22c55e' : '#133620'} />
                </svg>
            </div>

            {/* Status & Rules Modal */}
            {isModalOpen && (
                <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
                    <div
                        style={{ ...modalStyle, width: '580px', maxWidth: '92vw' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={headerLabelStyle}>{t('warehouse.semaphore.title')}</div>

                        {/* Current Color Status Banner */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '14px',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                backgroundColor: alpha('accent', 0.06),
                                border: `1px solid ${alpha('accent', 0.2)}`,
                            }}
                        >
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: activeStatus.color,
                                    flexShrink: 0,
                                }}
                            />
                            <div style={{ ...labelStyle, margin: 0, textAlign: 'left', fontSize: '0.9em' }}>
                                <strong>{activeStatus.label}:</strong> {activeStatus.desc}
                            </div>
                        </div>

                        {/* Active Alerts List */}
                        {issues.length === 0 ? (
                            <p style={{ ...labelStyle, color: '#22c55e', marginBottom: '16px' }}>
                                {t('warehouse.semaphore.allHealthy')}
                            </p>
                        ) : (
                            <div style={{ ...scrollAreaStyle, maxHeight: '300px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {issues.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: '10px 14px',
                                                borderRadius: '6px',
                                                backgroundColor: alpha('accent', 0.08),
                                                borderLeft: `4px solid ${item.status === 'red' ? '#ef4444' : '#eab308'}`,
                                            }}
                                        >
                                            {/* Top Row: Name on left, Qty aligned cleanly on right */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'baseline',
                                                    gap: '12px',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        ...labelStyle,
                                                        margin: 0,
                                                        textAlign: 'left',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {item.name}
                                                </span>
                                                <span
                                                    style={{
                                                        ...labelStyle,
                                                        margin: 0,
                                                        textAlign: 'right',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {t('warehouse.semaphore.qty', { quantity: item.quantity })}
                                                </span>
                                            </div>

                                            {/* Second Row: Category & Reason */}
                                            <div
                                                style={{
                                                    ...labelStyle,
                                                    margin: 0,
                                                    textAlign: 'left',
                                                    opacity: 0.75,
                                                    fontSize: '0.84em',
                                                }}
                                            >
                                                {item.category === 'Material'
                                                    ? t('warehouse.semaphore.categoryMaterial')
                                                    : t('warehouse.semaphore.categoryProduct')}{' '}
                                                • {item.reason}
                                            </div>

                                            {/* Third Row: Plain text list of affected products */}
                                            {item.affectedProducts && item.affectedProducts.length > 0 && (
                                                <div
                                                    style={{
                                                        ...labelStyle,
                                                        margin: 0,
                                                        marginTop: '2px',
                                                        textAlign: 'left',
                                                        fontSize: '0.82em',
                                                        opacity: 0.9,
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    <span style={{ opacity: 0.7 }}>
                                                        {t('warehouse.semaphore.usedIn', { defaultValue: 'Used in:' })}{' '}
                                                    </span>
                                                    {item.affectedProducts.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                style={cancelBtnStyle}
                                onClick={() => setIsModalOpen(false)}
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
