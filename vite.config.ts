import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const deploymentScriptFiles = [
  'deploy-voxcpm.ps1',
  'deploy-birefnet.ps1',
  'birefnet-deploy-common.ps1',
  'birefnet-python-runtime.ps1',
  'birefnet-service-install.ps1',
  'birefnet-server.template.py',
  'birefnet-service.template.ps1',
  'voxcpm-deploy-common.ps1',
  'voxcpm-python-runtime.ps1',
  'voxcpm-prerequisites.ps1',
  'voxcpm-service-install.ps1',
  'voxcpm-sitecustomize.py',
  'voxcpm-run.template.ps1',
  'voxcpm-service.template.ps1',
]

function copyDeploymentScripts() {
  return {
    name: 'copy-deployment-scripts',
    closeBundle() {
      const outputDir = join(process.cwd(), 'dist/scripts')
      mkdirSync(outputDir, { recursive: true })
      for (const fileName of deploymentScriptFiles) {
        copyFileSync(join(process.cwd(), 'scripts', fileName), join(outputDir, fileName))
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), copyDeploymentScripts()],
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
          if (id.includes('/echarts/') || id.includes('/zrender/')) {
            return 'chart-vendor'
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
