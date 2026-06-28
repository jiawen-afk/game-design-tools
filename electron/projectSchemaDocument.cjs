function createProjectDocumentSchemaSql({ documentContent, json }) {
  return [
    `CREATE TABLE IF NOT EXISTS document_collections (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      description text not null default '',
      source_type text not null,
      status text not null,
      record_count integer not null default 0,
      node_count integer not null default 0,
      edge_count integer not null default 0,
      created_at text not null,
      updated_at text not null,
      imported_at text null,
      metadata_json ${json} null,
      UNIQUE (project_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS document_sources (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      role text not null,
      file_name text not null,
      mime_group text not null,
      mime_type text not null,
      extension text not null,
      size_bytes integer not null default 0,
      hash_sha256 text null,
      encoding text not null default 'utf-8',
      created_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, role, file_name)
    )`,
    `CREATE TABLE IF NOT EXISTS document_source_contents (
      source_id text primary key references document_sources(id) on delete cascade,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      content_text ${documentContent} not null,
      content_encoding text not null default 'utf-8',
      size_bytes integer not null default 0,
      hash_sha256 text null,
      created_at text not null,
      metadata_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS document_records (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      source_id text not null references document_sources(id) on delete cascade,
      external_id text not null,
      record_type text not null default '',
      title text not null,
      description text not null default '',
      category_1 text null,
      category_2 text null,
      category_3 text null,
      place_path text null,
      book_title text null,
      chapter_title text null,
      version_title text null,
      usage_text text null,
      effect_text text null,
      source_url text null,
      search_text text not null default '',
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_nodes (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      external_id text not null,
      node_type text not null,
      label text not null,
      description text not null default '',
      search_text text not null default '',
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_edges (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      external_id text not null,
      source_node_id text not null references document_nodes(id) on delete cascade,
      target_node_id text not null references document_nodes(id) on delete cascade,
      edge_type text not null,
      label text not null default '',
      weight real not null default 1,
      source_kind text not null default '',
      created_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_node_record_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      node_id text not null references document_nodes(id) on delete cascade,
      record_id text not null references document_records(id) on delete cascade,
      link_role text not null default 'related',
      created_at text not null,
      UNIQUE (project_id, node_id, record_id, link_role)
    )`,
    `CREATE TABLE IF NOT EXISTS document_edge_record_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      edge_id text not null references document_edges(id) on delete cascade,
      record_id text not null references document_records(id) on delete cascade,
      created_at text not null,
      UNIQUE (project_id, edge_id, record_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_import_runs (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text null references document_collections(id) on delete set null,
      source_type text not null,
      status text not null,
      started_at text not null,
      finished_at text null,
      total_records integer not null default 0,
      total_nodes integer not null default 0,
      total_edges integer not null default 0,
      imported_records integer not null default 0,
      imported_nodes integer not null default 0,
      imported_edges integer not null default 0,
      error_message text null,
      report_json ${json} null
    )`,
  ]
}

function createProjectDocumentSchemaIndexes({ extended = true } = {}) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_document_collections_project_status ON document_collections(project_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_document_collections_project_source_type ON document_collections(project_id, source_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_sources_project_collection ON document_sources(project_id, collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_sources_project_role ON document_sources(project_id, role)',
    'CREATE INDEX IF NOT EXISTS idx_document_source_contents_project_collection ON document_source_contents(project_id, collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_type ON document_records(project_id, collection_id, record_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_title ON document_records(project_id, collection_id, title)',
  ]
  if (extended) {
    indexes.push(
      'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_1 ON document_records(project_id, collection_id, category_1)',
      'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_2 ON document_records(project_id, collection_id, category_2)',
      'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_3 ON document_records(project_id, collection_id, category_3)',
    )
  }
  indexes.push(
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_type ON document_nodes(project_id, collection_id, node_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_label ON document_nodes(project_id, collection_id, label)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_source ON document_edges(project_id, collection_id, source_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_target ON document_edges(project_id, collection_id, target_node_id)',
  )
  if (extended) {
    indexes.push('CREATE INDEX IF NOT EXISTS idx_document_edges_project_type ON document_edges(project_id, collection_id, edge_type)')
  }
  indexes.push('CREATE INDEX IF NOT EXISTS idx_document_node_record_links_node ON document_node_record_links(project_id, collection_id, node_id)')
  if (extended) {
    indexes.push('CREATE INDEX IF NOT EXISTS idx_document_node_record_links_record ON document_node_record_links(project_id, collection_id, record_id)')
  }
  indexes.push('CREATE INDEX IF NOT EXISTS idx_document_edge_record_links_edge ON document_edge_record_links(project_id, collection_id, edge_id)')
  if (extended) {
    indexes.push(
      'CREATE INDEX IF NOT EXISTS idx_document_edge_record_links_record ON document_edge_record_links(project_id, collection_id, record_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_status ON document_import_runs(project_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_collection ON document_import_runs(project_id, collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_started ON document_import_runs(project_id, started_at)',
    )
  }
  return indexes
}

module.exports = {
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
}
