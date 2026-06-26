# 文档知识库模块设计

日期：2026-06-26
状态：草稿，待用户审阅

## 目标

为游戏设计工具增加项目级文档知识库模块，并在首页提供一个特殊的“知识库”栏目。第一批导入对象是现有 `shj_graph` 山海经静态图谱项目。

已确认的存储决策：

- 结构化文档知识数据存入新的项目数据库表。
- 源文件和导入的图谱 JSON 也存入新的项目数据库表。
- 后续渲染预览、导出包和生成产物可以继续使用项目对象资源，但它们不是权威源文档。
- 第一版不做角色关联。后续再通过显式关系表把角色关联到文档知识记录。

第一版要让“山海再就业”项目的数据能通过首页知识库栏目导入、浏览、搜索和图谱查看，同时避免为游戏设计工具维护一个长期私有分支。

## 当前上下文

当前项目存储系统已经支持：

- 本地项目使用 SQLite。
- 远程项目使用 PostgreSQL 或 MySQL，再配合 Qiniu Kodo。
- 项目对象资源和带缓存的资源读取。
- 角色、资产、剧情组和资产关系。
- 硬删除和本地到远程迁移。

当前资产类型是 `image`、`sprite`、`voice`。文档知识不应该硬塞进现有资产行里。新模块需要自己的表，因为源文件、节点、边、源记录和导入任务的查询方式与生命周期都不同于二进制素材资产。

现有 `shj_graph` 项目包含：

- Python 爬取器和静态图谱构建管线。
- 约 18 MB 到 24 MB 的静态图谱 JSON。
- Vite、Sigma、ECharts 浏览器界面。
- 可迁移到 React model 层的 TypeScript 图谱过滤和详情渲染逻辑。

## 非目标

第一版不做：

- 在 Electron 应用内运行 Python 爬虫。
- 用 iframe 保留独立 `shj_graph` 网页界面。
- 协作编辑、用户权限或成员系统。
- 全文搜索引擎、向量搜索、embedding 或 LLM 检索。
- 角色、剧情组或资产到文档节点的关联。
- 通用插件系统。
- 长期私有分支。

## 核心架构

新增工作区目录：

```text
src/components/DocumentWorkspace/
```

建议模块拆分：

- `documentKnowledgeTypes.ts`：数据库行类型、导入 DTO、图谱节点和边类型。
- `documentKnowledgeModel.ts`：纯映射、搜索文本、过滤器和关系标签。
- `documentKnowledgeImportModel.ts`：导入图谱 JSON 的验证和转换。
- `documentKnowledgeRepository.ts`：文档表 repository 接口。
- `documentKnowledgeImportService.ts`：导入编排和数据库源文件写入。
- `useDocumentWorkspace.ts`：React 工作流状态。
- `DocumentWorkspace.tsx`：工作区组合入口。
- `DocumentBrowserPanel.tsx`：密集列表、过滤器和详情面板。
- `DocumentGraphPanel.tsx`：第一版图谱画布和聚焦关系视图。

工作区入口只做组合。解析、转换和存储 IO 不进入 React 面板。

## 知识库接入规范

首页“知识库”栏目面向抽象知识库集合，不面向单一山海经实现。每个知识库导入源都要通过 adapter 接入，把外部数据转换为统一的 collection、source、node、edge 和筛选元数据。

建议 adapter 契约：

```ts
interface KnowledgeBaseImportAdapter {
  sourceType: string
  displayName: string
  acceptedFileNames: string[]
  validateSource(input: KnowledgeBaseSourceInput): KnowledgeBaseValidationResult
  convertSource(input: KnowledgeBaseSourceInput): KnowledgeBaseImportRows
  getNodeTypeLabel(nodeType: string): string
  getEdgeTypeLabel(edgeType: string): string
  getFilterMetadata(rows: KnowledgeBaseImportRows): KnowledgeBaseFilterMetadata
}
```

第一版内置 adapter：

```text
shj_nlc_graph
```

`shj_nlc_graph` 负责导入 `entity_graph.json` 或 `graph.json`，并把山海经图谱转换为统一文档表。后续其他知识库只要实现同一 adapter 契约，就可以复用首页知识库栏目、数据库表、搜索、详情和图谱画布。

结构要求：

- UI 不直接判断某个知识库是不是山海经。
- 文档表不增加山海经专用字段；专用数据进入 `metadata_json`、`record_json` 或 adapter 生成的过滤元数据。
- 首页知识库栏目从 `document_collections.source_type` 找到对应 adapter，用 adapter 提供的标签和过滤元数据渲染。
- 未识别的 `source_type` 可以显示基础列表、详情和原始关系，但不显示 adapter 专属过滤器。

