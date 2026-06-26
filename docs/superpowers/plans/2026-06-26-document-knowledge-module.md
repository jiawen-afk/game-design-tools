# 文档知识库模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在游戏设计工具中实现项目级“知识库”模块，第一版只导入 `entity_graph.json`，把图谱 JSON 解析为规范化数据库行，并提供首页入口、搜索、详情和图谱画布。

**Architecture:** 新增 `src/components/DocumentWorkspace/`，把类型、纯转换、导入编排、repository 访问、React hook 和面板拆开。文档数据仍归属现有 `ProjectStorage` 项目边界，所有本地、远程和迁移路径都通过扩展后的 `ProjectRepository` 与 Electron IPC 访问。UI 只使用 adapter 契约和 repository 方法，不解析山海经图谱结构。

**Tech Stack:** React 19、TypeScript、Ant Design、Electron IPC、sql.js SQLite、本地/远程项目数据库、Node test runner。第一版不新增图谱渲染依赖，图谱画布用 React SVG 实现。

## Global Constraints

- 用户界面与说明使用中文。
- 第一版只支持导入 `entity_graph.json`；选择 `graph.json` 必须失败并提示选择实体图谱文件。
- 数据库只保存源文件元数据和 hash，不保存整份原始 JSON 到 `content_text`、`content_blob`、`metadata_json` 或其他 text/blob/json 字段。
- 图谱 JSON 必须解析为 `document_records`、`document_nodes`、`document_edges`、`document_node_record_links`、`document_edge_record_links` 等规范化行。
- 第一版不做角色、剧情组或资产到知识库的关联。
- 首页必须有特殊“知识库”栏目；第一版知识库工作区必须包含图谱画布。
- `shjGraphImportAdapter` 是唯一包含山海经图谱输入结构假设的模块。
- `DocumentWorkspace` 面板不直接导入 DB adapter；repository 和 import service 不导入 UI 面板；导入 adapter 不导入 React。
- 遵循项目产品 UI 风格：密集、克制、工具优先，不做营销页，不使用大面积装饰渐变或玻璃拟态。
- 每个生产代码切片先写失败测试，再实现，最后运行覆盖该切片的测试。

---

## File Structure

- Modify `src/components/ProjectStorage/projectStorageTypes.ts`: 增加 document 行类型。
- Modify `src/components/ProjectStorage/projectSchema.ts`: 增加 document 表和索引。
- Modify `src/components/ProjectStorage/projectLegacyMigration.ts`: 扩展 `LegacyProjectRows`，保证迁移行集含文档表。
- Modify `src/components/ProjectStorage/projectSqliteRepository.ts`: 扩展 `ProjectRepository` 和内存实现。
- Modify `src/components/ProjectStorage/projectLocalRepositoryProxy.ts`: 代理文档 repository 方法到 desktop API 或 fallback。
- Modify `src/components/ProjectStorage/projectRemoteRepositoryProxy.ts`: 代理文档 repository 方法到 remote desktop API。
- Modify `electron/projectLocalRepository.cjs`: 本地 SQLite 文档方法、row set 导出导入。
- Modify `electron/projectRemoteRepository.cjs`: 远程 DB 文档方法、row set 导出导入。
- Modify `electron/projectRemoteDatabase.cjs`: 远程 schema 与 MySQL 类型适配。
- Modify `electron/projectStorageIpcHandlers.cjs`: 注册本地和远程文档 IPC。
- Modify `electron/preload.cjs` and `src/desktopApi.ts`: 暴露文档 repository API。
- Create `src/components/DocumentWorkspace/documentKnowledgeTypes.ts`: adapter、行、查询、UI DTO 类型。
- Create `src/components/DocumentWorkspace/documentKnowledgeModel.ts`: 搜索、详情、图谱画布数据、adapter registry 纯逻辑。
- Create `src/components/DocumentWorkspace/shjGraphImportAdapter.ts`: `entity_graph.json` 校验和规范化转换。
- Create `src/components/DocumentWorkspace/documentKnowledgeImportService.ts`: 文件读取、hash、adapter 选择、repository replace 编排。
- Create `src/components/DocumentWorkspace/useDocumentWorkspace.ts`: 工作区状态和导入/搜索/详情流程。
- Create `src/components/DocumentWorkspace/DocumentWorkspace.tsx`: 工作区组合入口。
- Create `src/components/DocumentWorkspace/DocumentHomeKnowledgeSection.tsx`: 首页特殊知识库栏目。
- Create `src/components/DocumentWorkspace/DocumentBrowserPanel.tsx`: 搜索、列表和详情。
- Create `src/components/DocumentWorkspace/DocumentGraphPanel.tsx`: SVG 图谱画布。
- Create `src/components/DocumentWorkspace/documentWorkspace.css`: 工作区样式。
- Create tests:
  - `src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts`
  - `src/components/DocumentWorkspace/documentKnowledgeModel.test.ts`
  - `src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts`
