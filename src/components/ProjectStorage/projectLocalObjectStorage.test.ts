import test from 'node:test'
import assert from 'node:assert/strict'

import { buildProjectObjectKey } from './projectStorageModel'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'

test('local object storage writes, reads, and deletes objects by provider-neutral keys', async () => {
  const storage = createMemoryProjectObjectStorage()
  const key = buildProjectObjectKey({ projectId: 'p1', mimeGroup: 'image', resourceId: 'r1', extension: 'png' })

  await storage.putObject(key, new Blob(['hello'], { type: 'image/png' }))
  const read = await storage.getObject(key)
  assert.equal(await read.text(), 'hello')

  await storage.deleteObject(key)
  await assert.rejects(() => storage.getObject(key), /对象不存在/)
})

test('local object storage records failed delete keys for project cleanup', async () => {
  const storage = createMemoryProjectObjectStorage({ failDeleteKeys: new Set(['objects/p1/image/r1.png']) })
  await storage.putObject('objects/p1/image/r1.png', new Blob(['hello']))

  const result = await storage.deleteObjects(['objects/p1/image/r1.png', 'objects/p1/image/r2.png'])

  assert.deepEqual(result.deletedKeys, ['objects/p1/image/r2.png'])
  assert.deepEqual(result.failed, [{ objectKey: 'objects/p1/image/r1.png', errorMessage: '删除对象失败' }])
})
