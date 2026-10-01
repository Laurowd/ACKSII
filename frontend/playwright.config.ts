import { defineConfig, devices } from '@playwright/test'
const apiPort = process.env.TEST_API_PORT || '3001'
const webPort = process.env.TEST_WEB_PORT || '4173'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, retries: 0, timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure', ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: [
    { command: 'node ../backend/tests/serve.cjs', url: `http://127.0.0.1:${apiPort}/api/ready`, reuseExistingServer: false },
    { command: `npm run preview -- --host 127.0.0.1 --port ${webPort} --strictPort`, url: `http://127.0.0.1:${webPort}`, reuseExistingServer: false },
  ],
})
