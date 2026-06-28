import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'

export function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

export function createRemoteRows(): LegacyProjectRows {
  return {
    project: {
      id: 'project-a',
      name: '山海再就业',
      description: '',
      mode: 'remote',
      status: 'active',
      object_key_prefix: 'objects/山海再就业',
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
      metadata_json: null,
    },
    settings: {
      project_id: 'project-a',
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: '/remote/cache',
      remote_database_profile_id: 'db-profile',
      remote_storage_profile_id: 'kodo-profile',
      last_verified_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    assetGroups: [],
    assets: [],
    characters: [],
    characterAssetLinks: [],
    storyboardGroups: [],
    storyboardVoiceEntries: [],
    assetRelations: [],
  }
}

export function createLocalRows(): LegacyProjectRows {
  const rows = createRemoteRows()
  return {
    ...rows,
    project: {
      ...rows.project,
      mode: 'local',
      object_key_prefix: 'objects/本地项目',
    },
    settings: {
      ...rows.settings,
      storage_provider: 'local',
      database_provider: 'sqlite',
      local_object_root: 'D:\\GameAssets',
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: null,
    },
  }
}
