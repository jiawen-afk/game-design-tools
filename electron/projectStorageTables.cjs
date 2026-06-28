const { coreTableDefinitions } = require('./projectStorageCoreTables.cjs')
const {
  assetRowSetTables,
  assetTableDefinitions,
} = require('./projectStorageAssetTables.cjs')
const {
  documentRowSetTables,
  documentTableDefinitions,
} = require('./projectStorageDocumentTables.cjs')

const tableDefinitions = {
  ...coreTableDefinitions,
  ...assetTableDefinitions,
  ...documentTableDefinitions,
}

const rowSetTables = [
  ...assetRowSetTables,
  ...documentRowSetTables,
]

module.exports = {
  rowSetTables,
  tableDefinitions,
}