- Modify tests:
  - `src/components/ProjectStorage/projectStorageModel.test.ts`
  - `src/components/ProjectStorage/projectSqliteRepository.test.ts`
  - `src/components/ProjectStorage/projectLocalSqliteRepository.test.ts`
  - `src/components/ProjectStorage/projectRemoteDatabase.test.ts`
  - `src/components/ProjectStorage/projectRemoteRepository.test.ts`
  - `src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts`
  - `src/appStructure.test.ts`
  - `package.json`
  - `src/App.tsx`
  - `src/styles/app.css`

---

### Task 1: Document Schema And Row Sets

**Files:**
- Modify: `src/components/ProjectStorage/projectStorageTypes.ts`
- Modify: `src/components/ProjectStorage/projectSchema.ts`
- Modify: `src/components/ProjectStorage/projectLegacyMigration.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Modify: `electron/projectLocalRepository.cjs`
- Modify: `electron/projectRemoteRepository.cjs`
- Modify: `electron/projectRemoteDatabase.cjs`
- Test: `src/components/ProjectStorage/projectStorageModel.test.ts`
- Test: `src/components/ProjectStorage/projectSqliteRepository.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteDatabase.test.ts`

**Interfaces:**
- Produces document row types:
  - `DocumentCollection`
  - `DocumentSource`
  - `DocumentRecord`
  - `DocumentNode`
  - `DocumentEdge`
  - `DocumentNodeRecordLink`
  - `DocumentEdgeRecordLink`
  - `DocumentImportRun`
- Extends `LegacyProjectRows` with:
  - `documentCollections`
  - `documentSources`
  - `documentRecords`
  - `documentNodes`
  - `documentEdges`
  - `documentNodeRecordLinks`
  - `documentEdgeRecordLinks`
  - `documentImportRuns`

- [ ] **Step 1: Write schema failing tests**

Add tests asserting:

```ts
test('schema SQL includes normalized document knowledge tables without raw JSON content columns', () => {
  for (const dialect of ['sqlite', 'postgresql', 'mysql'] as const) {
    const sql = createProjectSchemaSql(dialect).join('\n')
    for (const table of [
      'document_collections',
      'document_sources',
      'document_records',
      'document_nodes',
      'document_edges',
      'document_node_record_links',
      'document_edge_record_links',
      'document_import_runs',
    ]) {
      assert.match(sql, new RegExp(`CREATE TABLE [^;]*${table}`, 'i'))
      assert.ok(PROJECT_SCHEMA_TABLES.includes(table as never))
    }
    assert.match(sql, /record_count integer not null default 0/i)
    assert.match(sql, /document_records/)
    assert.match(sql, /document_node_record_links/)
    assert.match(sql, /document_edge_record_links/)
    assert.doesNotMatch(sql, /content_text/i)
    assert.doesNotMatch(sql, /content_blob/i)
    assert.doesNotMatch(sql, /record_ids_json/i)
    assert.doesNotMatch(sql, /record_json/i)
  }
})
```

- [ ] **Step 2: Run schema tests to verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectStorageModel.test.ts
```

Expected: FAIL because document tables are missing.

