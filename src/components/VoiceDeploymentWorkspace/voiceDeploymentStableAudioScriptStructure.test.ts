import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  deploy: 'scripts/deploy-stable-audio-3.ps1',
  service: 'scripts/stable-audio-service.template.ps1',
  install: 'scripts/stable-audio-service-install.ps1',
  server: 'scripts/stable-audio-server.template.py',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('stable audio deployment script uses official repository and uv ui extras', () => {
  const deploy = read(files.deploy)

  assert.match(deploy, /Stability-AI\/stable-audio-3/)
  assert.match(deploy, /uv\s+sync\s+--extra\s+ui/)
  assert.match(deploy, /\[ValidateSet\("small-sfx","small-music","medium"\)\]/)
  assert.match(deploy, /\$Port\s*=\s*8818/)
})

test('stable audio service template exposes start stop restart and status actions', () => {
  const service = read(files.service)

  assert.match(service, /ValidateSet\("start",\s*"stop",\s*"restart",\s*"status"\)/)
  assert.match(service, /stable-audio-config\.json/)
  assert.match(service, /Start-ServiceProcess/)
  assert.match(service, /Stop-ServiceProcess/)
})

test('stable audio helper exposes health and generate endpoints', () => {
  const server = read(files.server)

  assert.match(server, /@app\.get\("\/health"\)/)
  assert.match(server, /@app\.post\("\/generate"\)/)
  assert.match(server, /uv/)
  assert.match(server, /stable-audio/)
})
