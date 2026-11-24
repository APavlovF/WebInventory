import { useI18n } from '../../i18n/useI18n';
import {
    overlayStyle,
    modalStyle,
    submitBtnStyle,
    cancelBtnStyle,
} from '../shared/ModalStyles';

export type AiImportType = 'invoice' | 'materials' | 'products';

interface AiParserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAction: (type: AiImportType) => void;
}

export default function AiParserModal({
    isOpen,
    onClose,
    onSelectAction,
}: AiParserModalProps) {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <div onClick={onClose} style={overlayStyle}>
            <form
                className="modal-form"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => e.preventDefault()}
                style={{
                    ...modalStyle,
                    width: '400px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: '18px' }}>
                        {t('aiParser.title')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            ...cancelBtnStyle,
                            padding: '4px 10px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => onSelectAction('invoice')}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: 'pointer',
                        }}
                    >
                        {t('aiParser.importInvoice')}
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectAction('materials')}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: 'pointer',
                        }}
                    >
                        {t('aiParser.importMaterials')}
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectAction('products')}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: 'pointer',
                        }}
                    >
                        {t('aiParser.importProducts')}
                    </button>
                </div>
            </form>
        </div>
    );
}