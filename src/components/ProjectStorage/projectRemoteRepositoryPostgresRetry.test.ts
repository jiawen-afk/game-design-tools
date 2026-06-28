import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import {
  createPostgresProjectRepository,
  remoteProjectRowsForStatement,
  type RemoteProjectReadResult,
} from './projectRemoteRepositoryPostgresTestHelpers.test'

test('remote project repository retries PostgreSQL connect after a dropped connection', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      return {
        connect: async () => {
          events.push(`connect:${currentClient}`)
          if (currentClient === 1) throw new Error('Connection terminated unexpectedly')
        },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          return remoteProjectRowsForStatement(statement)
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as RemoteProjectReadResult

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})

test('remote project repository retries PostgreSQL reads after a dropped connection', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          if (currentClient === 1) throw new Error('Connection terminated unexpectedly')
          return remoteProjectRowsForStatement(statement)
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as RemoteProjectReadResult

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})

test('remote project repository retries PostgreSQL reads after client becomes non-queryable', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      let queryCount = 0
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          queryCount += 1
          events.push(`query:${currentClient}:${queryCount}`)
          if (currentClient === 1 && queryCount === 2) {
            throw new Error('Client has encountered a connection error and is not queryable')
          }
          return remoteProjectRowsForStatement(statement)
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as RemoteProjectReadResult

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1:1',
    'query:1:2',
    'end:1',
    'connect:2',
    'query:2:1',
    'query:2:2',
    'end:2',
  ])
})

test('remote project repository retries after a PostgreSQL client emits a background connection error before the next query', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createPostgresProjectRepository({
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      const client = new EventEmitter()
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          if (currentClient === 1 && /FROM projects/i.test(statement)) {
            client.emit('error', new Error('Connection terminated unexpectedly'))
            return remoteProjectRowsForStatement(statement)
          }
          if (currentClient === 1) {
            throw new Error('Client has encountered a connection error and is not queryable')
          }
          return remoteProjectRowsForStatement(statement)
        },
        end: async () => { events.push(`end:${currentClient}`) },
        on: client.on.bind(client),
      }
    },
  })

  const result = await repository.getProject('p1') as RemoteProjectReadResult

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})
