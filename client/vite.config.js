import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three-vendor';
          if (id.includes('/node_modules/gsap/')) return 'animation-vendor';
          if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-')) return 'charts-vendor';
        },
      },
    },
  },
});
