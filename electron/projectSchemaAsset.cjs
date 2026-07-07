const sharedSchema = require('../src/components/ProjectStorage/projectSchemaShared.cjs')

function createProjectAssetSchemaSql(options) {
  return sharedSchema.createProjectAssetSchemaSql(options)
}

function createProjectAssetSchemaIndexes() {
  return sharedSchema.createProjectAssetSchemaIndexes()
}

module.exports = {
  createProjectAssetSchemaIndexes,
  createProjectAssetSchemaSql,
}
