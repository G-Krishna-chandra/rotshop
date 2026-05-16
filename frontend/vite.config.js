import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

// Treat the workspace package as source so Vite/esbuild transforms it
// inline rather than trying to pre-bundle the raw .ts file from node_modules.
const sharedRoot = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  resolve: {
    alias: {
      '@rotshop/shared': `${sharedRoot}/types.ts`,
    },
  },
});
