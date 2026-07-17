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
      cssFileName: 'bos-nepali-date',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'bos-nepali-date.css' : '[name][extname]',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
