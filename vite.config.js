import { defineConfig } from 'vite'

export default defineConfig({
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
