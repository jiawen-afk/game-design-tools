const {
  rowSetTables,
  tableDefinitions,
} = require('./projectStorageTables.cjs')

const maxBatchParameters = 12000

function parameter(dialect, index) {
  return dialect === 'postgresql' ? `$${index}` : '?'
}

function buildUpsertSql(dialect, tableName, definition) {
  return buildBulkUpsertSql(dialect, tableName, definition, 1)
}

function buildBulkUpsertSql(dialect, tableName, definition, rowCount) {
  const columns = definition.columns
  const values = Array.from({ length: rowCount }, (_row, rowIndex) => {
    const offset = rowIndex * columns.length
    return `(${columns.map((_column, columnIndex) => parameter(dialect, offset + columnIndex + 1)).join(', ')})`
  }).join(', ')
  const updateColumns = columns.filter((column) => !definition.conflictColumns.includes(column))
  if (dialect === 'postgresql') {
    return [
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`,
      `ON CONFLICT (${definition.conflictColumns.join(', ')}) DO UPDATE SET`,
      updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', '),
    ].join(' ')
  }
  return [
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`,
    'ON DUPLICATE KEY UPDATE',
    updateColumns.map((column) => `${column} = VALUES(${column})`).join(', '),
  ].join(' ')
}

function isJsonBindableValue(value) {
  if (value === null || typeof value !== 'object') return false
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeSqlValue(value) {
  if (value === undefined) return null
  if (isJsonBindableValue(value)) return JSON.stringify(value)
  return value
}

function rowValues(definition, row) {
  return definition.columns.map((column) => normalizeSqlValue(row[column]))
}

async function upsertRow(runner, tableName, row) {
  const definition = tableDefinitions[tableName]
  await runner.execute(
    buildUpsertSql(runner.dialect, tableName, definition),
    rowValues(definition, row),
  )
}

async function upsertRows(runner, tableName, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return
  const definition = tableDefinitions[tableName]
  const batchSize = Math.max(1, Math.floor(maxBatchParameters / definition.columns.length))
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    await runner.execute(
      buildBulkUpsertSql(runner.dialect, tableName, definition, batch.length),
      batch.flatMap((row) => rowValues(definition, row)),
    )
  }
}

function selectSql(dialect, tableName, whereColumn) {
  const definition = tableDefinitions[tableName]
  return `SELECT ${definition.columns.join(', ')} FROM ${tableName} WHERE ${whereColumn} = ${parameter(dialect, 1)}`
}

async function deleteProjectRows(runner, projectId) {
  for (const [, tableName] of [...rowSetTables].reverse()) {
    await runner.execute(`DELETE FROM ${tableName} WHERE project_id = ${parameter(runner.dialect, 1)}`, [projectId])
  }
  await runner.execute(`DELETE FROM project_settings WHERE project_id = ${parameter(runner.dialect, 1)}`, [projectId])
  await runner.execute(`DELETE FROM projects WHERE id = ${parameter(runner.dialect, 1)}`, [projectId])
}

module.exports = {
  buildBulkUpsertSql,
  buildUpsertSql,
  deleteProjectRows,
  parameter,
  rowSetTables,
  selectSql,
  tableDefinitions,
  upsertRow,
  upsertRows,
}
