import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  dequeueNextInactiveFrameId,
  queueUniqueFrameId,
  resolvePipelineConcurrency,
} from './model'

test('sprite matte pipeline uses FrameRonin chroma key feather units', () => {
  const pipeline = readFileSync('src/components/MultiFrameSpriteWorkspace/spriteMattePipeline.ts', 'utf8')

  assert.match(pipeline, /computeChromaKeyAlpha/)
  assert.doesNotMatch(pipeline, /50\s*\+\s*\(matte\.smoothness\s*\/\s*100\)\s*\*\s*120/)
})

test('pipeline queues keep the latest request for a frame id', () => {
  assert.deepEqual(queueUniqueFrameId(['a', 'b', 'a'], 'b'), ['a', 'a', 'b'])
  assert.deepEqual(queueUniqueFrameId(['a', 'b'], 'c'), ['a', 'b', 'c'])
})

test('pipeline queues dequeue the first inactive frame id without reordering pending work', () => {
  assert.deepEqual(
    dequeueNextInactiveFrameId(['a', 'b', 'c'], new Set(['a'])),
    { id: 'b', queue: ['a', 'c'] }
  )
  assert.deepEqual(
    dequeueNextInactiveFrameId(['a', 'b'], new Set(['a', 'b'])),
    { id: null, queue: ['a', 'b'] }
  )
})

test('pipeline concurrency scales with available threads', () => {
  assert.equal(resolvePipelineConcurrency(undefined), 4)
  assert.equal(resolvePipelineConcurrency(4), 2)
  assert.equal(resolvePipelineConcurrency(8), 4)
  assert.equal(resolvePipelineConcurrency(16), 6)
})
