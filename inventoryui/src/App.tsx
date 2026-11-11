import React, { useState, useEffect } from "react";

const BASE_BACKEND_URL = import.meta.env.DEV
    ? "https://localhost:7045"                     
    : "https://webinventory-ia5j.onrender.com";
const EXPIRATION_TIME_MS = 5 * 60 * 1000; // 5 minutes session expiration

export default function App() {
    // Navigation & Authentication States
    const [isFirstAccess, setIsFirstAccess] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Form Field States
    const [loginOrToken, setLoginOrToken] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    // Feedback Messages
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Initial Load: Check session expiration on mount
    useEffect(() => {
        checkSessionExpiration();
        const interval = setInterval(checkSessionExpiration, 10000); // Background check every 10s
        return () => clearInterval(interval);
    }, []);

    // Session Validation Engine
    const checkSessionExpiration = () => {
        const loginTime = localStorage.getItem("session_login_time");
        if (loginTime) {
            const now = new Date().getTime();
            if (now - parseInt(loginTime, 10) > EXPIRATION_TIME_MS) {
                handleLogout("Session expired. Please login again.");
            } else {
                setIsAuthenticated(true);
            }
        }
    };

    // API Form Submission Handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        // 1. First Access Flow (/api/activate)
        if (isFirstAccess) {
            // Client-side Guid structural validation
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
                    body: JSON.stringify({
                        Token: loginOrToken.trim(),
                        Password: password
                    }),
                });

                if (!response.ok) {
                    if (response.status === 400) {
                        throw new Error("Activation token is invalid, expired, or already used.");
                    }
                    throw new Error("Activation failed.");
                }

                // Success Action: Notify user and transition to standard login window
                setSuccessMessage("Password set successfully! Please log in below.");
                setIsFirstAccess(false);
                setLoginOrToken("");
                setPassword("");
            } catch (error: any) {
                setErrorMessage(error.message || "Server connection error during activation.");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 2. Standard Login Flow (/api/login)
        try {
            const response = await fetch(`${BASE_BACKEND_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: loginOrToken.trim(), // Maps directly to request.Email
                    Password: password
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Invalid username or password.");
                }
                throw new Error("Login process failed.");
            }

            const data = await response.json(); // Parses the { token } payload returned from your endpoint

            // Establish Authorized Session
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("session_login_time", new Date().getTime().toString());
            setIsAuthenticated(true);

            // Reset forms securely
            setLoginOrToken("");
            setPassword("");
        } catch (error: any) {
            setErrorMessage(error.message || "Server connection error during authentication.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = (message = "") => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("session_login_time");
        setIsAuthenticated(false);
        setSuccessMessage("");
        setErrorMessage(message);
    };

    // --- Authorized Dashboard View (New Form appears upon success) ---
    if (isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.title}>System Control</h2>
                    <p style={{ textAlign: "center", color: "#495057", fontSize: "14px", marginBottom: "24px" }}>
                        Successfully authenticated.
                    </p>
                    <button style={styles.submitButton} onClick={() => alert("System action triggered!")}>
                        Main Control Button
                    </button>
                    <span style={styles.clickableLabel} onClick={() => handleLogout()}>
                        Sign Out
                    </span>
                </div>
            </div>
        );
    }

    // --- Authentication Form View ---
    return (
        <div style={styles.container}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <h2 style={styles.title}>{isFirstAccess ? "Account Setup" : "Setup"}</h2>

                {errorMessage && <div style={styles.error}>{errorMessage}</div>}
                {successMessage && <div style={styles.success}>{successMessage}</div>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        {isFirstAccess ? "Token:" : "Login:"}
                    </label>
                    <input
                        type="text"
                        required
                        style={styles.input}
                        value={loginOrToken}
                        onChange={(e) => setLoginOrToken(e.target.value)}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password:</label>
                    <input
                        type="password"
                        required
                        style={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button type="submit" disabled={isLoading} style={styles.submitButton}>
                    {isLoading ? "Processing..." : isFirstAccess ? "Register" : "Log in"}
                </button>

                <span
                    style={styles.clickableLabel}
                    onClick={() => {
                        setIsFirstAccess(!isFirstAccess);
                        setErrorMessage("");
                        setSuccessMessage("");
                        setLoginOrToken("");
                        setPassword("");
                    }}
                >
                    {isFirstAccess ? "Back to Login" : "First access"}
                </span>
            </form>
        </div>
    );
}

// Exactly matches styling definitions from the reference project snapshot
const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
        background: "#ffffff",
        padding: "32px 24px",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        width: "100%",
        maxWidth: "380px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column"
    },
    title: {
        textAlign: "center",
        fontSize: "22px",
        fontWeight: "700",
        color: "#212529",
        marginTop: "0",
        marginBottom: "24px"
    },
    inputGroup: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
        width: "100%"
    },
    label: {
        fontSize: "14px",
        color: "#495057",
        flex: "1",
        textAlign: "left"
    },
    input: {
        width: "180px",
        padding: "6px 12px",
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#212529",
        backgroundColor: "#fff",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        textAlign: "center",
        outline: "none",
        boxSizing: "border-box"
    },
    error: {
        color: "#721c24",
        backgroundColor: "#f8d7da",
        border: "1px solid #f5c6cb",
        padding: "8px 12px",
        borderRadius: "4px",
        marginBottom: "16px",
        fontSize: "13px",
        textAlign: "center"
    },
    success: {
        color: "#155724",
        backgroundColor: "#d4edda",
        border: "1px solid #c3e6cb",
        padding: "8px 12px",
        borderRadius: "4px",
        marginBottom: "16px",
        fontSize: "13px",
        textAlign: "center"
    },
    submitButton: {
        width: "100%",
        padding: "10px",
        backgroundColor: "#0056b3",
        color: "#ffffff",
        border: "none",
        borderRadius: "4px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        marginTop: "12px",
        marginBottom: "16px"
    },
    clickableLabel: {
        color: "#0056b3",
        fontSize: "13px",
        textAlign: "center",
        cursor: "pointer",
        textDecoration: "underline",
        display: "block",
        width: "100%"
    }
};