import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.js',
    exclude: ['**/node_modules/**'],
  },
  server: { proxy: { '/api': process.env.VITE_API_PROXY ?? 'http://localhost:4000' } },
});
