import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import plugin from '@vitejs/plugin-react';

// Version shown in the app, first match wins:
//   1. APP_VERSION environment variable (you set it in the host / CI)
//   2. git tag:   "v2.1.0"  on a tagged commit,  "v2.1.0-3-g4f2a9c1"  3 commits after the tag
//                 (or just the short commit id if the repo has no tags)
//   3. commit id given by the host (Render, Vercel, Netlify)
//   4. "version" from package.json
function gitDescribe(): string | null {
    try {
        return execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
    } catch {
        return null; // no git in the build environment
    }
}

const packageVersion: string = JSON.parse(readFileSync('./package.json', 'utf8')).version;
const hostCommit = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF;

const appVersion =
    process.env.APP_VERSION ||
    gitDescribe() ||
    hostCommit?.slice(0, 7) ||
    packageVersion;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
	define: {
        __APP_VERSION__: JSON.stringify(appVersion),
    },
	base: '/WebInventory/',
    server: {
        port: 56951,
		strictPort: true
    }
})
