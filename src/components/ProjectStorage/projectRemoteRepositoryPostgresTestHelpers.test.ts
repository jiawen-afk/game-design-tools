import {
  createRemoteProjectRepository,
  databaseProfile,
  postgresqlPayload,
  type RemoteRepositoryTestOptions,
} from './projectRemoteRepositoryTestHelpers.test'

export type RemoteProjectReadResult = {
  project: { id: string }
  settings: { database_provider: string }
}

export function createPostgresProjectRepository(options: RemoteRepositoryTestOptions) {
  return createRemoteProjectRepository(databaseProfile(postgresqlPayload), options)
}

export function remoteProjectRowsForStatement(statement: string) {
  if (/FROM projects/i.test(statement)) {
    return {
      rows: [{
        id: 'p1',
        name: '远程项目',
        description: '团队资产',
        mode: 'remote',
      }],
    }
  }
  if (/FROM project_settings/i.test(statement)) {
    return {
      rows: [{
        project_id: 'p1',
        storage_provider: 'qiniu_kodo',
        database_provider: 'postgresql',
      }],
    }
  }
  return { rows: [] }
}
