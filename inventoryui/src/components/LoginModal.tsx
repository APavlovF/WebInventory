// src/components/LoginModal.tsx
import React, { useState } from "react";
import { BASE_BACKEND_URL } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { c, alpha } from '../theme/themes';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
    const { t } = useI18n();
    const [isFirstAccess, setIsFirstAccess] = useState<boolean>(false);
    const [loginOrToken, setLoginOrToken] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        if (isFirstAccess) {
            const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!guidRegex.test(loginOrToken.trim())) {
                setErrorMessage(t('login.err.tokenGuid'));
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${BASE_BACKEND_URL}/api/activate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Token: loginOrToken.trim(), Password: password }),
                });
                if (!response.ok) throw new Error(t('login.err.activationFailed'));
                setSuccessMessage(t('login.passwordSet'));
                setIsFirstAccess(false);
                setLoginOrToken("");
                setPassword("");
            } catch (error: any) {
                setErrorMessage(error.message || t('login.err.activationServer'));
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            const response = await fetch(`${BASE_BACKEND_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Email: loginOrToken.trim(), Password: password }),
            });
            if (!response.ok) throw new Error(t('login.err.invalidCredentials'));
            const data = await response.json();
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("session_login_time", new Date().getTime().toString());
            onSuccess(); // Triggers authentication in parent frame
        } catch (error: any) {
            setErrorMessage(error.message || t('login.err.authServer'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={styles.title}>{isFirstAccess ? t('login.accountSetup') : t('login.signIn')}</h2>
                    <button type="button" onClick={onClose} style={styles.closeBtn} aria-label={t('common.close')}>✕</button>
                </div>

                {errorMessage && <div style={styles.error}>{errorMessage}</div>}
                {successMessage && <div style={styles.success}>{successMessage}</div>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>{isFirstAccess ? t('login.token') : t('login.login')}</label>
                    <input type="text" required style={styles.input} value={loginOrToken} onChange={(e) => setLoginOrToken(e.target.value)} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>{t('login.password')}</label>
                    <input type="password" required style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button type="submit" disabled={isLoading} style={styles.submitButton}>
                    {isLoading ? t('login.processing') : isFirstAccess ? t('login.register') : t('login.logIn')}
                </button>

                <span style={styles.clickableLabel} onClick={() => { setIsFirstAccess(!isFirstAccess); setErrorMessage(""); setSuccessMessage(""); setLoginOrToken(""); setPassword(""); }}>
                    {isFirstAccess ? t('login.backToLogin') : t('login.firstAccess')}
                </span>
            </form>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed", inset: 0, backgroundColor: alpha('overlay', 0.75),
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100,
        backdropFilter: "blur(4px)"
    },
    card: {
        background: c.bgSurface, color: c.textStrong, border: `1px solid ${alpha('accent', 0.5)}`,
        padding: "32px 24px", borderRadius: "8px", width: "100%", maxWidth: "380px",
        display: "flex", flexDirection: "column", boxShadow: `0 10px 25px ${alpha('overlay', 0.6)}`
    },
    title: { fontSize: "22px", fontWeight: "700", color: c.textStrong, margin: 0 },
    closeBtn: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: c.textMuted },
    inputGroup: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
    label: { fontSize: "14px", color: c.textMuted, flex: "1", textAlign: "left" },
    input: { width: "180px", padding: "6px 12px", fontSize: "14px", border: `1px solid ${c.border}`, borderRadius: "4px", textAlign: "center", backgroundColor: c.bgMain, color: c.text },
    error: { color: c.danger, backgroundColor: alpha('danger', 0.15), border: `1px solid ${alpha('danger', 0.4)}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    success: { color: c.success, backgroundColor: alpha('success', 0.15), border: `1px solid ${alpha('success', 0.4)}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    submitButton: { width: "100%", padding: "10px", backgroundColor: c.accent, color: c.onAccent, border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "12px", marginBottom: "16px" },
    clickableLabel: { color: c.accent, fontSize: "13px", textAlign: "center", cursor: "pointer", textDecoration: "underline" }
};
