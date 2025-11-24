import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['e2e/**/*.spec.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/components/DatabasePOC.tsx',
        'src/components/TransformersPOC.tsx',
        'src/components/WebLLMPOC.tsx',
        'scripts/',
        'docs/',
      ],
    },
  },
});
