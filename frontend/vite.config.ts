import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': process.env.TEST_API_PORT ? `http://127.0.0.1:${process.env.TEST_API_PORT}` : 'http://localhost:3001'
    }
  }
})
