import { defineConfig, searchForWorkspaceRoot } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('../backend/src/data/domainIncomeFactors.json', import.meta.url))] },
    proxy: {
      '/api': process.env.TEST_API_PORT ? `http://127.0.0.1:${process.env.TEST_API_PORT}` : 'http://localhost:3001'
    }
  }
})
