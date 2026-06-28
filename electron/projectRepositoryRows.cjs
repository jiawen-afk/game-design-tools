function createProjectStorageId() {
  const random = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}_${random}`
}

function sanitizeObjectKeyPart(value) {
  return (String(value || '').trim() || 'unnamed').replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
}

function normalizeBooleanRow(row) {
  if (!row) return row
  const next = { ...row }
  for (const key of ['starred']) {
    if (key in next) next[key] = Boolean(next[key])
  }
  return next
}

function createProjectRows(input) {
  const id = createProjectStorageId()
  const name = String(input.name || '').trim() || '未命名项目'
  const project = {
    id,
    name,
    description: String(input.description || '').trim(),
    mode: 'local',
    status: 'active',
    object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
  const settings = {
    project_id: id,
    storage_provider: 'local',
    database_provider: 'sqlite',
    local_object_root: input.localObjectRoot,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: null,
    updated_at: input.now,
  }
  return { project, settings }
}

function createRemoteProjectRows(input) {
  const id = input.id || createProjectStorageId()
  const name = String(input.name || '').trim() || '未命名项目'
  const project = {
    id,
    name,
    description: String(input.description || '').trim(),
    mode: 'remote',
    status: 'active',
    object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
  const settings = {
    project_id: id,
    storage_provider: 'qiniu_kodo',
    database_provider: input.databaseProvider,
    local_object_root: null,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: input.now,
    updated_at: input.now,
  }
  return { project, settings }
}

module.exports = {
  createProjectRows,
  createRemoteProjectRows,
  normalizeBooleanRow,
}
