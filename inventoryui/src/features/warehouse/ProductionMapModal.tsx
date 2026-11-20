import type { Product } from '../../types/inventory';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
    isOpen: boolean;
    products: Product[];
    onClose: () => void;
}

export default function ProductionMapModal({
    isOpen,
    products,
    onClose,
}: Props) {
    const { t } = useI18n();
    if (!isOpen) return null;

    const materials = Array.from(
        new Map(
            products
                .flatMap(p => p.items)
                .map(i => [i.unit.id, i.unit])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const totalByMaterial = new Map<number, number>();

    products.forEach(product => {
        product.items.forEach(item => {
            totalByMaterial.set(
                item.unit.id,
                (totalByMaterial.get(item.unit.id) ?? 0) + item.quantity
            );
        });
    });

    const th: React.CSSProperties = {
        padding: '12px 16px',
        fontSize: '13px',
        fontWeight: 600,
        color: c.textMuted,
        borderBottom: `1px solid ${c.border}`,
        textAlign: 'left',
        position: 'sticky',
        top: 0,
        backgroundColor: c.bgSurface,
    };

    const td: React.CSSProperties = {
        textAlign: 'left',
        padding: '12px 16px',
        fontSize: '14px',
        color: c.textStrong,
        borderBottom: `1px solid ${alpha('border', 0.6)}`,
    };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2000,
                background: c.bgApp,
                fontFamily: 'monospace',
                display: 'flex',
                flexDirection: 'column',                
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    position: 'relative',
                    height: '32px',
                    //marginBottom: '12px',
                    paddingLeft: '12px',
                    paddingTop: '10px',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        color: c.accentBright,
                        fontSize: '18px',
                        lineHeight: '32px',
                    }}
                >
                    {t('prodMap.title')}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        background: c.bgSurface,
                        color: c.textMuted,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        fontWeight: 'bold',
                    }}
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    paddingTop: '10px',
                }}
            >

                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                    }}
                >
                    <thead>
                        <tr>
                            <th style={th}>{t('common.product')}</th>

                            {materials.map(material => (
                                <th
                                    key={material.id}
                                    style={th}
                                >
                                    {material.name}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td style={td}>
                                    {product.name}
                                </td>

                                {materials.map(material => {
                                    const item =
                                        product.items.find(
                                            x => x.unit.id === material.id
                                        );

                                    return (
                                        <td
                                            key={material.id}
                                            style={td}
                                        >
                                            {item?.quantity ?? ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        <tr
                            style={{
                                fontWeight: 'bold',
                                background:
                                    alpha('accentBright', 0.1),
                            }}
                        >
                            <td style={td}>{t('prodMap.total')}</td>

                            {materials.map(material => (
                                <td
                                    key={material.id}
                                    style={td}
                                >
                                    {totalByMaterial.get(material.id) ?? 0}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}