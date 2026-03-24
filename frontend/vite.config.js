import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
    resolve: {
        alias: {
            '@browser': resolve(__dirname, '../src/browser/index.ts'),
        },
    },
});
