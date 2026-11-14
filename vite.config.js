import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { editor: ['@uiw/react-codemirror', '@codemirror/lang-sql', '@codemirror/theme-one-dark'], vendor: ['react', 'react-dom'] } } } },
  server: { host: '127.0.0.1', port: 5173, proxy: { '/api': 'http://127.0.0.1:3001' } },
});
