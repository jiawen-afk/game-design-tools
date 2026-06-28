import test from 'node:test'
import assert from 'node:assert/strict'

import { applyComposedFrameUrl } from './frameCompositionModel'

test('composed url replacement does not revoke the new url for unrelated frames', () => {
  const revoked: string[] = []
  const frames = [
    { id: 'a', matteRevision: 1, composedUrl: 'blob:old-a' },
    { id: 'b', matteRevision: 2, composedUrl: 'blob:old-b' },
  ]

  const next = applyComposedFrameUrl(frames, {
    id: 'b',
    matteRevision: 2,
    url: 'blob:new-b',
    revoke: (url) => revoked.push(url),
  })

  assert.equal(next[0]?.composedUrl, 'blob:old-a')
  assert.equal(next[1]?.composedUrl, 'blob:new-b')
  assert.deepEqual(revoked, ['blob:old-b'])
})
