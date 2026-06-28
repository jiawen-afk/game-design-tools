class LocalDeviceBindingRepository {
  constructor(context) {
    this.context = context
  }

  async list() {
    const {
      allRows,
      databasePath,
      initializeSchemaInDatabase,
      withDatabase,
    } = this.context
    return withDatabase(databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const rows = allRows(
        database,
        'SELECT project_id, database_profile_id, storage_profile_id FROM project_device_bindings ORDER BY project_id ASC',
      )
      return Object.fromEntries(rows.map((row) => [
        row.project_id,
        {
          databaseProfileId: row.database_profile_id,
          storageProfileId: row.storage_profile_id,
        },
      ]))
    })
  }

  async write(projectId, binding) {
    const {
      databasePath,
      withWriteTransaction,
    } = this.context
    const normalizedProjectId = String(projectId || '').trim()
    const databaseProfileId = String(binding?.databaseProfileId || '').trim()
    const storageProfileId = String(binding?.storageProfileId || '').trim()
    if (!normalizedProjectId || !databaseProfileId || !storageProfileId) return
    const now = new Date().toISOString()
    await withWriteTransaction(databasePath, async (database) => {
      database.run(
        [
          'INSERT INTO project_device_bindings',
          '(project_id, database_profile_id, storage_profile_id, bound_at, updated_at)',
          'VALUES (?, ?, ?, ?, ?)',
          'ON CONFLICT (project_id) DO UPDATE SET',
          'database_profile_id = excluded.database_profile_id,',
          'storage_profile_id = excluded.storage_profile_id,',
          'updated_at = excluded.updated_at',
        ].join(' '),
        [normalizedProjectId, databaseProfileId, storageProfileId, now, now],
      )
    })
  }

  async clear(projectId) {
    const {
      databasePath,
      withWriteTransaction,
    } = this.context
    const normalizedProjectId = String(projectId || '').trim()
    if (!normalizedProjectId) return
    await withWriteTransaction(databasePath, async (database) => {
      database.run('DELETE FROM project_device_bindings WHERE project_id = ?', [normalizedProjectId])
    })
  }
}

function createLocalDeviceBindingRepository(context) {
  return new LocalDeviceBindingRepository(context)
}

module.exports = {
  LocalDeviceBindingRepository,
  createLocalDeviceBindingRepository,
}
