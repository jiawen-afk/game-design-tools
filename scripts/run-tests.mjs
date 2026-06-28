import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const testFileCommand = packageJson.scripts?.['test:files'] ?? ''
const match = testFileCommand.match(/^tsx\s+--test\s+(.+)$/)

if (!match) {
  console.error('package.json scripts.test:files must start with "tsx --test".')
  process.exit(1)
}

const testFiles = match[1].trim().split(/\s+/).filter(Boolean)
const chunkSize = Number.parseInt(process.env.TEST_CHUNK_SIZE ?? '35', 10)
const tsxCliPath = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')

for (let index = 0; index < testFiles.length; index += chunkSize) {
  const chunk = testFiles.slice(index, index + chunkSize)
  const result = spawnSync(process.execPath, [tsxCliPath, '--test', ...chunk], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
