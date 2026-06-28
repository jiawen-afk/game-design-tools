import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import * as spriteModel from './model'

type ExportedFunction = (...args: unknown[]) => unknown

const spriteWorkspaceStylePaths = [
  'src/components/MultiFrameSpriteWorkspace/workspace.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.videoLayout.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upload.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.video.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.matte.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upscale.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.playback.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.responsive.css',
]

export function spriteWorkspaceCssSource() {
  return spriteWorkspaceStylePaths.map((path) => readFileSync(path, 'utf8')).join('\n')
}

export function requireSpriteModelFunction(name: string): ExportedFunction {
  const exported = spriteModel as Record<string, unknown>
  const fn = exported[name]
  assert.equal(typeof fn, 'function', `${name} should be exported from sprite workspace model`)
  return fn as ExportedFunction
}
