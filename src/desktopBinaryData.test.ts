import test from 'node:test'
import assert from 'node:assert/strict'

import { blobFromDesktopBinaryData, copyDesktopBinaryData } from './desktopBinaryData'

test('desktop binary helper copies ArrayBuffer without sharing mutable memory', () => {
  const source = new Uint8Array([1, 2, 3]).buffer
  const copied = copyDesktopBinaryData(source)

  new Uint8Array(source)[0] = 9

  assert.deepEqual(Array.from(copied), [1, 2, 3])
})

test('desktop binary helper respects typed array byte offsets', () => {
  const source = new Uint8Array([9, 4, 5, 6, 9]).subarray(1, 4)

  assert.deepEqual(Array.from(copyDesktopBinaryData(source)), [4, 5, 6])
})

test('desktop binary helper converts Buffer-like IPC payloads to typed blobs', async () => {
  const blob = blobFromDesktopBinaryData(Buffer.from('voice'), 'audio/wav')

  assert.equal(blob.type, 'audio/wav')
  assert.equal(await blob.text(), 'voice')
})
