import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    supportFile: false,
    specPattern: 'tests/e2e/**/*.cy.ts',
    fixturesFolder: 'tests/fixtures',
  },
})
