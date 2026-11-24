// src/features/shared/AiParserModal.tsx
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { isDemoMode } from '../../api';
import { useI18n } from '../../i18n/useI18n';
import { c, alpha } from '../../theme/themes';
import type { BuyRow, Unit } from '../../types/inventory';
import { useMaterialImport } from '../shared/useMaterialImport';
import {
    overlayStyle,
    modalStyle,
    submitBtnStyle,
    cancelBtnStyle,
} from '../shared/ModalStyles';

export type AiImportType = 'invoice' | 'materials' | 'products';

interface AiParserModalProps {
    isOpen: boolean;
    units: Unit[];
    onClose: () => void;
    onMaterialsImported: (rows: BuyRow[], type: 'invoice' | 'materials') => void;
    onSelectProducts?: () => void;
}

const ENDPOINTS: Record<'invoice' | 'materials', string> = {
    invoice: '/api/invoice/parse',
    materials: '/api/import/materials', 
};

export default function AiParserModal({
    isOpen,
    units,
    onClose,
    onMaterialsImported,
    onSelectProducts,
}: AiParserModalProps) {
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingTypeRef = useRef<'invoice' | 'materials'>('invoice');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const { isImporting, importStatus, runImport, cancelImport } = useMaterialImport({
        units,
        onSuccess: (rows) => {
            setError(null);
            setNotice(null);
            onMaterialsImported(rows, pendingTypeRef.current);
            onClose();
        },
        onError: (msg) => setError(msg),
        onNotice: (msg) => setNotice(msg),
    });

    if (!isOpen) return null;

    const handleTriggerFile = (type: 'invoice' | 'materials') => {
        if (isDemoMode()) {
            setNotice(t('buy.importDemoDisabled'));
            return;
        }
        setError(null);
        setNotice(null);
        pendingTypeRef.current = type;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        await runImport(ENDPOINTS[pendingTypeRef.current], {
            method: 'POST',
            body: formData,
        });
    };

    const handleClose = () => {
        if (isImporting) return;
        setError(null);
        setNotice(null);
        onClose();
    };

    return (
        <div onClick={handleClose} style={overlayStyle}>
            <form
                className="modal-form"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => e.preventDefault()}
                style={{
                    ...modalStyle,
                    width: '400px',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.txt"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px' }}>
                            {t('aiParser.title')}
                        </h2>
                        <p
                            style={{
                                margin: '4px 0 0',
                                fontSize: '12px',
                                lineHeight: '1.4',
                                color: c.textMuted,
                            }}
                        >
                            {t('aiParser.freeTierNotice')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
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
                        disabled={isImporting}
                        onClick={() => handleTriggerFile('invoice')}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: isImporting ? 'not-allowed' : 'pointer',
                            opacity: isImporting ? 0.6 : 1,
                        }}
                    >
                        {t('aiParser.importInvoice')}
                    </button>

                    <button
                        type="button"
                        disabled={isImporting}
                        onClick={() => handleTriggerFile('materials')}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: isImporting ? 'not-allowed' : 'pointer',
                            opacity: isImporting ? 0.6 : 1,
                        }}
                    >
                        {t('aiParser.importMaterials')}
                    </button>

                    <button
                        type="button"
                        disabled={isImporting}
                        onClick={() => {
                            handleClose();
                            onSelectProducts?.();
                        }}
                        style={{
                            ...submitBtnStyle,
                            width: '100%',
                            padding: '12px 16px',
                            cursor: isImporting ? 'not-allowed' : 'pointer',
                            opacity: isImporting ? 0.6 : 1,
                        }}
                    >
                        {t('aiParser.importProducts')}
                    </button>
                </div>

                {notice && (
                    <div style={{ color: c.warning, fontSize: '13px', marginTop: '12px' }}>
                        {notice}
                    </div>
                )}

                {error && (
                    <div style={{ color: c.danger, fontSize: '13px', marginTop: '12px' }}>
                        {error}
                    </div>
                )}
            </form>

            {/* Import Progress Window */}
            {isImporting && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...overlayStyle,
                        zIndex: 1100,
                        backgroundColor: alpha('bgApp', 0.75),
                    }}
                >
                    <div
                        style={{
                            ...modalStyle,
                            width: '440px',
                            minWidth: '440px',
                            maxWidth: '90vw',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            padding: '28px 24px',
                        }}
                    >
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                margin: '0 auto 16px',
                                border: `3px solid ${alpha('accentBright', 0.25)}`,
                                borderTopColor: c.accentBright,
                                borderRadius: '50%',
                                animation: 'spin 1.5s linear infinite',
                            }}
                        />

                        <h4 style={{ margin: '0 0 10px', color: c.accentBright, fontSize: '16px' }}>
                            {t('buy.importing')}
                        </h4>

                        <div
                            style={{
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 0 20px',
                                padding: '0 8px',
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    color: c.textStrong,
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                {importStatus}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={cancelImport}
                            style={{
                                ...cancelBtnStyle,
                                borderColor: c.danger,
                                color: c.danger,
                            }}
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
