import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/verify': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/cookies': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/keywords': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/cards': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/delivery-rules': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/notification-channels': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/message-notifications': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/system-settings': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/logs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/qrcode': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/generate-captcha': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/verify-captcha': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/send-verification-code': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/registration-status': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login-info-status': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/register': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/items': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/itemReplays': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/item-reply': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/default-replies': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ai-reply-settings': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ai-reply-test': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/password-login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/qr-login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/keywords-export': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/keywords-import': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/default-reply': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
