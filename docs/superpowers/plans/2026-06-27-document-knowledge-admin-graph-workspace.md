# Document Knowledge Admin Graph Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有知识库模块上完成源文件内容入库，并把知识库工作区改为参考 `D:\devgame\山海再就业\services\admin` 的三栏图谱交互。

**Architecture:** 继续沿用当前 `DocumentWorkspace` 和 `ProjectRepository` 边界，先补数据库源内容表和集合图谱投影，再把 admin 的过滤、类目树、聚焦、详情和 ECharts option 下沉到纯 model。React hook 只编排状态和 repository 调用，UI 拆成顶部集合栏、左侧过滤、中间列表/图谱、右侧详情四个可替换组件。

**Tech Stack:** React 19、TypeScript、Ant Design 6、ECharts 6、Electron IPC、sql.js SQLite、本地 SQLite、远程 PostgreSQL/MySQL、Node `tsx --test`。

## Global Constraints

- 用户界面、错误提示和新增文档使用中文。
- 第一版只支持导入 `entity_graph.json`，不兼容 `graph.json`。
- 第一版不做角色、剧情组或资产到知识库的关联。
- 数据库保存源文件元数据、指纹和源文件内容；源文件内容进入独立 `document_source_contents` 表。
- 原始 JSON 不进入 `metadata_json`，也不进入记录、节点或边表。
- `document_source_contents.content_text` 必须能容纳 24 MB 级别 JSON：SQLite `text`，PostgreSQL `text`，MySQL `longtext`。
- 普通知识库 UI 不展示 `entity_graph.json · 24167 KB · 19d6d56697` 这类源文件摘要。
- 普通知识库 UI 不读取 `document_source_contents.content_text`。
- 知识库工作区采用三栏布局：左侧过滤控制，中间列表或图谱画布，右侧详情。
- 无聚焦节点时中间区域显示列表；选中节点后进入 ECharts 图谱模式。
- 聚焦状态下暂时忽略关键词过滤，并显示提示。
- 第一版不把 `focus` 和 `record` 同步到 URL。
- `shjGraphImportAdapter` 是唯一包含山海经图谱输入结构假设的模块。
- 图谱过滤、聚焦、类目树和 ECharts option 逻辑放在纯 model 文件，不放进 React 组件。
- 每个生产代码切片先写失败测试，再实现，最后运行覆盖该切片的测试。
- 当前工作树已有未提交知识库改动；每个任务提交时只 `git add` 本任务列出的文件。

---

## File Structure

- Modify `src/components/ProjectStorage/projectStorageTypes.ts`: 增加 `DocumentSourceContent`、`DocumentCollectionGraph`、`DocumentGraphNode`、`DocumentGraphEdge`，扩展 `ReplaceDocumentGraphInput` 和 `ProjectRepository`。
- Modify `src/components/ProjectStorage/projectSchema.ts`: 增加 `document_source_contents` 表、索引和 MySQL `longtext` 类型处理。
- Modify `src/components/ProjectStorage/projectLegacyMigration.ts`: 在 `LegacyProjectRows` 中加入 `documentSourceContents`。
- Modify `src/components/ProjectStorage/projectSqliteRepository.ts`: 内存 repository 支持源内容、集合图谱投影、导出导入行集。
- Modify `electron/projectLocalRepository.cjs`: 本地 SQLite schema、源内容读写、集合图谱投影和导出导入。
- Modify `electron/projectRemoteDatabase.cjs`: 远程 schema 生成，MySQL `longtext`。
- Modify `electron/projectRemoteRepository.cjs`: 远程源内容、集合图谱投影、删除顺序、批量 upsert、schema repair。
- Modify `electron/projectStorageIpcHandlers.cjs`: 注册本地和远程 `get-document-source-content`、`get-document-collection-graph` IPC。
- Modify `electron/preload.cjs`: 暴露新增 desktop API。
- Modify `src/desktopApi.ts`: 新增本地和远程方法类型。
- Modify `src/components/ProjectStorage/projectLocalRepositoryProxy.ts`: 本地桌面代理转发新增方法。
- Modify `src/components/ProjectStorage/projectRemoteRepositoryProxy.ts`: 远程桌面代理带 profile 解析后转发新增方法。
- Modify `src/components/DocumentWorkspace/documentKnowledgeTypes.ts`: 扩展导入行类型，增加源内容输入类型。
- Modify `src/components/DocumentWorkspace/documentKnowledgeImportService.ts`: 导入时写入 `sourceContents`。
- Create `src/components/DocumentWorkspace/documentGraphViewModel.ts`: admin 风格图谱模型、过滤、类目树、聚焦、详情和 ECharts option。
- Modify `src/components/DocumentWorkspace/documentWorkspaceTypes.ts`: 扩展工作区状态和事件。
- Modify `src/components/DocumentWorkspace/useDocumentWorkspace.ts`: 加载集合图谱投影，维护 filter/focus/list/graph 状态。
- Create `src/components/DocumentWorkspace/DocumentCollectionToolbar.tsx`: 当前集合、导入、删除、刷新、统计。
- Create `src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx`: 左侧过滤控制。
- Create `src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx`: 中间列表和 ECharts 图谱。
- Create `src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx`: 右侧详情和邻居聚焦。
- Modify `src/components/DocumentWorkspace/DocumentWorkspace.tsx`: 组合新三栏组件。
- Delete or stop using `src/components/DocumentWorkspace/DocumentBrowserPanel.tsx` after replacement.
- Modify `src/components/DocumentWorkspace/DocumentGraphPanel.tsx`: 若逻辑迁移到 `DocumentGraphCanvasPanel.tsx`，删除或保留为内部 ECharts renderer。
- Modify `src/components/DocumentWorkspace/documentWorkspace.css`: 三栏布局、响应式、列表、过滤、详情。
- Modify `src/appStructure.test.ts`: 新增结构守卫。
- Modify `package.json`: 把新增 `documentGraphViewModel.test.ts` 和组件渲染测试加入 `npm test`。

Tests to add or modify:

- Modify `src/components/ProjectStorage/projectStorageModel.test.ts`
- Modify `src/components/ProjectStorage/projectSqliteRepository.test.ts`
- Modify `src/components/ProjectStorage/projectLocalSqliteRepository.test.ts`
- Modify `src/components/ProjectStorage/projectRemoteDatabase.test.ts`
- Modify `src/components/ProjectStorage/projectRemoteRepository.test.ts`
- Modify `src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts`
- Modify `src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts`
- Create `src/components/DocumentWorkspace/documentGraphViewModel.test.ts`
- Create `src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx`

---

### Task 1: Source Content Schema And Types

