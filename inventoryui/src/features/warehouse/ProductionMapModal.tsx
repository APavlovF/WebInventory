import type { Product } from '../../types/inventory';

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
        color: '#94a3b8',
        borderBottom: '1px solid #334155',
        textAlign: 'left',
        position: 'sticky',
        top: 0,
        backgroundColor: '#1e293b',
    };

    const td: React.CSSProperties = {
        textAlign: 'left',
        padding: '12px 16px',
        fontSize: '14px',
        color: '#e2e8f0',
        borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
    };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2000,
                background: '#0f172a',
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
                        color: '#2dd4bf',
                        fontSize: '18px',
                        lineHeight: '32px',
                    }}
                >
                    Production Map
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        background: '#1e293b',
                        color: '#94a3b8',
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
                            <th style={th}>Product</th>

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
                                    'rgba(45,212,191,0.1)',
                            }}
                        >
                            <td style={td}>TOTAL</td>

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