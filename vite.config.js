import { defineConfig } from 'vite'

export default defineConfig({
  base: './',   // relative paths so electron can load built files via file://
  server: {
    // Uncomment and set target to your backend URL for local dev proxying:
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //   }
    // }
  }
})