**Files:**
- Modify: `src/components/ProjectStorage/projectStorageTypes.ts`
- Modify: `src/components/ProjectStorage/projectSchema.ts`
- Modify: `src/components/ProjectStorage/projectLegacyMigration.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Test: `src/components/ProjectStorage/projectStorageModel.test.ts`
- Test: `src/components/ProjectStorage/projectSqliteRepository.test.ts`

**Interfaces:**
- Produces:
  - `DocumentSourceContent`
  - `DocumentCollectionGraph`
  - `DocumentGraphNode`
  - `DocumentGraphEdge`
  - `ReplaceDocumentGraphInput.sourceContents: DocumentSourceContent[]`
  - `ProjectRepository.getDocumentSourceContent(projectId: string, sourceId: string): Promise<DocumentSourceContent | null>`
  - `ProjectRepository.getDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph>`
  - `LegacyProjectRows.documentSourceContents?: DocumentSourceContent[]`

- [ ] **Step 1: Write failing schema test**

In `src/components/ProjectStorage/projectStorageModel.test.ts`, replace the old raw-content negative assertion with this concrete source-content assertion:

```ts
test('schema SQL stores document source contents outside source metadata', () => {
  const sqliteSql = createProjectSchemaSql('sqlite').join('\n')
  const postgresSql = createProjectSchemaSql('postgresql').join('\n')
  const mysqlSql = createProjectSchemaSql('mysql').join('\n')

  for (const table of ['document_sources', 'document_source_contents']) {
    assert.equal((PROJECT_SCHEMA_TABLES as readonly string[]).includes(table), true)
  }

  assert.match(sqliteSql, /CREATE TABLE IF NOT EXISTS document_source_contents/i)
  assert.match(sqliteSql, /content_text text not null/i)
  assert.match(sqliteSql, /source_id text primary key references document_sources\(id\) on delete cascade/i)
  assert.match(postgresSql, /content_text text not null/i)
  assert.match(mysqlSql, /content_text longtext not null/i)

  const sourceTable = sqliteSql.match(/CREATE TABLE IF NOT EXISTS document_sources[\s\S]*?\)/i)?.[0] ?? ''
  assert.doesNotMatch(sourceTable, /content_text/i)
  assert.doesNotMatch(sourceTable, /content_blob/i)
})
```

- [ ] **Step 2: Run schema test and verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectStorageModel.test.ts
```

Expected: FAIL mentioning `document_source_contents` or `content_text`.

- [ ] **Step 3: Implement source content types**

In `src/components/ProjectStorage/projectStorageTypes.ts`, add:

```ts
export interface DocumentSourceContent {
  source_id: string
  project_id: string
  collection_id: string
  content_text: string
  content_encoding: string
  size_bytes: number
  hash_sha256: string | null
  created_at: string
  metadata_json: string | null
}

export interface DocumentGraphNode {
  id: string
  label: string
  type: string
  records: string[]
  data: Record<string, unknown>
}

export interface DocumentGraphEdge {
  id: string
  source: string
  target: string
  type: string
  label: string
  weight: number
  record_ids: string[]
  source_kind: string
}

export interface DocumentCollectionGraph {
  nodes: Record<string, DocumentGraphNode>
  edges: Record<string, DocumentGraphEdge>
}
```

Update imports and existing repository types so:

```ts
export interface ReplaceDocumentGraphInput {
  projectId: string
  collection: DocumentCollection
  sources: DocumentSource[]
  sourceContents: DocumentSourceContent[]
  records: DocumentRecord[]
  nodes: DocumentNode[]
  edges: DocumentEdge[]
  nodeRecordLinks: DocumentNodeRecordLink[]
  edgeRecordLinks: DocumentEdgeRecordLink[]
  importRun: DocumentImportRun
}
```

and:

```ts
getDocumentSourceContent(projectId: string, sourceId: string): Promise<DocumentSourceContent | null>
getDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph>
```

- [ ] **Step 4: Implement schema table**

In `src/components/ProjectStorage/projectSchema.ts`, add `document_source_contents` to `PROJECT_SCHEMA_TABLES` after `document_sources`. Add a dialect helper:

```ts
function documentContentType(provider: ProjectDatabaseProvider) {
  return provider === 'mysql' ? 'longtext' : 'text'
}
```

Add the table after `document_sources`:

```ts
`CREATE TABLE IF NOT EXISTS document_source_contents (
  source_id ${text} primary key references document_sources(id) on delete cascade,
  project_id ${text} not null references projects(id) on delete cascade,
  collection_id ${text} not null references document_collections(id) on delete cascade,
  content_text ${documentContentType(provider)} not null,
  content_encoding ${text} not null default 'utf-8',
  size_bytes integer not null default 0,
  hash_sha256 ${text} null,
  created_at ${text} not null,
  metadata_json ${json} null
)`,
```

Add index:

```ts
'CREATE INDEX IF NOT EXISTS idx_document_source_contents_project_collection ON document_source_contents(project_id, collection_id)',
```

- [ ] **Step 5: Write failing row-set test**

In `src/components/ProjectStorage/projectSqliteRepository.test.ts`, extend the existing document row-set test with:

```ts
documentSourceContents: [{
  source_id: 'source-1',
  project_id: project.id,
  collection_id: 'collection-1',
  content_text: '{"nodes":{},"edges":{}}',
  content_encoding: 'utf-8',
  size_bytes: 22,
  hash_sha256: 'hash-1',
  created_at: now,
  metadata_json: null,
}],
```

and assertions:

```ts
assert.deepEqual(exported.documentSourceContents, documentRows.documentSourceContents)
assert.equal('content_text' in documentRows.documentSources[0]!, false)
```

- [ ] **Step 6: Run row-set test and verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectSqliteRepository.test.ts
```

Expected: FAIL because `documentSourceContents` is not exported or imported.

- [ ] **Step 7: Implement memory repository row sets**

In `src/components/ProjectStorage/projectSqliteRepository.ts`:

1. Import `DocumentSourceContent`, `DocumentCollectionGraph`, `DocumentGraphNode`, `DocumentGraphEdge`.
2. Add `private documentSourceContents = new Map<string, DocumentSourceContent[]>()`.
3. Initialize it in `createProject`, `createRemoteProject`, `importProjectRows`, `deleteProject`.
4. Include `documentSourceContents` in `exportProjectRows`.
5. Extend `replaceDocumentGraph`:

```ts
this.deleteDocumentCollectionChildren(input.projectId, input.collection.id)
this.documentCollections.set(input.projectId, [
  ...(this.documentCollections.get(input.projectId) ?? []).filter((collection) => collection.id !== input.collection.id),
  input.collection,
])
this.documentSources.set(input.projectId, [...(this.documentSources.get(input.projectId) ?? []), ...input.sources])
this.documentSourceContents.set(input.projectId, [...(this.documentSourceContents.get(input.projectId) ?? []), ...input.sourceContents])
```

6. Extend `deleteDocumentCollectionChildren`:

```ts
this.documentSourceContents.set(projectId, (this.documentSourceContents.get(projectId) ?? [])
  .filter((content) => content.collection_id !== collectionId))
