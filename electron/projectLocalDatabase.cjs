const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const initSqlJs = require('sql.js')
const { tableDefinitions } = require('./projectRemoteRepositorySql.cjs')
const {
  initializeSchemaInDatabase,
} = require('./projectLocalSchema.cjs')

let sqlModulePromise = null

function getSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (fileName) => path.join(path.dirname(require.resolve('sql.js')), fileName),
    })
  }
  return sqlModulePromise
}

async function openDatabase(databasePath) {
  const SQL = await getSqlModule()
  if (!fs.existsSync(databasePath)) return new SQL.Database()
  return new SQL.Database(await fsp.readFile(databasePath))
}

async function saveDatabase(databasePath, database) {
  await fsp.mkdir(path.dirname(databasePath), { recursive: true })
  await fsp.writeFile(databasePath, Buffer.from(database.export()))
}

function parameterList(count) {
  return Array.from({ length: count }, () => '?').join(', ')
}

function buildSqliteUpsertSql(tableName, definition) {
  const columns = definition.columns
  const updateColumns = columns.filter((column) => !definition.conflictColumns.includes(column))
  return [
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${parameterList(columns.length)})`,
    `ON CONFLICT (${definition.conflictColumns.join(', ')}) DO UPDATE SET`,
    updateColumns.map((column) => `${column} = excluded.${column}`).join(', '),
  ].join(' ')
}

function isJsonBindableValue(value) {
  if (value === null || typeof value !== 'object') return false
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeSqliteValue(value) {
  if (value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (isJsonBindableValue(value)) return JSON.stringify(value)
  return value
}

function rowValues(definition, row) {
  return definition.columns.map((column) => normalizeSqliteValue(row[column]))
}

function upsertRow(database, tableName, row) {
  const definition = tableDefinitions[tableName]
  database.run(buildSqliteUpsertSql(tableName, definition), rowValues(definition, row))
}

function upsertRows(database, tableName, rows) {
  for (const row of rows) upsertRow(database, tableName, row)
}

function allRows(database, statement, params = []) {
  const prepared = database.prepare(statement)
  try {
    prepared.bind(params)
    const rows = []
    while (prepared.step()) rows.push(prepared.getAsObject())
    return rows
  } finally {
    prepared.free()
  }
}

function firstRow(database, statement, params = []) {
  return allRows(database, statement, params)[0] || null
}

function selectColumns(tableName) {
  return tableDefinitions[tableName].columns.join(', ')
}

async function withDatabase(databasePath, options, callback) {
  const database = await openDatabase(databasePath)
  let shouldSave = false
  try {
    database.run('PRAGMA foreign_keys = ON')
    const result = await callback(database, () => { shouldSave = true })
    if (shouldSave || options?.save) await saveDatabase(databasePath, database)
    return result
  } finally {
    database.close()
  }
}

async function withWriteTransaction(databasePath, callback) {
  return withDatabase(databasePath, { save: true }, async (database, markDirty) => {
    initializeSchemaInDatabase(database)
    database.run('BEGIN')
    try {
      const result = await callback(database)
      database.run('COMMIT')
      markDirty()
      return result
    } catch (error) {
      database.run('ROLLBACK')
      throw error
    }
  })
}

module.exports = {
  allRows,
  firstRow,
  getSqlModule,
  openDatabase,
  selectColumns,
  upsertRow,
  upsertRows,
  withDatabase,
  withWriteTransaction,
}