## 数据归属

项目数据库是文档知识和导入源文件的事实来源：

- 知识集合。
- 源文件内容。
- 源文件指纹和导入元数据。
- 节点。
- 边。
- 导入状态。

第一版源文件不使用项目对象存储。项目对象存储保留给后续派生产物，例如渲染页图、导出包或预览缓存。

这个设计把文档数据保持在现有项目归属边界内，同时避免引入 `assets.kind = document` 这种混用。

## Schema

所有新表都要通过现有项目 schema 流程生成，并同时支持 SQLite、PostgreSQL 和 MySQL。需要更新 `PROJECT_SCHEMA_TABLES`、浏览器侧 schema 生成、Electron 本地 repository schema 和远程数据库 schema。

时间戳使用 ISO 字符串。PostgreSQL 使用 `jsonb`，MySQL 使用 `json`，SQLite 使用 `text`。

### `document_collections`

项目内的一个导入或手动创建的知识语料集合。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
name text not null
description text not null default ''
source_type text not null
status text not null
node_count integer not null default 0
edge_count integer not null default 0
created_at text not null
updated_at text not null
imported_at text null
metadata_json json/text null
```

第一版 `source_type`：

```text
shj_nlc_graph
imported_graph_json
manual
```

第一版 `status`：

```text
importing
ready
failed
```

建议约束和索引：

```text
unique(project_id, name)
index(project_id, status)
index(project_id, source_type)
```

### `document_sources`

存储在数据库中的源文件内容。集合由这些源文件生成。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
role text not null
file_name text not null
mime_group text not null
mime_type text not null
extension text not null
size_bytes integer not null default 0
hash_sha256 text null
encoding text not null default 'utf-8'
compression text not null default 'none'
content_text longtext/text null
content_blob blob/bytea/longblob null
created_at text not null
metadata_json json/text null
```

第一版 `role`：

```text
source_graph
entity_graph
raw_package
```

第一版存储规则：

- JSON 源文件以 UTF-8 文本存入 `content_text`。
- `content_blob` 预留给后续二进制源文件格式。
- 第一版 `compression = none`。后续可以增加压缩，但内容仍然归属数据库表。
- PostgreSQL 可使用 `text` 和 `bytea`。MySQL 应使用 `longtext` 和 `longblob`。SQLite 可使用 `text` 和 `blob`。

建议约束和索引：

```text
unique(project_id, collection_id, role, file_name)
index(project_id, collection_id)
index(project_id, role)
```

### `document_nodes`

可搜索的知识节点。对 `shj_graph` 来说，它由 `GraphNode` 映射而来。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
external_id text not null
node_type text not null
label text not null
description text not null default ''
search_text text not null default ''
record_ids_json json/text null
record_json json/text null
created_at text not null
updated_at text not null
metadata_json json/text null
```

建议约束和索引：

```text
unique(project_id, collection_id, external_id)
index(project_id, collection_id, node_type)
index(project_id, collection_id, label)
```

`search_text` 是第一版搜索使用的归一化字段拼接。对 `shj_graph`，应包含 label、description、实体角色名、类目路径、属地路径、书名、章节、利用方法、功效和源 URL 等存在的字段。

第一版可以使用数据库 `LIKE` 加应用侧排序。全文索引属于后续优化，因为 SQLite、PostgreSQL 和 MySQL 的实现差异较大。

### `document_edges`

文档节点之间的类型化图谱关系。对 `shj_graph` 来说，它由 `GraphEdge` 映射而来。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
external_id text not null
source_node_id text not null references document_nodes(id) on delete cascade
target_node_id text not null references document_nodes(id) on delete cascade
edge_type text not null
label text not null default ''
weight real not null default 1
record_ids_json json/text null
source_kind text not null default ''
created_at text not null
metadata_json json/text null
```

建议约束和索引：

```text
unique(project_id, collection_id, external_id)
index(project_id, collection_id, source_node_id)
index(project_id, collection_id, target_node_id)
index(project_id, collection_id, edge_type)
```

### `document_import_runs`

