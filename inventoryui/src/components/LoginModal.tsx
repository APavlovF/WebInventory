// src/components/LoginModal.tsx
import React, { useState } from "react";
import { BASE_BACKEND_URL } from '../api';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
    const [isFirstAccess, setIsFirstAccess] = useState<boolean>(false);
    const [loginOrToken, setLoginOrToken] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        if (isFirstAccess) {
            const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!guidRegex.test(loginOrToken.trim())) {
                setErrorMessage("The activation token must be a valid GUID structure.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${BASE_BACKEND_URL}/api/activate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Token: loginOrToken.trim(), Password: password }),
                });
                if (!response.ok) throw new Error("Activation failed.");
                setSuccessMessage("Password set successfully! Please log in below.");
                setIsFirstAccess(false);
                setLoginOrToken("");
                setPassword("");
            } catch (error: any) {
                setErrorMessage(error.message || "Server error during activation.");
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
            if (!response.ok) throw new Error("Invalid username or password.");
            const data = await response.json();
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("session_login_time", new Date().getTime().toString());
            onSuccess(); // Triggers authentication in parent frame
        } catch (error: any) {
            setErrorMessage(error.message || "Server error during authentication.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={styles.title}>{isFirstAccess ? "Account Setup" : "Sign In"}</h2>
                    <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                {errorMessage && <div style={styles.error}>{errorMessage}</div>}
                {successMessage && <div style={styles.success}>{successMessage}</div>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>{isFirstAccess ? "Token:" : "Login:"}</label>
                    <input type="text" required style={styles.input} value={loginOrToken} onChange={(e) => setLoginOrToken(e.target.value)} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password:</label>
                    <input type="password" required style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button type="submit" disabled={isLoading} style={styles.submitButton}>
                    {isLoading ? "Processing..." : isFirstAccess ? "Register" : "Log in"}
                </button>

                <span style={styles.clickableLabel} onClick={() => { setIsFirstAccess(!isFirstAccess); setErrorMessage(""); setSuccessMessage(""); setLoginOrToken(""); setPassword(""); }}>
                    {isFirstAccess ? "Back to Login" : "First access"}
                </span>
            </form>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)",
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100,
        backdropFilter: "blur(4px)"
    },
    card: { background: "#ffffff", padding: "32px 24px", borderRadius: "8px", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column" },
    title: { fontSize: "22px", fontWeight: "700", color: "#212529", margin: 0 },
    closeBtn: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" },
    inputGroup: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
    label: { fontSize: "14px", color: "#495057", flex: "1", textAlign: "left" },
    input: { width: "180px", padding: "6px 12px", fontSize: "14px", border: "1px solid #ced4da", borderRadius: "4px", textAlign: "center" },
    error: { color: "#721c24", backgroundColor: "#f8d7da", padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    success: { color: "#155724", backgroundColor: "#d4edda", padding: "8px 12px", borderRadius: "4px", marginBottom: "16px", fontSize: "13px", textAlign: "center" },
    submitButton: { width: "100%", padding: "10px", backgroundColor: "#0056b3", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "12px", marginBottom: "16px" },
    clickableLabel: { color: "#0056b3", fontSize: "13px", textAlign: "center", cursor: "pointer", textDecoration: "underline" }
};