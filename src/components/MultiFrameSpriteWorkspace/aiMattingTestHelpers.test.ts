import { existsSync, readFileSync } from 'node:fs'

export const birefnetDeploymentScriptPaths = [
  'scripts/deploy-birefnet.ps1',
  'scripts/birefnet-deploy-common.ps1',
  'scripts/birefnet-python-runtime.ps1',
  'scripts/birefnet-service-install.ps1',
  'scripts/birefnet-server.template.py',
  'scripts/birefnet-service.template.ps1',
]

export function readBirefnetDeploymentSources() {
  return birefnetDeploymentScriptPaths
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
}
