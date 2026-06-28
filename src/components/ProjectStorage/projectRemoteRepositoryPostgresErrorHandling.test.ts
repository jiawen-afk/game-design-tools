import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { inspect } from 'node:util'

import { createPostgresProjectRepository } from './projectRemoteRepositoryPostgresTestHelpers.test'

test('remote project repository swallows late PostgreSQL connection error events after query failures', async () => {
  const uncaughtErrors: Error[] = []
  const client = new EventEmitter()
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => ({
      connect: async () => {},
      query: async () => {
        const error = new Error('Connection terminated unexpectedly')
        setImmediate(() => {
          client.emit('error', error)
        })
        throw error
      },
      end: async () => {},
      on: client.on.bind(client),
    }),
  })

  process.setUncaughtExceptionCaptureCallback((error) => {
    uncaughtErrors.push(error as Error)
  })
  try {
    await assert.rejects(repository.getProject('p1'), /远程数据库连接已中断，请检查网络或数据库服务后重试。/)
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    assert.deepEqual(uncaughtErrors, [])
  } finally {
    process.setUncaughtExceptionCaptureCallback(null)
  }
})

test('remote project repository reports exhausted PostgreSQL drops without exposing pg error cause', async () => {
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => ({
      connect: async () => {},
      query: async () => {
        throw new Error('Connection terminated unexpectedly')
      },
      end: async () => {},
    }),
  })

  await assert.rejects(
    repository.getProject('p1'),
    (error: unknown) => {
      assert.equal((error as Error).message, '远程数据库连接已中断，请检查网络或数据库服务后重试。')
      assert.equal('cause' in (error as Error), false)
      assert.doesNotMatch(inspect(error), /Connection terminated unexpectedly/)
      return true
    },
  )
})
