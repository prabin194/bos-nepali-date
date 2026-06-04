import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';

export default defineConfig({
  plugins: [
    react(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
      delimiters: ['', ''],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'BosNepaliDate',
      formats: ['umd'],
      fileName: () => 'bos-nepali-date.umd.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
