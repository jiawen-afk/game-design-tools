import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor'
          }
          if (id.includes('/@ant-design/icons') || id.includes('/@ant-design/icons-svg')) {
            return 'antd-icons'
          }
          if (id.includes('/antd/') || id.includes('/@ant-design/cssinjs')) {
            return 'antd-core'
          }
          if (id.includes('/rc-') || id.includes('/@rc-component/')) {
            return 'antd-rc'
          }
          if (id.includes('/jszip/') || id.includes('/pako/') || id.includes('/readable-stream/')) {
            return 'zip-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
})