```

7. Add:

```ts
async getDocumentSourceContent(projectId: string, sourceId: string) {
  return (this.documentSourceContents.get(projectId) ?? [])
    .find((content) => content.source_id === sourceId) ?? null
}
```

- [ ] **Step 8: Run Task 1 tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectStorageModel.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

Run:

```powershell
git add -- src/components/ProjectStorage/projectStorageTypes.ts src/components/ProjectStorage/projectSchema.ts src/components/ProjectStorage/projectLegacyMigration.ts src/components/ProjectStorage/projectSqliteRepository.ts src/components/ProjectStorage/projectStorageModel.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts
git commit -m "feat: store document source content rows"
```

Expected: commit succeeds and includes only Task 1 files.

---

### Task 2: Repository Persistence, IPC, And Graph Projection

**Files:**
- Modify: `electron/projectLocalRepository.cjs`
- Modify: `electron/projectRemoteDatabase.cjs`
- Modify: `electron/projectRemoteRepository.cjs`
- Modify: `electron/projectStorageIpcHandlers.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopApi.ts`
- Modify: `src/components/ProjectStorage/projectLocalRepositoryProxy.ts`
- Modify: `src/components/ProjectStorage/projectRemoteRepositoryProxy.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Test: `src/components/ProjectStorage/projectLocalSqliteRepository.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteDatabase.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteRepository.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts`

**Interfaces:**
- Consumes Task 1:
  - `DocumentSourceContent`
  - `DocumentCollectionGraph`
  - `ReplaceDocumentGraphInput.sourceContents`
  - `ProjectRepository.getDocumentSourceContent`
  - `ProjectRepository.getDocumentCollectionGraph`
- Produces desktop API methods:
  - `listLocalDocument...` existing methods stay unchanged.
  - `getLocalDocumentSourceContent(projectId, sourceId)`
  - `getLocalDocumentCollectionGraph(projectId, collectionId)`
  - `getRemoteDocumentSourceContent(projectId, sourceId, databaseProfileId?)`
  - `getRemoteDocumentCollectionGraph(projectId, collectionId, databaseProfileId?)`

- [ ] **Step 1: Write failing local persistence test**

In `src/components/ProjectStorage/projectLocalSqliteRepository.test.ts`, extend the document graph persistence test:

```ts
const content = await reopened.getDocumentSourceContent(created.project.id, graph.sources[0]!.id)
assert.equal(content?.content_text, graph.sourceContents[0]!.content_text)
assert.equal(content?.hash_sha256, graph.sources[0]!.hash_sha256)

const projected = await reopened.getDocumentCollectionGraph(created.project.id, graph.collection.id)
assert.equal(projected.nodes[graph.nodes[0]!.id]?.label, graph.nodes[0]!.label)
assert.equal(projected.edges[graph.edges[0]!.id]?.source, graph.edges[0]!.source_node_id)
assert.deepEqual(projected.nodes[graph.nodes[0]!.id]?.records, [graph.records[0]!.id])
assert.equal((projected.nodes[graph.nodes[0]!.id]?.data.term_record as { title?: string }).title, graph.records[0]!.title)
```

