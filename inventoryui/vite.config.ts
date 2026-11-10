import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
	base: '/WebInventory/',
    server: {
        port: 56951,
		strictPort: true
    }
})