- [ ] **Step 3: Add document row types and schema**

Implement the types in `projectStorageTypes.ts`, add all document table names to `PROJECT_SCHEMA_TABLES`, and add the SQL tables and indexes from the spec to `createProjectSchemaSql`.

- [ ] **Step 4: Add row-set export/import failing test**

Add a `projectSqliteRepository.test.ts` case importing rows with one collection, source metadata, record, node, edge and links, then asserting `exportProjectRows('p1')` returns the same document row arrays. The source row must not include raw JSON content fields.

- [ ] **Step 5: Run repository row-set test to verify RED**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectSqliteRepository.test.ts
```

Expected: FAIL because `LegacyProjectRows` and memory repository do not include document row arrays.

- [ ] **Step 6: Extend row sets**

Extend `LegacyProjectRows`, memory repository maps, import/export/delete behavior, `electron/projectLocalRepository.cjs` `rowSetTables`, and `electron/projectRemoteRepository.cjs` `tableDefinitions` plus `rowSetTables`.

- [ ] **Step 7: Update MySQL schema adaptation**

Update `electron/projectRemoteDatabase.cjs` type replacements so document ids, external ids, source ids, node ids, edge ids, record ids, `source_type`, `record_type`, `node_type`, `edge_type`, `source_kind`, `role`, `mime_group`, `mime_type`, `extension`, `encoding`, dates and text fields get valid MySQL types.

- [ ] **Step 8: Verify Task 1**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectStorageModel.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteDatabase.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```powershell
git add src/components/ProjectStorage/projectStorageTypes.ts src/components/ProjectStorage/projectSchema.ts src/components/ProjectStorage/projectLegacyMigration.ts src/components/ProjectStorage/projectSqliteRepository.ts electron/projectLocalRepository.cjs electron/projectRemoteRepository.cjs electron/projectRemoteDatabase.cjs src/components/ProjectStorage/projectStorageModel.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteDatabase.test.ts
git commit -m "feat: add document knowledge storage schema"
```

### Task 2: Shj Entity Graph Adapter

**Files:**
- Create: `src/components/DocumentWorkspace/documentKnowledgeTypes.ts`
- Create: `src/components/DocumentWorkspace/documentKnowledgeModel.ts`
- Create: `src/components/DocumentWorkspace/shjGraphImportAdapter.ts`
- Test: `src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts`
- Test: `src/components/DocumentWorkspace/documentKnowledgeModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `shjGraphImportAdapter` with:
  - `sourceType: 'shj_nlc_graph'`
  - `displayName: '山海经实体图谱'`
  - `acceptedFileNames: ['entity_graph.json']`
  - `validateSource(input): KnowledgeBaseValidationResult`
  - `convertSource(input): KnowledgeBaseImportRows`
- Produces pure helpers:
  - `createDocumentSearchText(parts: unknown[]): string`
  - `buildDocumentGraphView(input): DocumentGraphView`
  - `getKnowledgeBaseAdapter(sourceType: string)`

- [ ] **Step 1: Write adapter failing tests**

Add tests for:

```ts
test('shj adapter only accepts entity_graph.json', () => {
  assert.deepEqual(shjGraphImportAdapter.acceptedFileNames, ['entity_graph.json'])
  assert.equal(shjGraphImportAdapter.validateSource({ fileName: 'entity_graph.json', text: validEntityGraphText }).ok, true)
  assert.equal(shjGraphImportAdapter.validateSource({ fileName: 'graph.json', text: validEntityGraphText }).ok, false)
})

test('shj adapter converts entity graph JSON into normalized records nodes edges and links', () => {
  const rows = shjGraphImportAdapter.convertSource(sampleInput)
  assert.equal(rows.records.length, 1)
  assert.equal(rows.nodes.length, 2)
  assert.equal(rows.edges.length, 1)
  assert.equal(rows.nodeRecordLinks.length, 1)
  assert.equal(rows.edgeRecordLinks.length, 1)
  assert.equal(rows.sources[0]?.file_name, 'entity_graph.json')
  assert.equal('content_text' in rows.sources[0]!, false)
  assert.equal('content_blob' in rows.sources[0]!, false)
})
```

