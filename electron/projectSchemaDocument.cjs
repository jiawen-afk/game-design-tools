const sharedSchema = require('../src/components/ProjectStorage/projectSchemaShared.cjs')

function createProjectDocumentSchemaSql(options) {
  return sharedSchema.createProjectDocumentSchemaSql(options)
}

function createProjectDocumentSchemaIndexes(options) {
  return sharedSchema.createProjectDocumentSchemaIndexes(options)
}

module.exports = {
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
}
