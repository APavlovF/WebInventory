// src/features/warehouse/WarehouseSemaphore.tsx
import { useState } from 'react';
import { alpha } from '../../theme/themes';
import type { ProductStock, UnitStock } from '../../types/inventory';
import { useI18n } from '../../i18n/I18nContext';
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
}

type LightColor = 'red' | 'yellow' | 'green';

interface StockAlertItem {
    id: string;
    name: string;
    category: 'Material' | 'Product';
    quantity: number;
    status: 'red' | 'yellow';
    reason: string;
}

const INT32_MAX = 2147483647;
const isDefaultMax = (val: number) =>
    !val || val >= INT32_MAX || val >= Number.MAX_SAFE_INTEGER;

export default function WarehouseSemaphore({
    top,
    left,
    unitStocks,
    productStocks,
}: WarehouseSemaphoreProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useI18n();

    const evaluateStocks = (): { status: LightColor; issues: StockAlertItem[] } => {
        const issues: StockAlertItem[] = [];

        // 1. Evaluate active raw materials
        unitStocks
            .filter((s) => !s.isDeleted)
            .forEach((s) => {
                if (s.lowStockAlert > 0 && s.quantity <= 0) {
                    issues.push({
                        id: `mat-${s.id}`,
                        name: s.unit.name,
                        category: 'Material',
                        quantity: s.quantity,
                        status: 'red',
                        reason: t('warehouse.semaphore.reasonEmpty', { low: s.lowStockAlert }),
                    });
                } else if (s.lowStockAlert > 0 && s.quantity <= s.lowStockAlert) {
                    issues.push({
                        id: `mat-${s.id}`,
                        name: s.unit.name,
                        category: 'Material',
                        quantity: s.quantity,
                        status: 'yellow',
                        reason: t('warehouse.semaphore.reasonLow', { low: s.lowStockAlert }),
                    });
                } else if (!isDefaultMax(s.maxStockAlert) && s.quantity > s.maxStockAlert) {
                    issues.push({
                        id: `mat-${s.id}`,
                        name: s.unit.name,
                        category: 'Material',
                        quantity: s.quantity,
                        status: 'yellow',
                        reason: t('warehouse.semaphore.reasonMax', { max: s.maxStockAlert }),
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
            } else if (!isDefaultMax(s.maxStockAlert) && s.quantity > s.maxStockAlert) {
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

                    {/* Red */}
                    <circle
                        cx="13"
                        cy="12"
                        r="5"
                        fill={status === 'red' ? '#ef4444' : '#3b1818'}
                    />
                    {/* Yellow */}
                    <circle
                        cx="13"
                        cy="25"
                        r="5"
                        fill={status === 'yellow' ? '#eab308' : '#3b3012'}
                    />
                    {/* Green */}
                    <circle
                        cx="13"
                        cy="38"
                        r="5"
                        fill={status === 'green' ? '#22c55e' : '#133620'}
                    />
                </svg>
            </div>

            {/* Status & Rules Modal */}
            {isModalOpen && (
                <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
                    <div
                        style={{ ...modalStyle, width: '460px', maxWidth: '90vw' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={headerLabelStyle}>{t('warehouse.semaphore.title')}</div>

                        {/* Light Definition Legend */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '16px',
                                padding: '12px',
                                borderRadius: '6px',
                                backgroundColor: alpha('accent', 0.06),
                                border: `1px solid ${alpha('accent', 0.2)}`,
                            }}
                        >
                            <div style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                                <span>
                                    <strong>{t('warehouse.semaphore.redLabel')}:</strong> {t('warehouse.semaphore.redDesc')}
                                </span>
                            </div>
                            <div style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#eab308', flexShrink: 0 }} />
                                <span>
                                    <strong>{t('warehouse.semaphore.yellowLabel')}:</strong> {t('warehouse.semaphore.yellowDesc')}
                                </span>
                            </div>
                            <div style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
                                <span>
                                    <strong>{t('warehouse.semaphore.greenLabel')}:</strong> {t('warehouse.semaphore.greenDesc')}
                                </span>
                            </div>
                        </div>

                        {/* Active Alerts List */}
                        {issues.length === 0 ? (
                            <p style={{ ...labelStyle, color: '#22c55e', marginBottom: '16px' }}>
                                {t('warehouse.semaphore.allHealthy')}
                            </p>
                        ) : (
                            <div style={{ ...scrollAreaStyle, maxHeight: '220px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {issues.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                backgroundColor: alpha('accent', 0.08),
                                                borderLeft: `4px solid ${item.status === 'red' ? '#ef4444' : '#eab308'}`,
                                            }}
                                        >
                                            <div>
                                                <div style={{ ...labelStyle, margin: 0, fontWeight: 600 }}>
                                                    {item.name}
                                                </div>
                                                <div style={{ ...labelStyle, margin: 0, opacity: 0.75, fontSize: '0.85em' }}>
                                                    {item.category === 'Material'
                                                        ? t('warehouse.semaphore.categoryMaterial')
                                                        : t('warehouse.semaphore.categoryProduct')}{' '}
                                                    • {item.reason}
                                                </div>
                                            </div>
                                            <span style={{ ...labelStyle, margin: 0, fontWeight: 700 }}>
                                                {t('warehouse.semaphore.qty', { quantity: item.quantity })}
                                            </span>
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
