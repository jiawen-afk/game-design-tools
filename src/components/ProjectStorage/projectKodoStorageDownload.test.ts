import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { downloadBuffer } from './projectKodoStorageTestHelpers.test'

test('kodo object download supports http access domains', async () => {
  const server = http.createServer((_request, response) => {
    response.end('voice-bytes')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const data = await downloadBuffer(`http://127.0.0.1:${address.port}/objects/p1/audio_wav/r1.wav`)

    assert.equal(data.toString('utf8'), 'voice-bytes')
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
})
