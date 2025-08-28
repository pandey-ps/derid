import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'dashboard.html',
        dashboardJs: 'dashboard.js'
      }
    }
  },
  server: {
    historyApiFallback: {
      rewrites: [
        { from: /^\/dashboard$/, to: '/dashboard.html' }
      ]
    }
  }
})