- [ ] **Step 2: Run local persistence test and verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectLocalSqliteRepository.test.ts
```

Expected: FAIL because local repository lacks source content and graph projection.

- [ ] **Step 3: Implement local repository persistence**

In `electron/projectLocalRepository.cjs`:

1. Add `document_source_contents` to `createProjectSchemaSql` after `document_sources`.
2. Add it to row-set table arrays used by import/export.
3. Insert `input.sourceContents || []` in `replaceDocumentGraph`.
4. Delete `document_source_contents` before `document_sources` in `deleteDocumentCollectionRows`.
5. Add `getDocumentSourceContent(projectId, sourceId)`.
6. Add `getDocumentCollectionGraph(projectId, collectionId)`.

Implement graph projection with helpers:

```js
function parseJsonObject(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function graphRecordData(record) {
  return {
    ...parseJsonObject(record.metadata_json),
    id: record.id,
    external_id: record.external_id,
    record_type: record.record_type,
    title: record.title,
    description: record.description,
    category_1: record.category_1,
    category_2: record.category_2,
    category_3: record.category_3,
    place_path: record.place_path,
    book_title: record.book_title,
    chapter_title: record.chapter_title,
    version_title: record.version_title,
    usage: record.usage_text,
    effect: record.effect_text,
    source_url: record.source_url,
  }
}
```

Projection rules:

- Query all nodes, edges, node links, edge links and records for the collection.
- For each node, parse `metadata_json` to `data`.
- Attach linked record ids to `records`.
- Attach the first linked record as `data.term_record`.
- For each edge, output `source_node_id` as `source`, `target_node_id` as `target`, linked record ids as `record_ids`.

- [ ] **Step 4: Write failing remote schema and repository tests**

In `projectRemoteDatabase.test.ts` add:

```ts
test('remote document source content schema uses longtext for mysql', () => {
  const mysqlSql = createProjectRemoteSchemaSql('mysql').join('\n')
  assert.match(mysqlSql, /CREATE TABLE IF NOT EXISTS document_source_contents/i)
  assert.match(mysqlSql, /content_text longtext not null/i)
})
```

In `projectRemoteRepository.test.ts`, extend replace and query tests:

```ts
assert.match(sql, /DELETE FROM document_source_contents WHERE project_id = \$1 AND collection_id = \$2/i)
assert.match(sql, /INSERT INTO document_source_contents/i)

const content = await repository.getDocumentSourceContent('p1', 'source-1')
assert.equal(content?.content_text, '{"nodes":{},"edges":{}}')
```

Add a projection test with fake rows returning nodes, edges, links and records, then assert `getDocumentCollectionGraph('p1', 'collection-1')` returns admin-compatible `{ nodes, edges }`.

- [ ] **Step 5: Run remote tests and verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectRemoteDatabase.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts
```

Expected: FAIL for missing table, SQL and methods.

- [ ] **Step 6: Implement remote schema and repository**

In `electron/projectRemoteDatabase.cjs`, add `document_source_contents` to generated schema with MySQL `longtext`.

In `electron/projectRemoteRepository.cjs`:

- Add table definition:

```js
document_source_contents: {
  columns: ['source_id', 'project_id', 'collection_id', 'content_text', 'content_encoding', 'size_bytes', 'hash_sha256', 'created_at', 'metadata_json'],
}
```

- Add to row-set tables.
- Delete `document_source_contents` before `document_sources`.
- Upsert `input.sourceContents || []` in `replaceDocumentGraph`.
- Add `getDocumentSourceContent`.
- Add `getDocumentCollectionGraph` using parameterized queries only.
- Keep all document methods wrapped in `withSchemaRepair`.

- [ ] **Step 7: Write failing IPC/proxy test**

In `projectRemoteRepositoryProxy.test.ts`, extend the fake desktop API:

```ts
getRemoteDocumentSourceContent: async (projectId: string, sourceId: string, databaseProfileId: string) => {
  calls.push(['getSourceContent', projectId, sourceId, databaseProfileId])
  return null
},
getRemoteDocumentCollectionGraph: async (projectId: string, collectionId: string, databaseProfileId: string) => {
  calls.push(['getGraph', projectId, collectionId, databaseProfileId])
  return { nodes: {}, edges: {} }
},
```

Call:

```ts
await repository.getDocumentSourceContent('project-a', 'source-1')
await repository.getDocumentCollectionGraph('project-b', 'collection-1')
```

Assert the profile id is forwarded.

- [ ] **Step 8: Run proxy test and verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
```

Expected: FAIL because proxies and desktop API types lack the methods.

- [ ] **Step 9: Implement IPC and proxies**

Update `src/desktopApi.ts`, `electron/preload.cjs`, and `electron/projectStorageIpcHandlers.cjs` with local and remote source-content and graph methods.

Update local and remote proxies:

```ts
async getDocumentSourceContent(projectId: string, sourceId: string) {
  return getDesktopApi().getRemoteDocumentSourceContent(projectId, sourceId, await this.resolveDatabaseProfileId(projectId))
}

async getDocumentCollectionGraph(projectId: string, collectionId: string) {
  return getDesktopApi().getRemoteDocumentCollectionGraph(projectId, collectionId, await this.resolveDatabaseProfileId(projectId))
}
```

Use the local equivalent in `projectLocalRepositoryProxy.ts`.

- [ ] **Step 10: Run Task 2 tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectLocalSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteDatabase.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Task 2**

Run:

```powershell
git add -- electron/projectLocalRepository.cjs electron/projectRemoteDatabase.cjs electron/projectRemoteRepository.cjs electron/projectStorageIpcHandlers.cjs electron/preload.cjs src/desktopApi.ts src/components/ProjectStorage/projectLocalRepositoryProxy.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.ts src/components/ProjectStorage/projectSqliteRepository.ts src/components/ProjectStorage/projectLocalSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteDatabase.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
git commit -m "feat: project document graph repository projection"
```

Expected: commit succeeds and includes only Task 2 files.

---

### Task 3: Import Service Writes Source Content

**Files:**
- Modify: `src/components/DocumentWorkspace/documentKnowledgeTypes.ts`
- Modify: `src/components/DocumentWorkspace/documentKnowledgeImportService.ts`
- Modify: `src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts`
- Modify: `src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts`
- Modify: `src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts`

**Interfaces:**
- Consumes Task 1 and Task 2:
  - `ReplaceDocumentGraphInput.sourceContents`
  - `DocumentSourceContent`
- Produces:
  - `importKnowledgeBaseFile` always passes one source content row for `entity_graph.json`.

- [ ] **Step 1: Write failing import service test**

In `documentKnowledgeImportService.test.ts`, extend the repository spy:

```ts
let replacedInput: ReplaceDocumentGraphInput | null = null
const repository = {
  ...createMemoryProjectRepository(),
  async replaceDocumentGraph(input: ReplaceDocumentGraphInput) {
    replacedInput = input
    return { collection: input.collection, importRun: input.importRun }
  },
}
```

After import:

```ts
assert.equal(replacedInput?.sourceContents.length, 1)
assert.equal(replacedInput?.sourceContents[0]?.source_id, replacedInput?.sources[0]?.id)
assert.equal(replacedInput?.sourceContents[0]?.content_text, fileText)
assert.equal(replacedInput?.sourceContents[0]?.content_encoding, 'utf-8')
assert.equal(replacedInput?.sourceContents[0]?.size_bytes, file.size)
assert.equal(replacedInput?.sourceContents[0]?.hash_sha256, replacedInput?.sources[0]?.hash_sha256)
assert.equal(replacedInput?.sources[0] && 'content_text' in replacedInput.sources[0], false)
```

- [ ] **Step 2: Run import service test and verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts
```

Expected: FAIL because `sourceContents` is missing.

- [ ] **Step 3: Implement source content creation**

In `documentKnowledgeImportService.ts`, after `sourceInput` is built and before `replaceDocumentGraph`, create:

```ts
const sourceContents = [{
  source_id: sourceId,
  project_id: input.projectId,
  collection_id: collectionId,
  content_text: text,
  content_encoding: 'utf-8',
  size_bytes: input.file.size,
  hash_sha256: hashSha256,
  created_at: now,
  metadata_json: JSON.stringify({ sourceType: adapter.sourceType }),
}]
```

Pass it:

```ts
return input.repository.replaceDocumentGraph({
  projectId: input.projectId,
  collection,
  sources: rows.sources,
  sourceContents,
  records: rows.records,
  nodes: rows.nodes,
  edges: rows.edges,
  nodeRecordLinks: rows.nodeRecordLinks,
  edgeRecordLinks: rows.edgeRecordLinks,
  importRun,
})
```

- [ ] **Step 4: Update adapter tests to keep raw JSON out of metadata**

In `shjGraphImportAdapter.test.ts`, assert every metadata field omits raw graph:

```ts
const serializedRows = JSON.stringify({
  records: rows.records.map((row) => row.metadata_json),
  nodes: rows.nodes.map((row) => row.metadata_json),
  edges: rows.edges.map((row) => row.metadata_json),
})
assert.equal(serializedRows.includes('"nodes"'), false)
assert.equal(serializedRows.includes('"edges"'), false)
```

- [ ] **Step 5: Run Task 3 tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```powershell
git add -- src/components/DocumentWorkspace/documentKnowledgeTypes.ts src/components/DocumentWorkspace/documentKnowledgeImportService.ts src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
git commit -m "feat: persist imported document source text"
```

Expected: commit succeeds and includes only Task 3 files.

---

### Task 4: Admin-Style Graph View Model

**Files:**
- Create: `src/components/DocumentWorkspace/documentGraphViewModel.ts`
- Create: `src/components/DocumentWorkspace/documentGraphViewModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes:
  - `DocumentCollectionGraph`
  - `DocumentGraphNode`
  - `DocumentGraphEdge`
- Produces:
  - `DocumentGraphFilterState`
  - `createDefaultDocumentGraphFilter(graph): DocumentGraphFilterState`
  - `filterDocumentGraph(graph, state): DocumentCollectionGraph`
  - `buildDocumentCategoryTree(graph): DocumentCategoryBranch[]`
  - `filterDocumentTermList(graph): DocumentGraphNode[]`
  - `focusTargetForDocumentNode(graph, visibleGraph, nodeId, currentRecordId?): { nodeId: string; recordId?: string } | undefined`
  - `contextActionForDocumentNode(graph, visibleGraph, nodeId, currentRecordId?): DocumentNodeAction | undefined`
  - `describeDocumentGraphNode(graph, node): DocumentGraphNodeDetails`
  - `buildDocumentGraphChartOption(graph, focusNodeId?): DocumentGraphChartOption`

- [ ] **Step 1: Write failing filter tests**

Create `documentGraphViewModel.test.ts` with tests adapted from admin:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDocumentCategoryTree,
  contextActionForDocumentNode,
  filterDocumentGraph,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

test('filters entity list by category path, role, and description', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:少陽之山': {
        id: 'entity:少陽之山',
        label: '少陽之山',
        type: 'entity',
        records: ['1275'],
        data: { roles: ['term', 'place'], category_paths: [['地名', '山名']], has_description: true },
      },
      'entity:酸水': {
        id: 'entity:酸水',
        label: '酸水',
        type: 'entity',
        records: ['1280'],
        data: { roles: ['term'], category_paths: [['地名', '水名']], has_description: false },
      },
      'descriptor:其上多玉': {
        id: 'descriptor:其上多玉',
        label: '其上多玉',
        type: 'descriptor',
        records: ['1275'],
        data: {},
      },
    },
    edges: {
      'edge:description': {
        id: 'edge:description',
        source: 'entity:少陽之山',
        target: 'descriptor:其上多玉',
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: ['1275'],
        source_kind: 'detail_graph',
      },
    },
  }

  const filtered = filterDocumentGraph(graph, {
    query: '',
    categories: [],
    categoryFilters: [{ level: 2, parent: '地名', value: '山名' }],
    entityRoles: ['place'],
    description: 'with',
    nodeTypes: ['entity', 'descriptor'],
    edgeTypes: ['site_relation'],
  })

  assert.deepEqual(Object.keys(filtered.nodes).sort(), ['descriptor:其上多玉', 'entity:少陽之山'])
  assert.deepEqual(Object.keys(filtered.edges), ['edge:description'])
})

test('builds category tree from entity category paths', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:少陽之山': {
        id: 'entity:少陽之山',
        label: '少陽之山',
        type: 'entity',
        records: ['1275'],
        data: { category_paths: [['地名', '山名'], ['地名', '水名', '酸水']] },
      },
    },
    edges: {},
  }

  assert.deepEqual(buildDocumentCategoryTree(graph), [{
    name: '地名',
    children: [{ name: '山名', children: [] }, { name: '水名', children: ['酸水'] }],
  }])
})

test('turns category context action into category filter action', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:畢方': {
        id: 'entity:畢方',
        label: '畢方',
        type: 'entity',
        records: ['813'],
        data: { category_1: '动物', category_2: '鸟名' },
      },
      'category:鸟名': {
        id: 'category:鸟名',
        label: '鸟名',
        type: 'category',
        records: ['813'],
        data: {},
      },
    },
    edges: {
      'edge:category': {
        id: 'edge:category',
        source: 'entity:畢方',
        target: 'category:鸟名',
        type: 'HAS_CATEGORY_2',
        label: '二级类目',
        weight: 1,
        record_ids: ['813'],
        source_kind: 'derived_field',
      },
    },
  }

  assert.deepEqual(contextActionForDocumentNode(graph, graph, 'category:鸟名', '813'), {
    type: 'category_filter',
    categoryLevel: 2,
    category: '鸟名',
    parent: '动物',
  })
})
```

- [ ] **Step 2: Run model test and verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentGraphViewModel.test.ts
```

Expected: FAIL because `documentGraphViewModel.ts` does not exist.

- [ ] **Step 3: Implement model types and basic filters**

Create `documentGraphViewModel.ts` with:

```ts
import type { DocumentCollectionGraph, DocumentGraphEdge, DocumentGraphNode } from '../ProjectStorage'

export type DocumentDescriptionFilter = 'all' | 'with' | 'without'
export type DocumentCategoryLevel = 1 | 2 | 3

export interface DocumentCategoryFilter {
  level: DocumentCategoryLevel
  value: string
  grandparent?: string
  parent?: string
}

export interface DocumentGraphFilterState {
  query: string
  categories: string[]
  categoryLevel?: DocumentCategoryLevel
  categoryFilters?: DocumentCategoryFilter[]
  entityRoles?: string[]
  description: DocumentDescriptionFilter
  nodeTypes: string[]
  edgeTypes: string[]
  focusNodeId?: string
  focusRecordId?: string
}

export type DocumentNodeAction =
  | { type: 'focus'; nodeId: string; recordId?: string }
  | { type: 'category_filter'; categoryLevel: DocumentCategoryLevel; category: string; parent?: string; grandparent?: string }
```

Port the admin behavior from `D:\devgame\山海再就业\services\admin\frontend\src\modules\shj-graph\graphView\filters.ts`, renaming functions to document names and replacing `GraphData` with `DocumentCollectionGraph`.

- [ ] **Step 4: Add focused graph and description grouping tests**

Add these two assertions:

```ts
test('focused entity shows incoming and outgoing relationship chains up to three levels', () => {
  const data: DocumentCollectionGraph = {
    nodes: {
      'entity:章莪之山': { id: 'entity:章莪之山', label: '章莪之山', type: 'entity', records: ['807', '813'], data: {} },
      'entity:畢方': { id: 'entity:畢方', label: '畢方', type: 'entity', records: ['813'], data: {} },
      'entity:山名': { id: 'entity:山名', label: '山名', type: 'entity', records: ['807'], data: {} },
      'entity:地名': { id: 'entity:地名', label: '地名', type: 'entity', records: ['807'], data: {} },
      'entity:类目根': { id: 'entity:类目根', label: '类目根', type: 'entity', records: ['807'], data: {} },
      'entity:四级之外': { id: 'entity:四级之外', label: '四级之外', type: 'entity', records: ['807'], data: {} },
    },
    edges: {
      'edge:813-place': { id: 'edge:813-place', source: 'entity:畢方', target: 'entity:章莪之山', type: 'site_relation', label: '山', weight: 1, record_ids: ['813'], source_kind: 'detail_graph' },
      'edge:807-category-1': { id: 'edge:807-category-1', source: 'entity:章莪之山', target: 'entity:山名', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-2': { id: 'edge:807-category-2', source: 'entity:山名', target: 'entity:地名', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-3': { id: 'edge:807-category-3', source: 'entity:地名', target: 'entity:类目根', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-4': { id: 'edge:807-category-4', source: 'entity:类目根', target: 'entity:四级之外', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
    },
  }

  const filtered = filterDocumentGraph(data, {
    query: '',
    categories: [],
    description: 'all',
    focusNodeId: 'entity:章莪之山',
    nodeTypes: ['entity'],
    edgeTypes: ['site_relation'],
  })

  assert.deepEqual(Object.keys(filtered.edges).sort(), ['edge:807-category-1', 'edge:807-category-2', 'edge:807-category-3', 'edge:813-place'])
})
```

and:

```ts
test('groups focused entity description relationships under a virtual description node', () => {
  const data: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': { id: 'entity:槐江之山', label: '槐江之山', type: 'entity', records: ['705'], data: {} },
      'descriptor:丘時之水出焉': { id: 'descriptor:丘時之水出焉', label: '丘時之水出焉', type: 'descriptor', records: ['705'], data: {} },
      'descriptor:多玉': { id: 'descriptor:多玉', label: '多玉', type: 'descriptor', records: ['705'], data: {} },
    },
    edges: {
      'edge:desc-1': { id: 'edge:desc-1', source: 'entity:槐江之山', target: 'descriptor:丘時之水出焉', type: 'site_relation', label: '描述', weight: 1, record_ids: ['705'], source_kind: 'detail_graph' },
      'edge:desc-2': { id: 'edge:desc-2', source: 'entity:槐江之山', target: 'descriptor:多玉', type: 'site_relation', label: '描述', weight: 1, record_ids: ['705'], source_kind: 'detail_graph' },
    },
  }

  const filtered = filterDocumentGraph(data, {
    query: '',
    categories: [],
    description: 'all',
    focusNodeId: 'entity:槐江之山',
    nodeTypes: ['entity', 'descriptor', 'description_group'],
    edgeTypes: ['site_relation'],
  })

  const groupId = 'description_group:entity:槐江之山:entity:槐江之山'
  assert.equal(filtered.nodes[groupId]?.label, '描述')
  assert.equal(filtered.nodes[groupId]?.data.virtual, true)
})
```

- [ ] **Step 5: Implement focus graph, category tree, details, list and ECharts option**

Add:

```ts
export interface DocumentCategoryBranch {
  name: string
  children: Array<{ name: string; children: string[] }>
}

export interface DocumentGraphNodeDetails {
  node: DocumentGraphNode
  neighbors: Array<{
    id: string
    label: string
    edgeLabel: string
    focusable: boolean
    children?: Array<{ id: string; label: string; edgeLabel: string; focusable: boolean }>
  }>
}
```

Port these admin functions into pure TypeScript:

- `buildDocumentCategoryTree`
- `filterDocumentTermList`
- `focusTargetForDocumentNode`
- `contextActionForDocumentNode`
- `describeDocumentGraphNode`
- `buildDocumentGraphChartOption`

Use project colors that fit existing UI:

```ts
const documentGraphCategoryNames = ['术语', '描述', '类目', '归属']
const documentGraphFocusColor = '#6f5bd7'
const documentGraphLineColor = '#7a3342'
```

- [ ] **Step 6: Add package test entry**

In `package.json`, add `src/components/DocumentWorkspace/documentGraphViewModel.test.ts` after `documentKnowledgeModel.test.ts`.

- [ ] **Step 7: Run Task 4 tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentGraphViewModel.test.ts
npm test
```

Expected: both commands PASS.

- [ ] **Step 8: Commit Task 4**

Run:

```powershell
git add -- package.json src/components/DocumentWorkspace/documentGraphViewModel.ts src/components/DocumentWorkspace/documentGraphViewModel.test.ts
git commit -m "feat: add document graph interaction model"
```

Expected: commit succeeds and includes only Task 4 files.

---

### Task 5: Workspace Hook And Three-Panel UI

**Files:**
- Modify: `src/components/DocumentWorkspace/documentWorkspaceTypes.ts`
- Modify: `src/components/DocumentWorkspace/useDocumentWorkspace.ts`
- Create: `src/components/DocumentWorkspace/DocumentCollectionToolbar.tsx`
- Create: `src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx`
- Create: `src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx`
- Create: `src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx`
- Modify: `src/components/DocumentWorkspace/DocumentWorkspace.tsx`
- Modify: `src/components/DocumentWorkspace/DocumentGraphPanel.tsx`
- Modify: `src/components/DocumentWorkspace/DocumentBrowserPanel.tsx`
- Modify: `src/components/DocumentWorkspace/documentWorkspace.css`
- Create: `src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes:
  - `ProjectRepository.getDocumentCollectionGraph`
  - `DocumentGraphFilterState`
  - `filterDocumentGraph`
  - `buildDocumentCategoryTree`
  - `filterDocumentTermList`
  - `describeDocumentGraphNode`
  - `buildDocumentGraphChartOption`
- Produces `DocumentWorkspaceState` additions:
  - `collectionGraph`
  - `visibleGraph`
  - `graphFilter`
  - `searchDraft`
  - `categoryTreeQuery`
  - `viewMode: 'list' | 'graph'`
  - `focusNode(nodeId: string, recordId?: string): void`
  - `applyNodeAction(action: DocumentNodeAction): void`
  - `submitGraphSearch(): void`
  - `resetGraphView(): void`
  - `toggleGraphNodeType(nodeType: string): void`
  - `toggleGraphEdgeType(edgeType: string): void`
  - `toggleGraphEntityRole(role: string): void`
  - `changeDescriptionFilter(value: DocumentDescriptionFilter): void`

- [ ] **Step 1: Write failing render test**

Create `DocumentWorkspace.render.test.tsx`:

```tsx
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DocumentGraphControlsPanel } from './DocumentGraphControlsPanel'
import { DocumentGraphCanvasPanel } from './DocumentGraphCanvasPanel'
import { DocumentGraphDetailsPanel } from './DocumentGraphDetailsPanel'
import { createDefaultDocumentGraphFilter, filterDocumentGraph } from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

