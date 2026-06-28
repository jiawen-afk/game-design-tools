import test from 'node:test'
import assert from 'node:assert/strict'

import { filterNewUploadFiles } from './spriteUploadFilterModel'

test('upload filtering ignores files that already exist or are pending', () => {
  const a = { name: 'a.png', size: 100, lastModified: 1 } as File
  const b = { name: 'b.png', size: 200, lastModified: 2 } as File
  const c = { name: 'c.png', size: 300, lastModified: 3 } as File
  const pending = new Set([`${b.name}-${b.size}-${b.lastModified}`])

  assert.deepEqual(
    filterNewUploadFiles([a, b, c], {
      existingKeys: new Set([`${a.name}-${a.size}-${a.lastModified}`]),
      pendingKeys: pending,
    }),
    [c]
  )
})