Also cover missing edge node failure, duplicate external id failure, and `metadata_json` not containing the full source graph shape.

- [ ] **Step 2: Run adapter tests to verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts src/components/DocumentWorkspace/documentKnowledgeModel.test.ts
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement types and adapter**

Create the three files. Use deterministic IDs derived from `collectionId`, row kind and external id for repeatable tests. Parse `GraphData.nodes` and `GraphData.edges` object maps. For records, use `GraphNode.data.term_record` from entity nodes and derive missing fields from the node data where present. Store only low-frequency parsed fields in row `metadata_json`; never store the input graph object or full source text.

- [ ] **Step 4: Add tests to package script**

Add the two new test files to `package.json` `scripts.test`.

- [ ] **Step 5: Verify Task 2**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts src/components/DocumentWorkspace/documentKnowledgeModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/components/DocumentWorkspace/documentKnowledgeTypes.ts src/components/DocumentWorkspace/documentKnowledgeModel.ts src/components/DocumentWorkspace/shjGraphImportAdapter.ts src/components/DocumentWorkspace/shjGraphImportAdapter.test.ts src/components/DocumentWorkspace/documentKnowledgeModel.test.ts package.json
git commit -m "feat: convert shj entity graph into document rows"
```

### Task 3: Document Repository, Import Service, And IPC

**Files:**
- Create: `src/components/DocumentWorkspace/documentKnowledgeImportService.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Modify: `src/components/ProjectStorage/projectLocalRepositoryProxy.ts`
- Modify: `src/components/ProjectStorage/projectRemoteRepositoryProxy.ts`
- Modify: `electron/projectLocalRepository.cjs`
- Modify: `electron/projectRemoteRepository.cjs`
- Modify: `electron/projectStorageIpcHandlers.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopApi.ts`
- Test: `src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts`
- Test: `src/components/ProjectStorage/projectLocalSqliteRepository.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteRepository.test.ts`
- Test: `src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts`

**Interfaces:**
- Extends `ProjectRepository` with:
  - `listDocumentCollections(projectId: string): Promise<DocumentCollection[]>`
  - `getDocumentCollection(projectId: string, collectionId: string): Promise<DocumentCollection | null>`
  - `deleteDocumentCollection(projectId: string, collectionId: string): Promise<void>`
  - `listDocumentSources(projectId: string, collectionId: string): Promise<DocumentSource[]>`
  - `replaceDocumentGraph(input: ReplaceDocumentGraphInput): Promise<DocumentImportResult>`
  - `searchDocumentRecords(input: DocumentRecordSearchInput): Promise<DocumentRecordSearchResult>`
  - `searchDocumentNodes(input: DocumentNodeSearchInput): Promise<DocumentNodeSearchResult>`
  - `getDocumentNode(projectId: string, nodeId: string): Promise<DocumentNodeDetails | null>`
  - `listDocumentNeighbors(projectId: string, nodeId: string): Promise<DocumentNeighbor[]>`
- Produces service:
  - `importKnowledgeBaseFile(input: ImportKnowledgeBaseFileInput): Promise<DocumentImportResult>`

- [ ] **Step 1: Write repository and service failing tests**

Add tests proving:

