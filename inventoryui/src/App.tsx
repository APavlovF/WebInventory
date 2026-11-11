// src/App.tsx
import React from 'react';
import MainFrame from './components/MainFrame';

export default function App() {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#020617',
            boxSizing: 'border-box'
        }}>
            <MainFrame />
        </div>
    );
}