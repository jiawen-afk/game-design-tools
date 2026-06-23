import test from 'node:test'
import assert from 'node:assert/strict'

import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'

test('desktop remote project repository resolves database profile per project operation', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async (databaseProfileId: string) => {
        events.push(`list:${databaseProfileId}`)
        return []
      },
      getRemoteProject: async (projectId: string, databaseProfileId: string) => {
        events.push(`get:${projectId}:${databaseProfileId}`)
        return null
      },
      updateRemoteProject: async (projectId: string, _input: unknown, databaseProfileId: string) => {
        events.push(`update:${projectId}:${databaseProfileId}`)
        return null
      },
      exportRemoteProjectRows: async (projectId: string, databaseProfileId: string) => {
        events.push(`export:${projectId}:${databaseProfileId}`)
        return null
      },
      listRemoteProjectAssets: async (projectId: string, databaseProfileId: string) => {
        events.push(`assets:${projectId}:${databaseProfileId}`)
        return []
      },
      deleteRemoteProject: async (projectId: string, databaseProfileId: string) => {
        events.push(`delete:${projectId}:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-ui-db'
      return projectId === 'project-a' ? 'db-a' : 'db-b'
    })

    await repository.listProjects()
    await repository.getProject('project-a')
    await repository.updateProject('project-b', { name: 'B', description: '', updatedAt: '2026-06-23T00:00:00.000Z' })
    await repository.exportProjectRows('project-a')
    await repository.listAssets('project-b')
    await repository.deleteProject('project-a')

    assert.deepEqual(events, [
      'list:current-ui-db',
      'get:project-a:db-a',
      'update:project-b:db-b',
      'export:project-a:db-a',
      'assets:project-b:db-b',
      'delete:project-a:db-a',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})
