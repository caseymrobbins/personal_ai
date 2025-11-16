import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    // Increase chunk size warning limit (we have large ML models)
    chunkSizeWarningLimit: 1000,

    // Optimize bundle (Sprint 12)
    // Using default esbuild minifier (faster than terser, nearly as good)
    minify: 'esbuild',
    target: 'es2020',

    rollupOptions: {
      output: {
        // Manual chunks for better code splitting (Sprint 12)
        manualChunks: {
          // React ecosystem
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],

          // State management
          'vendor-state': ['zustand'],

          // Large ML libraries (dynamically imported, but still good to separate)
          'vendor-ml': ['@xenova/transformers', 'onnxruntime-web'],

          // Database
          'vendor-db': ['sql.js'],
        },
      },
    },
  },
})