- Importing one `entity_graph.json` file creates one ready collection, one source metadata row, normalized records/nodes/edges/link rows, and one succeeded import run.
- Search by label and category returns records/nodes from `search_text`.
- Replacing a collection removes old normalized rows before inserting new rows.
- Deleting a collection removes sources, records, nodes, edges, links and import runs.
- `ProjectRepository` has no `getDocumentSourceContent` method.
- `document_sources` rows never include raw JSON content fields.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts src/components/ProjectStorage/projectLocalSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
```

Expected: FAIL because repository document methods and service do not exist.

- [ ] **Step 3: Implement memory and Electron repository methods**

Implement the methods in the memory repository first, then mirror behavior in local SQLite and remote DB repositories. Use transactions for `replaceDocumentGraph` and delete rows in dependency order: edge links, node links, edges, nodes, records, sources, import runs, collection.

- [ ] **Step 4: Implement desktop proxies and IPC**

Add desktop API methods for local and remote repository operations. Remote proxy must require the project database profile id the same way asset list and row migration do.

- [ ] **Step 5: Implement import service**

The service accepts a `File` or file-like object with `name`, `size` and `text()`. It rejects any file name other than `entity_graph.json`, computes SHA-256 with Web Crypto when available and a deterministic fallback in tests, calls `shjGraphImportAdapter`, then calls `replaceDocumentGraph`.

- [ ] **Step 6: Verify Task 3**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts src/components/ProjectStorage/projectLocalSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add src/components/DocumentWorkspace/documentKnowledgeImportService.ts src/components/DocumentWorkspace/documentKnowledgeImportService.test.ts src/components/ProjectStorage/projectSqliteRepository.ts src/components/ProjectStorage/projectLocalRepositoryProxy.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.ts electron/projectLocalRepository.cjs electron/projectRemoteRepository.cjs electron/projectStorageIpcHandlers.cjs electron/preload.cjs src/desktopApi.ts src/components/ProjectStorage/projectLocalSqliteRepository.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts package.json
git commit -m "feat: persist imported document knowledge graphs"
```

### Task 4: Homepage Knowledge Section And Document Workspace UI

**Files:**
- Create: `src/components/DocumentWorkspace/DocumentHomeKnowledgeSection.tsx`
- Create: `src/components/DocumentWorkspace/DocumentWorkspace.tsx`
- Create: `src/components/DocumentWorkspace/DocumentBrowserPanel.tsx`
- Create: `src/components/DocumentWorkspace/DocumentGraphPanel.tsx`
- Create: `src/components/DocumentWorkspace/useDocumentWorkspace.ts`
- Create: `src/components/DocumentWorkspace/documentWorkspace.css`
- Create: `src/components/DocumentWorkspace/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`
- Test: `src/components/DocumentWorkspace/documentKnowledgeModel.test.ts`

**Interfaces:**
- `DocumentHomeKnowledgeSection` props:
  - `onOpen: () => void`
- `DocumentWorkspace` props: none.
- `useDocumentWorkspace` returns collections, selected collection, query, results, selected node details, graph view, loading/importing state and handlers.

- [ ] **Step 1: Write UI model failing tests**

Add tests for `buildDocumentGraphView` and detail projection:

```ts
test('graph view limits edges to visible nodes and exposes stable coordinates', () => {
  const view = buildDocumentGraphView({ nodes, edges, selectedNodeId: 'node-a', width: 800, height: 480 })
  assert.deepEqual(view.edges.map((edge) => edge.id), ['edge-a-b'])
  assert.equal(view.nodes.some((node) => node.x >= 0 && node.x <= 800), true)
})
```

- [ ] **Step 2: Run UI model tests to verify RED**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentKnowledgeModel.test.ts
```

Expected: FAIL for missing graph view/detail helpers.

- [ ] **Step 3: Implement workspace hook and panels**

Use Ant Design `Button`, `Input`, `Select`, `Tag`, `Tabs`, `Upload`, `Table`, `Empty`, `Skeleton` and `Popconfirm`. Use inline import area instead of modal for normal import. Use `DocumentGraphPanel` SVG with stable dimensions and click-to-select nodes.

- [ ] **Step 4: Add homepage special section**

In `App.tsx`, lazy load `DocumentWorkspace`, add active surface `'document-knowledge'`, add a non-numbered homepage “知识库” section via `DocumentHomeKnowledgeSection`, and keep existing numbered tool shortcuts unchanged. Do not add role association UI.

- [ ] **Step 5: Add styles**

Use `src/styles/app.css` for homepage section and `documentWorkspace.css` for workspace. Keep radius at or below existing tokens, use restrained borders, no nested cards, no decorative gradient/orb backgrounds.

- [ ] **Step 6: Verify Task 4**

Run:

```powershell
npx tsx --test src/components/DocumentWorkspace/documentKnowledgeModel.test.ts src/appStructure.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```powershell
git add src/App.tsx src/styles/app.css src/components/DocumentWorkspace/DocumentHomeKnowledgeSection.tsx src/components/DocumentWorkspace/DocumentWorkspace.tsx src/components/DocumentWorkspace/DocumentBrowserPanel.tsx src/components/DocumentWorkspace/DocumentGraphPanel.tsx src/components/DocumentWorkspace/useDocumentWorkspace.ts src/components/DocumentWorkspace/documentWorkspace.css src/components/DocumentWorkspace/index.tsx src/components/DocumentWorkspace/documentKnowledgeModel.ts src/components/DocumentWorkspace/documentKnowledgeModel.test.ts
git commit -m "feat: add document knowledge workspace UI"
```

