interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function RemoveProductModal({
    isOpen,
    onClose,
}: Props) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 3000,
            }}
        >
            <div
                style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '24px',
                    minWidth: '500px',
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                }}
            >
                <h3>Remove Product</h3>

                <div style={{ marginTop: '20px' }}>
                    TODO
                </div>

                <button
                    onClick={onClose}
                    style={{ marginTop: '20px' }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}