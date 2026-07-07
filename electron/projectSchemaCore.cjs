const sharedSchema = require('../src/components/ProjectStorage/projectSchemaShared.cjs')

function createProjectCoreSchemaSql(options) {
  return sharedSchema.createProjectCoreSchemaSql(options)
}

function createProjectLifecycleSchemaSql(options) {
  return sharedSchema.createProjectLifecycleSchemaSql(options)
}

module.exports = {
  createProjectCoreSchemaSql,
  createProjectLifecycleSchemaSql,
}
