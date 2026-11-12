// src/api.ts
// One place for the backend URL and for sending the login token with every request.

export const BASE_BACKEND_URL = import.meta.env.DEV
    ? 'https://localhost:7045'
    : 'https://webinventory-ia5j.onrender.com';

// Same fetch() you know, but: prefixes the backend URL and adds the
// "Authorization: Bearer <token>" header that [Authorize] endpoints expect.
// The token is the one LoginModal saves in localStorage ("authToken").
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('authToken');

    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${BASE_BACKEND_URL}${path}`, { ...init, headers });
}
