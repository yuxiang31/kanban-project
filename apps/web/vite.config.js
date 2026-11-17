import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_TARGET,
      '/ws': {target: API_TARGET.replace(/^http/, 'ws'), ws: true},
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      thresholds: {lines: 80, functions: 80, branches: 80, statements: 80},
    },
  },
});
