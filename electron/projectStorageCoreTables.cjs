const coreTableDefinitions = {
  projects: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'name',
      'description',
      'mode',
      'status',
      'object_key_prefix',
      'created_at',
      'updated_at',
      'metadata_json',
    ],
  },
  project_settings: {
    conflictColumns: ['project_id'],
    columns: [
      'project_id',
      'storage_provider',
      'database_provider',
      'local_object_root',
      'remote_database_profile_id',
      'remote_storage_profile_id',
      'last_verified_at',
      'updated_at',
    ],
  },
  deleted_project_cleanup_tasks: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'storage_provider',
      'object_key',
      'status',
      'error_message',
      'created_at',
      'updated_at',
    ],
  },
}

module.exports = {
  coreTableDefinitions,
}