### Task 5: Architecture Guards And Full Verification

**Files:**
- Modify: `src/appStructure.test.ts`
- Modify: `package.json`

**Interfaces:**
- Adds enforceable guards for document module boundaries and `entity_graph.json` only behavior.

- [ ] **Step 1: Write structure failing tests**

Add tests asserting:

- `src/components/DocumentWorkspace/*Panel.tsx` files do not import `projectSqliteRepository`, `projectLocalRepositoryProxy`, `projectRemoteRepositoryProxy`, `electron`, or `shjGraphImportAdapter`.
- `shjGraphImportAdapter.ts` does not import React.
- `documentKnowledgeImportService.ts` and repository files do not import `DocumentBrowserPanel`, `DocumentGraphPanel`, or `DocumentWorkspace`.
- `PersonalSpaceWorkspace` files do not import `DocumentWorkspace` or parse `entity_graph.json`.
- `shjGraphImportAdapter.ts` is the only `src/components` file that mentions `term_record`, `category_paths`, `site_relation`, or `source_kind`.
- `App.tsx` and homepage section mention `知识库` but do not mention 山海经-specific field names.
- No production source mentions accepting `graph.json`.

- [ ] **Step 2: Run structure tests to verify RED**

Run:

```powershell
npx tsx --test src/appStructure.test.ts
```

Expected: FAIL until all structure constraints are enforced and production code satisfies them.

- [ ] **Step 3: Implement guard-compliant fixes**

Move imports or helper functions until the guards pass. Add all new test files to `package.json` `scripts.test`.

- [ ] **Step 4: Run complete verification**

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
- `git diff --check`: no whitespace errors.
- `git status --short --branch`: only expected branch state and no unrelated `.agents` change staged.

- [ ] **Step 5: Runtime UI verification**

Start the dev server:

```powershell
npm run dev -- --host 127.0.0.1
```

Open the app in the in-app browser at the printed localhost URL. Verify desktop and mobile-ish widths:

- 首页显示“知识库”特殊栏目。
- 进入知识库工作区后可看到导入区域、搜索区域、详情区域和图谱画布。
- Graph canvas is nonblank when mock/imported rows exist and node click changes detail selection.
- Text does not overflow buttons, table cells or graph controls.

- [ ] **Step 6: Commit Task 5**

```powershell
git add src/appStructure.test.ts package.json
git commit -m "test: guard document knowledge module boundaries"
```

---

## Completion Checklist

- `entity_graph.json` 是唯一支持的 `shj_nlc_graph` 文件名。
- `graph.json` 不在生产导入支持路径内。
- 数据库存源文件元数据和 hash，不存原始 JSON。
- 图谱 JSON 被解析为 records、nodes、edges 和 link rows。
- 本地 SQLite、远程 PostgreSQL/MySQL schema、项目导出/导入、迁移 row set 都包含文档表。
- 首页有“知识库”栏目。
- 知识库工作区有搜索、详情和图谱画布。
- 第一版没有角色关联 UI、表或逻辑。
- 结构守卫覆盖模块边界。
- `npm test`、`npm run build`、`git diff --check` 通过。