const graph: DocumentCollectionGraph = {
  nodes: {
    'entity:畢方': {
      id: 'entity:畢方',
      label: '畢方',
      type: 'entity',
      records: ['813'],
      data: {
        roles: ['term'],
        category_paths: [['动物', '鸟名']],
        has_description: true,
        term_record: { title: '畢方', description: '其状如鹤', category_1: '动物', category_2: '鸟名', place_path: '章莪之山', book_title: '山海经' },
      },
    },
    'descriptor:其状如鹤': {
      id: 'descriptor:其状如鹤',
      label: '其状如鹤',
      type: 'descriptor',
      records: ['813'],
      data: {},
    },
  },
  edges: {
    'edge:desc': {
      id: 'edge:desc',
      source: 'entity:畢方',
      target: 'descriptor:其状如鹤',
      type: 'site_relation',
      label: '描述',
      weight: 1,
      record_ids: ['813'],
      source_kind: 'detail_graph',
    },
  },
}

test('document graph panels render admin-style controls, list, graph mode, and details', () => {
  const filter = { ...createDefaultDocumentGraphFilter(graph), focusNodeId: undefined }
  const visible = filterDocumentGraph(graph, filter)

  const controls = renderToStaticMarkup(
    <DocumentGraphControlsPanel
      graph={graph}
      visibleGraph={visible}
      filter={filter}
      searchDraft=""
      categoryTreeQuery=""
      onSearchDraftChange={() => undefined}
      onSearchSubmit={() => undefined}
      onCategoryTreeQueryChange={() => undefined}
      onFilterChange={() => undefined}
      onReset={() => undefined}
    />,
  )
  assert.match(controls, /山海经图谱/)
  assert.match(controls, /层级类目关联展示筛选/)
  assert.match(controls, /是否有描述/)

  const list = renderToStaticMarkup(
    <DocumentGraphCanvasPanel
      mode="list"
      graph={visible}
      focusNodeId={undefined}
      onFocusNode={() => undefined}
      onContextNode={() => undefined}
    />,
  )
  assert.match(list, /筛选结果/)
  assert.match(list, /查看详情/)

  const details = renderToStaticMarkup(
    <DocumentGraphDetailsPanel
      graph={graph}
      node={graph.nodes['entity:畢方']}
      onFocusNode={() => undefined}
    />,
  )
  assert.match(details, /畢方/)
  assert.match(details, /相邻节点/)
})
```

- [ ] **Step 2: Run render test and verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx
```

