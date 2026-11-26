// src/components/LoginModal.tsx
import React, { useState, useEffect } from "react";
import { BASE_BACKEND_URL } from '../api';
import { useI18n } from '../i18n/useI18n';
import { c, alpha } from '../theme/themes';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
    initialToken?: string;
}

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

export default function LoginModal({ onSuccess, onClose, initialToken }: LoginModalProps) {
    const { t } = useI18n();
    const [isFirstAccess, setIsFirstAccess] = useState<boolean>(Boolean(initialToken));
    const [loginOrToken, setLoginOrToken] = useState<string>(initialToken ?? "");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (initialToken) {
            setIsFirstAccess(true);
            setLoginOrToken(initialToken);
        }
    }, [initialToken]);

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
            if (password !== confirmPassword) {
                setErrorMessage(t('login.err.passwordMismatch'));
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
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
            } catch (err: unknown) {
                setErrorMessage(err instanceof Error ? err.message : t('login.err.activationServer'));
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
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : t('login.err.authServer'));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsFirstAccess(!isFirstAccess);
        setErrorMessage("");
        setSuccessMessage("");
        setLoginOrToken("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
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
                    <input
                        type="text"
                        required
                        style={styles.input}
                        value={loginOrToken}
                        onChange={(e) => setLoginOrToken(e.target.value)}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>{t('login.password')}</label>
                    <div style={styles.passwordWrapper}>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            style={styles.passwordInput}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            style={styles.eyeButton}
                            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                            tabIndex={-1}
                        >
                            <EyeIcon open={showPassword} />
                        </button>
                    </div>
                </div>

                {isFirstAccess && (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>{t('login.repeatPassword')}</label>
                        <div style={styles.passwordWrapper}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                style={styles.passwordInput}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                style={styles.eyeButton}
                                aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                                tabIndex={-1}
                            >
                                <EyeIcon open={showConfirmPassword} />
                            </button>
                        </div>
                    </div>
                )}

                <button type="submit" disabled={isLoading} style={styles.submitButton}>
                    {isLoading ? t('login.processing') : isFirstAccess ? t('login.register') : t('login.logIn')}
                </button>

                <span style={styles.clickableLabel} onClick={toggleMode}>
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
    inputGroup: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "8px" },
    label: { fontSize: "14px", color: c.textMuted, flex: "1", textAlign: "left" },
    input: { width: "180px", boxSizing: "border-box", padding: "6px 12px", fontSize: "14px", border: `1px solid ${c.border}`, borderRadius: "4px", textAlign: "center", backgroundColor: c.bgMain, color: c.text },
    passwordWrapper: { position: "relative", width: "180px", display: "flex", alignItems: "center" },
    passwordInput: { width: "100%", boxSizing: "border-box", padding: "6px 32px", fontSize: "14px", border: `1px solid ${c.border}`, borderRadius: "4px", textAlign: "center", backgroundColor: c.bgMain, color: c.text },
    eyeButton: { position: "absolute", right: "6px", background: "none", border: "none", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: c.textMuted },
    error: { color: c.danger, backgroundColor: alpha('danger', 0.15), border: `1px solid ${alpha('danger', 0.4)}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    success: { color: c.success, backgroundColor: alpha('success', 0.15), border: `1px solid ${alpha('success', 0.4)}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    submitButton: { width: "100%", padding: "10px", backgroundColor: c.accent, color: c.onAccent, border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "12px", marginBottom: "16px" },
    clickableLabel: { color: c.accent, fontSize: "13px", textAlign: "center", cursor: "pointer", textDecoration: "underline" }
};
