import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/web-serial-debug/',
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router'],
          'xterm': ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links', '@xterm/addon-search'],
          'utils': ['@vueuse/core', 'splitpanes', 'element-plus']
        }
      }
    }
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