Expected: FAIL because panel components do not exist.

- [ ] **Step 3: Extend workspace state types**

In `documentWorkspaceTypes.ts`, import graph model types and add the interface fields listed above. Keep existing collection/import methods so import/delete behavior remains compatible.

- [ ] **Step 4: Update hook to load graph projection**

In `useDocumentWorkspace.ts`:

1. Add state:

```ts
const [collectionGraph, setCollectionGraph] = useState<DocumentCollectionGraph>({ nodes: {}, edges: {} })
const [graphFilter, setGraphFilter] = useState<DocumentGraphFilterState>(() => createDefaultDocumentGraphFilter({ nodes: {}, edges: {} }))
const [searchDraft, setSearchDraft] = useState('')
const [categoryTreeQuery, setCategoryTreeQuery] = useState('')
```

2. In `loadCollectionContent`, replace or augment node/record search with:

```ts
const graph = await repository.getDocumentCollectionGraph(project.id, collectionId)
setCollectionGraph(graph)
setGraphFilter(createDefaultDocumentGraphFilter(graph))
setSearchDraft('')
setCategoryTreeQuery('')
```

3. Derive:

```ts
const visibleGraph = useMemo(() => filterDocumentGraph(collectionGraph, graphFilter), [collectionGraph, graphFilter])
const viewMode = graphFilter.focusNodeId ? 'graph' : 'list'
```