记录导入过程和失败信息。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text null references document_collections(id) on delete set null
source_type text not null
status text not null
started_at text not null
finished_at text null
total_nodes integer not null default 0
total_edges integer not null default 0
imported_nodes integer not null default 0
imported_edges integer not null default 0
error_message text null
report_json json/text null
```

第一版 `status`：

```text
running
succeeded
failed
```

建议索引：

```text
index(project_id, status)
index(project_id, collection_id)
index(project_id, started_at)
```

## Repository 契约

扩展项目 repository 层，UI 不直接读取文档表。

建议文档 repository 方法：

```ts
listDocumentCollections(projectId): Promise<DocumentCollection[]>
getDocumentCollection(projectId, collectionId): Promise<DocumentCollection | null>
createDocumentCollection(input): Promise<DocumentCollection>
deleteDocumentCollection(projectId, collectionId): Promise<void>
listDocumentSources(projectId, collectionId): Promise<DocumentSourceSummary[]>
getDocumentSourceContent(projectId, sourceId): Promise<DocumentSourceContent | null>

replaceDocumentGraph(input): Promise<DocumentImportResult>
searchDocumentNodes(input): Promise<DocumentNodeSearchResult>
getDocumentNode(projectId, nodeId): Promise<DocumentNodeDetails | null>
listDocumentNeighbors(projectId, nodeId): Promise<DocumentNeighbor[]>
```

`replaceDocumentGraph` 应在事务中执行：

1. 创建或更新 collection。
2. 插入 source 行。
3. 如果是替换集合，先删除旧节点和旧边。
4. 插入节点。
5. 在节点 ID 映射确定后插入边。
6. 更新节点数和边数。
7. 标记导入任务成功或失败。

## 导入流程

第一版支持用户选择本地图谱 JSON 导入。

流程：

1. 用户打开首页“知识库”栏目。
2. 用户导入 `entity_graph.json` 或 `graph.json`。
3. 知识库导入服务选择 `shj_nlc_graph` adapter。
4. 导入服务把原始 JSON 文件存入 `document_sources.content_text`。
5. 导入 model 验证图谱结构。
6. adapter 把图谱节点和边转换为 `document_nodes` 和 `document_edges`。
7. repository 在事务中写入行。
8. UI 把导入结果显示为一个 ready 的知识库集合，包括节点数、边数、搜索入口和图谱画布入口。

对 `shj_graph`，优先导入 `entity_graph.json`，没有时再导入 `graph.json`。

## `shj_graph` Adapter

创建一个聚焦 adapter，避免把山海经行为硬编码到应用各处。

建议文件：

```text
src/components/DocumentWorkspace/shjGraphImportAdapter.ts
```

节点映射：

- `GraphNode.id` -> `document_nodes.external_id`
- `GraphNode.type` -> `document_nodes.node_type`
- `GraphNode.label` -> `document_nodes.label`
- `GraphNode.records` -> `document_nodes.record_ids_json`
- `GraphNode.data.term_record ?? GraphNode.data.record` -> `document_nodes.record_json`
- 选定展示字段 -> `document_nodes.description`
- 归一化字段 -> `document_nodes.search_text`
- 剩余 data -> `document_nodes.metadata_json`

边映射：

- `GraphEdge.id` -> `document_edges.external_id`
- 映射后的节点 ID -> `source_node_id` 和 `target_node_id`
- `GraphEdge.type` -> `document_edges.edge_type`
- `GraphEdge.label` -> `document_edges.label`
- `GraphEdge.weight` -> `document_edges.weight`
- `GraphEdge.record_ids` -> `document_edges.record_ids_json`
- `GraphEdge.source_kind` -> `document_edges.source_kind`

如果边引用了未知节点，导入应失败并生成报告，不要静默丢弃边。

## UI 形态

使用产品型 UI 密度和现有 Ant Design 组件语言。

首页应增加一个特殊的“知识库”栏目。它不是普通素材处理工具卡，而是项目级知识集合入口，负责展示已导入知识库、导入新知识库、进入搜索/详情/图谱画布。

推荐第一版：

- 在首页工具列表旁或下方增加“知识库”栏目，展示当前项目下的知识库集合。
- 进入知识库栏目后，提供导入、浏览、搜索、详情和图谱画布。
- 图谱画布是第一版 UI 的组成部分，不推迟到后续阶段。
- 不改角色卡片，不增加角色知识关联入口。

首页知识库栏目：

- 标题：知识库。
- 集合列表：名称、来源类型、节点数、边数、最近导入时间、状态。
- 主操作：导入知识库。
- 集合操作：打开、替换导入、删除。

知识库工作区布局：

- 顶部工具条：当前集合、导入、刷新、搜索输入。
- 左侧或上方过滤条：节点类型、关系类型、是否有描述，以及 adapter 元数据支持的类目过滤。
- 主列表：可搜索节点和紧凑元数据。
- 详情面板：描述、源字段、相邻节点、原始来源 URL。
- 图谱画布：展示当前筛选结果或当前聚焦节点的邻域关系，支持点击节点进入详情。

能内联完成的流程不要优先使用 modal。第一版导入和浏览可以使用页面内面板；只有文件选择和确认替换集合等必要场景才使用 modal。

## 本地与远程行为

本地项目：

- 文档表存于本地 SQLite DB。
- 导入源文件存于本地 SQLite DB 的 `document_sources` 行。

远程项目：

- 文档表存于远程 DB。
- 导入源文件存于远程 DB 的 `document_sources` 行。
- 第一版文档源文件不使用 Qiniu Kodo。
- 普通集合列表不选取完整源内容。
- 节点和边从 DB 查询。

远程同步和迁移必须包含所有新文档表，包括 `document_sources.content_text` 和未来的 `document_sources.content_blob`。第一版必须更新导出/导入行结构和 repository proxy，让本地到远程迁移保留文档集合、源内容、节点、边和导入任务。

Repository 列表方法默认不得选取 `content_text` 和 `content_blob`。只有用户导出原始源、查看 raw source，或者替换/重建集合时，才读取源内容。

## 删除行为

文档集合删除是硬删除：

1. 删除 collection 行。
2. 级联删除 `document_sources`、节点、边和相关导入任务。
3. 如果后续版本增加派生对象资源，派生对象资源使用现有项目 cleanup task 策略。

第一版不支持单独删除节点。节点只通过集合替换或集合删除而删除。

## 结构守卫

更新 `src/appStructure.test.ts`，保护这些边界：

- `DocumentWorkspace` 面板不直接导入 DB adapter。
- 导入 adapter 不导入 React。
- 文档 repository 和导入 service 不导入 UI 面板。
- 第一版角色面板不导入文档工作区模块，也不解析图谱 JSON。
- `shjGraphImportAdapter` 是唯一包含山海经图谱结构假设的模块。
- 首页知识库栏目通过 adapter 契约渲染集合，不硬编码山海经字段。

## 测试策略

实现代码前先补测试。

Schema 测试：

- Schema 生成包含所有文档表。
- SQLite schema 初始化可重复执行。
- PostgreSQL 和 MySQL schema 生成包含等价逻辑表。
- 文档表名加入 `PROJECT_SCHEMA_TABLES`。

Model 和 adapter 测试：

- `shj_graph` 节点转换保留 external ID、type、label、records 和源记录数据。
- 搜索文本包含 label、description、类目路径、属地路径、书名、章节、利用方法和功效。
- 边转换映射 source 和 target 节点 ID。
- 边引用缺失节点时，导入验证失败。
- 写数据库前报告重复 external ID。
- adapter 契约测试覆盖 `sourceType`、文件名匹配、节点标签、边标签和过滤元数据。

Repository 测试：

- 导入图谱会创建一个 collection、source 行、节点和边。
- 源 JSON 内容持久化到 `document_sources.content_text`。
- collection/source 列表方法不选取 `content_text` 或 `content_blob`。
- 源内容只通过显式内容读取方法加载。
- 替换集合时先删除旧节点和旧边，再插入新行。
- 删除集合会删除节点、边和 sources。
- 项目行导出/导入包含文档表和源内容，用于迁移。

UI model 测试：

- 搜索可按集合、节点类型、关系类型和 query 过滤。
- 文档详情展示节点基础字段、源记录字段和相邻节点。
- 首页知识库栏目列出 ready/failed/importing 集合。
- 图谱画布接收筛选后的节点和边，并能通过节点选择驱动详情。

完整验证：

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

## 推进顺序

1. 增加文档表类型和 schema 测试。
2. 增加 repository 接口和内存测试实现。
3. 增加 SQLite、本地 Electron 和远程 DB schema 支持。
4. 增加 `shj_graph` 导入 adapter 测试和纯转换代码。
5. 增加导入 service，把源 JSON 存入 `document_sources.content_text`，并在事务中写入 DB 行。
6. 增加首页“知识库”栏目和集合列表。
7. 增加文档工作区浏览、搜索、详情和图谱画布 UI。
8. 更新项目导出/导入、远程同步和本地到远程迁移。
9. 增加结构守卫。
10. 运行完整验证。

## 待决问题

实现前需要确认：

1. 导入第一版只接受 `entity_graph.json`，还是同时接受 `entity_graph.json` 和 `graph.json`。推荐两者都接受，存在 `entity_graph.json` 时优先使用。

## 后续阶段：角色关联

角色关联不属于第一版。后续阶段再增加：

- `character_document_links` 表。
- 角色卡片中的知识关联区域。
- 跨 collection 的文档节点 picker。
- 角色删除和集合删除时的链接级联测试。
- 自定义 relation type 或固定 relation type 的产品决策。
