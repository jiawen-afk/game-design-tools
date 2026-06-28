import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveMatteImageSource } from './imageProcessingModel'

test('image processing workspace resolves the active image source from matte state', () => {
  const draft = { url: 'blob://source', width: 320, height: 180 }
  const processed = { url: 'blob://matte', width: 320, height: 180 }

  assert.equal(resolveMatteImageSource(draft, processed, true), processed)
  assert.equal(resolveMatteImageSource(draft, processed, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, true), null)
})