4. Implement handlers:

```ts
const submitGraphSearch = useCallback(() => {
  setGraphFilter((current) => ({
    ...current,
    query: searchDraft.trim(),
    focusNodeId: undefined,
    focusRecordId: undefined,
  }))
}, [searchDraft])
```

and reset:

```ts
const resetGraphView = useCallback(() => {
  setSearchDraft('')
  setCategoryTreeQuery('')
  setGraphFilter(createDefaultDocumentGraphFilter(collectionGraph))
}, [collectionGraph])
```

- [ ] **Step 5: Create `DocumentCollectionToolbar.tsx`**

Move the current collection select, import, delete, refresh and summary code out of `DocumentBrowserPanel.tsx`. The component props:

```ts
interface DocumentCollectionToolbarProps {
  workspace: DocumentWorkspaceState
}
```

It must render:

- `当前集合`
- `导入`
- `删除集合`
- `刷新`
- `记录` / `节点` / `关系`

Do not render source file name, file size or hash.

- [ ] **Step 6: Create `DocumentGraphControlsPanel.tsx`**

Use Ant Design controls, not raw DOM. Required props:

```ts
interface DocumentGraphControlsPanelProps {
  graph: DocumentCollectionGraph
  visibleGraph: DocumentCollectionGraph
  filter: DocumentGraphFilterState
  searchDraft: string
  categoryTreeQuery: string
  onSearchDraftChange: (value: string) => void
  onSearchSubmit: () => void
  onCategoryTreeQueryChange: (value: string) => void
  onFilterChange: (filter: DocumentGraphFilterState) => void
  onReset: () => void
}
```

Render labels exactly:

- `山海经图谱`
- `搜索`
- `是否有描述`
- `层级类目关联展示筛选`
- `实体角色` or `节点类型`
- `关系类型`
- `重置视图`

When `filter.focusNodeId` exists, render `聚焦时暂时忽略关键词。`

- [ ] **Step 7: Create `DocumentGraphCanvasPanel.tsx`**

Required props:

```ts
interface DocumentGraphCanvasPanelProps {
  mode: 'list' | 'graph'
  graph: DocumentCollectionGraph
  focusNodeId?: string
  onFocusNode: (nodeId: string) => void
  onContextNode: (nodeId: string) => void
}
```

List mode:

- Use `filterDocumentTermList(graph)`.
- Render `筛选结果`.
- Render count as `N 条术语`.
- Button text: `查看详情`.

Graph mode:

- Use ECharts core already installed.
- Render force graph with `buildDocumentGraphChartOption(graph, focusNodeId)`.
- On node click call `onFocusNode`.
- On node context menu or right-button mousedown call `onContextNode`.
- If no nodes, render `暂无图谱节点`.

- [ ] **Step 8: Create `DocumentGraphDetailsPanel.tsx`**

Required props:

```ts
interface DocumentGraphDetailsPanelProps {
  graph: DocumentCollectionGraph
  node?: DocumentGraphNode
  onFocusNode: (nodeId: string) => void
}
```

Render empty text `选择一个节点查看信息。`

For selected node, render:

- node label
- node type
- roles
- description
- category path
- `一级类目`
- `二级类目`
- `三级类目`
- `利用方法`
- `功效`
- `属地`
- `出处`
- `原站详情`
- `相邻节点`

- [ ] **Step 9: Replace workspace composition**

In `DocumentWorkspace.tsx`, replace the two-column composition with:

```tsx
<DocumentCollectionToolbar workspace={workspace} />
{workspace.importProgress ? <ImportProgress ... /> : null}
<div className="document-graph-workspace">
  <DocumentGraphControlsPanel ... />
  <DocumentGraphCanvasPanel ... />
  <DocumentGraphDetailsPanel ... />
</div>
```

Keep the existing warning alert for no active project.

- [ ] **Step 10: Update CSS**

In `documentWorkspace.css`, define:

```css
.document-graph-workspace {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 340px;
  min-height: 620px;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-panel);
}

.document-graph-controls,
.document-graph-details {
  min-width: 0;
  overflow: auto;
  padding: 16px;
  background: var(--color-panel-strong);
}

.document-graph-controls {
  border-right: 1px solid var(--color-line);
}

.document-graph-details {
  border-left: 1px solid var(--color-line);
}

.document-graph-canvas {
  min-width: 0;
  min-height: 0;
  background: var(--color-panel);
}

.document-graph-echarts {
  width: 100%;
  height: 100%;
  min-height: 560px;
}

@media (max-width: 1180px) {
  .document-graph-workspace {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .document-graph-details {
    grid-column: 1 / -1;
    max-height: 320px;
    border-top: 1px solid var(--color-line);
    border-left: 0;
  }
}

@media (max-width: 820px) {
  .document-graph-workspace {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .document-graph-controls,
  .document-graph-details {
    max-height: none;
    border: 0;
  }
}
```

- [ ] **Step 11: Add package test entry**

In `package.json`, add `src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx` after document model tests.

- [ ] **Step 12: Run Task 5 tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentGraphViewModel.test.ts src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 13: Commit Task 5**

Run:

```powershell
git add -- package.json src/components/DocumentWorkspace/documentWorkspaceTypes.ts src/components/DocumentWorkspace/useDocumentWorkspace.ts src/components/DocumentWorkspace/DocumentCollectionToolbar.tsx src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx src/components/DocumentWorkspace/DocumentWorkspace.tsx src/components/DocumentWorkspace/DocumentGraphPanel.tsx src/components/DocumentWorkspace/DocumentBrowserPanel.tsx src/components/DocumentWorkspace/documentWorkspace.css src/components/DocumentWorkspace/DocumentWorkspace.render.test.tsx
git commit -m "feat: add admin style document graph workspace"
```

Expected: commit succeeds and includes only Task 5 files.

---

### Task 6: Architecture Guards And Manual UI Verification

**Files:**
- Modify: `src/appStructure.test.ts`
- Modify: `src/styles/app.css`
- Modify: `src/components/DocumentWorkspace/documentWorkspace.css`

**Interfaces:**
- Consumes all prior task files.
- Produces final verification evidence for tests, build, diff check and browser UI.

- [ ] **Step 1: Write failing structure guard**

In `src/appStructure.test.ts`, add:

```ts
test('document graph workspace keeps source content and graph logic behind model and repository boundaries', () => {
  assertFileDoesNotContain('src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx', [
    'shjGraphImportAdapter',
    'document_source_contents',
    'content_text',
  ])
  assertFileDoesNotContain('src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx', [
    'shjGraphImportAdapter',
    'document_source_contents',
    'content_text',
  ])
  assertFileDoesNotContain('src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx', [
    'shjGraphImportAdapter',
    'document_source_contents',
    'content_text',
  ])
  assertFileDoesNotContain('src/components/DocumentWorkspace/documentGraphViewModel.ts', [
    'react',
    'antd',
    'getDesktopApi',
  ])
})
```

If helper names differ, use the existing app structure helper style and keep the same assertions.

- [ ] **Step 2: Run structure test and verify RED or GREEN**

Run:

```powershell
npx tsx --test src/appStructure.test.ts
```

Expected: PASS if previous tasks followed boundaries; otherwise FAIL with the violating import or string.

- [ ] **Step 3: Fix any boundary violation**

Move any graph filtering, category tree, focus action or ECharts option code from React components into `documentGraphViewModel.ts`. Remove any source-content table names from UI files.

- [ ] **Step 4: Run full automated verification**

Run:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected:

- `npm test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: no whitespace errors. CRLF warnings are acceptable if there are no error lines.
- `git status --short --branch`: only intentional working-tree files appear.

- [ ] **Step 5: Browser verification**

Start dev server:

```powershell
npm run dev -- --host 127.0.0.1
```

If `npm run dev` is not defined, run:

```powershell
npx vite --host 127.0.0.1
```

Open the local URL in the in-app browser. Verify at desktop width and mobile width:

- Top right button says `项目空间`.
- Current project space still appears on the left side of the app shell.
- Knowledge base toolbar shows current collection, import, delete, refresh and collection statistics.
- Source file summary such as `entity_graph.json · 24167 KB · 19d6d56697` is absent.
- Left panel shows `山海经图谱`, search, description filter, category filter, roles or node types, edge types and reset.
- Center starts in `筛选结果` list mode.
- Clicking `查看详情` switches to graph mode.
- ECharts canvas is nonblank and resizes with the panel.
- Right panel shows selected node details and `相邻节点`.
- No horizontal page overflow at mobile width.
- Browser console has no runtime error.

- [ ] **Step 6: Commit Task 6**

Run:

```powershell
git add -- src/appStructure.test.ts src/styles/app.css src/components/DocumentWorkspace/documentWorkspace.css
git commit -m "test: guard document graph workspace boundaries"
```

Expected: commit succeeds and includes only Task 6 files.

---

## Self-Review

Spec coverage:

- Source file content table is covered by Tasks 1, 2 and 3.
- `entity_graph.json` only, no `graph.json` compatibility, remains covered by existing adapter tests and Task 3.
- Admin-style graph filtering, category tree, focus, details and ECharts option are covered by Task 4.
- Three-column UI and list/graph mode interaction are covered by Task 5.
- Local, remote, IPC, proxy and migration/export paths are covered by Tasks 1 and 2.
- Structure guards and browser verification are covered by Task 6.
- Role association is explicitly out of scope and no task adds it.

Placeholder scan:

- The plan contains no unfinished placeholder markers or vague completion steps.
- Every task has concrete files, interfaces, commands and expected outcomes.

Type consistency:

- `DocumentSourceContent`, `DocumentCollectionGraph`, `DocumentGraphNode`, `DocumentGraphEdge`, `DocumentGraphFilterState` and `DocumentNodeAction` are defined before later tasks consume them.
- New repository method names are consistent across type, IPC, preload, proxies and UI hook.
