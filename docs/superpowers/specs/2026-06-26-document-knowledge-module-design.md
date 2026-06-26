# 文档知识库模块设计

日期：2026-06-26
状态：交互方向已确认，规格待复核

## 目标

为游戏设计工具增加项目级文档知识库模块，并在首页提供一个特殊的“知识库”栏目。第一批导入对象是现有 `shj_graph` 山海经静态图谱项目。

已确认的存储决策：

- 结构化文档知识数据存入新的项目数据库表。
- 导入的图谱 JSON 不是知识查询时直接使用的结构；导入服务解析 JSON 后，把规范化的记录、节点、边和关系写入数据库。
- 数据库保存源文件元数据、指纹和源文件内容。源文件内容进入独立源内容表，不混入节点、边、记录或 `metadata_json`。
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
- `documentGraphViewModel.ts`：admin 风格图谱投影、过滤、类目树、聚焦、详情和 ECharts option。
- `documentKnowledgeRepository.ts`：文档表 repository 接口。
- `documentKnowledgeImportService.ts`：导入编排、源文件元数据、源文件内容和规范化知识行写入。
- `useDocumentWorkspace.ts`：React 工作流状态。
- `DocumentWorkspace.tsx`：工作区组合入口。
- `DocumentCollectionToolbar.tsx`：当前集合、导入、删除、刷新和集合统计。
- `DocumentGraphControlsPanel.tsx`：左侧过滤控制。
- `DocumentGraphCanvasPanel.tsx`：中间列表模式和 ECharts 图谱模式。
- `DocumentGraphDetailsPanel.tsx`：右侧节点详情和相邻节点。

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

`shj_nlc_graph` 负责导入 `entity_graph.json`，并把山海经实体图谱转换为统一文档表。第一版不兼容 `graph.json`。后续其他知识库只要实现同一 adapter 契约，就可以复用首页知识库栏目、数据库表、搜索、详情和图谱画布。

结构要求：

- UI 不直接判断某个知识库是不是山海经。
- 文档表不增加山海经专用字段；通用记录字段进入 `document_records`，低频补充字段进入对应行的 `metadata_json`，过滤能力由 adapter 生成的过滤元数据描述。
- 首页知识库栏目从 `document_collections.source_type` 找到对应 adapter，用 adapter 提供的标签和过滤元数据渲染。
- 未识别的 `source_type` 可以显示基础列表、详情和原始关系，但不显示 adapter 专属过滤器。

## 数据归属

项目数据库是解析后的文档知识、导入源文件元数据和源文件内容的事实来源：

- 知识集合。
- 源文件指纹、导入元数据和源文件内容。
- 规范化源记录。
- 节点。
- 边。
- 节点到源记录的关系。
- 边到源记录的关系。
- 导入状态。

第一版把原始源文件内容存入数据库的源内容表，用于审计、迁移和后续重新处理。知识浏览、搜索、详情和图谱渲染不直接读取原始 JSON，而是读取解析后的记录、节点、边和关系表。项目对象存储保留给后续派生产物，例如渲染页图、导出包或预览缓存。

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
record_count integer not null default 0
node_count integer not null default 0
edge_count integer not null default 0
created_at text not null
updated_at text not null
imported_at text null
metadata_json json/text null
```

已知和预留的 `source_type`：

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

存储导入源文件的元数据和指纹。集合由这些源文件解析生成；原始文件内容存入 `document_source_contents`，避免普通 source 列表查询携带大文本。

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

- JSON 源文件在导入时读取、解析并写入 `document_source_contents.content_text`。
- `document_sources` 只保存文件名、大小、hash、mime、role、encoding 和导入元数据。
- 普通 UI 不展示 `entity_graph.json · 24167 KB · 19d6d56697` 这类源文件摘要。
- 原始 JSON 不进入 `metadata_json`，也不进入记录、节点或边表。

建议约束和索引：

```text
unique(project_id, collection_id, role, file_name)
index(project_id, collection_id)
index(project_id, role)
```

### `document_source_contents`

存储导入源文件正文。第一版只处理 UTF-8 JSON 文本，因此用文本列保存；后续如果接入二进制源文件，再另行增加对象资源或二进制内容策略。

`content_text` 的数据库类型必须能容纳 24 MB 级别的 JSON：SQLite 使用 `text`，PostgreSQL 使用 `text`，MySQL 使用 `longtext`。

```text
source_id text primary key references document_sources(id) on delete cascade
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
content_text text/longtext not null
content_encoding text not null default 'utf-8'
size_bytes integer not null default 0
hash_sha256 text null
created_at text not null
metadata_json json/text null
```

建议索引：

```text
index(project_id, collection_id)
```

源内容表只服务归档、迁移和未来重新解析，不参与常规列表、图谱过滤和详情渲染。导入校验必须确认 `document_sources.hash_sha256` 与 `document_source_contents.hash_sha256` 一致。

### `document_records`

从源文件中解析出的规范化源记录。对 `shj_graph`，它对应词条详情或实体记录，而不是原始 JSON blob。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
source_id text not null references document_sources(id) on delete cascade
external_id text not null
record_type text not null default ''
title text not null
description text not null default ''
category_1 text null
category_2 text null
category_3 text null
place_path text null
book_title text null
chapter_title text null
version_title text null
usage_text text null
effect_text text null
source_url text null
search_text text not null default ''
created_at text not null
updated_at text not null
metadata_json json/text null
```

建议约束和索引：

```text
unique(project_id, collection_id, external_id)
index(project_id, collection_id, record_type)
index(project_id, collection_id, title)
index(project_id, collection_id, category_1)
index(project_id, collection_id, category_2)
index(project_id, collection_id, category_3)
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

### `document_node_record_links`

节点到源记录的关系。它替代在节点行里保存 `record_ids_json`。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
node_id text not null references document_nodes(id) on delete cascade
record_id text not null references document_records(id) on delete cascade
link_role text not null default 'related'
created_at text not null
```

建议约束和索引：

```text
unique(project_id, node_id, record_id, link_role)
index(project_id, collection_id, node_id)
index(project_id, collection_id, record_id)
```

### `document_edge_record_links`

边到源记录的关系。它替代在边行里保存 `record_ids_json`。

```text
id text primary key
project_id text not null references projects(id) on delete cascade
collection_id text not null references document_collections(id) on delete cascade
edge_id text not null references document_edges(id) on delete cascade
record_id text not null references document_records(id) on delete cascade
created_at text not null
```

建议约束和索引：

```text
unique(project_id, edge_id, record_id)
index(project_id, collection_id, edge_id)
index(project_id, collection_id, record_id)
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
total_records integer not null default 0
total_nodes integer not null default 0
total_edges integer not null default 0
imported_records integer not null default 0
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
getDocumentCollectionGraph(projectId, collectionId): Promise<DocumentCollectionGraph>
searchDocumentRecords(input): Promise<DocumentRecordSearchResult>
searchDocumentNodes(input): Promise<DocumentNodeSearchResult>
getDocumentNode(projectId, nodeId): Promise<DocumentNodeDetails | null>
listDocumentNeighbors(projectId, nodeId): Promise<DocumentNeighbor[]>
```

`replaceDocumentGraph` 应在事务中执行：

1. 如果是替换集合，先删除旧 source、source content、records、nodes、edges、link 行和旧导入任务。
2. 创建或更新 collection。
3. 插入 source 元数据行和 source content 行。
4. 插入规范化 records。
5. 插入节点。
6. 在节点 ID 映射确定后插入边。
7. 插入 node-record 和 edge-record link 行。
8. 更新记录数、节点数和边数。
9. 标记导入任务成功或失败。

`getDocumentCollectionGraph` 返回适配 admin 交互模型的图谱投影：

```ts
interface DocumentCollectionGraph {
  nodes: Record<string, DocumentGraphNode>
  edges: Record<string, DocumentGraphEdge>
}
```

该方法从 `document_nodes`、`document_edges`、`document_records`、`document_node_record_links`、`document_edge_record_links` 和 `metadata_json` 组装数据，不读取 `document_source_contents.content_text`。源内容读取只用于审计、迁移、导出或未来重新解析。

## 导入流程

第一版支持用户选择本地图谱 JSON 导入。

流程：

1. 用户打开首页“知识库”栏目。
2. 用户导入 `entity_graph.json`。
3. 知识库导入服务选择 `shj_nlc_graph` adapter。
4. 导入服务读取 JSON，计算文件大小和 hash，把源文件元数据写入 `document_sources`，把源文件正文写入 `document_source_contents`。
5. 导入 model 验证图谱结构。
6. adapter 分析图谱 JSON，转换为 `document_records`、`document_nodes`、`document_edges`、`document_node_record_links` 和 `document_edge_record_links`。
7. repository 在事务中写入源文件内容和规范化行。
8. UI 把导入结果显示为一个 ready 的知识库集合，包括记录数、节点数、边数、搜索入口和图谱画布入口。

对 `shj_graph`，第一版只接受 `entity_graph.json`。如果用户选择 `graph.json`，导入应明确失败并提示选择实体图谱文件。

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
- `GraphNode.records` -> `document_node_record_links`
- 选定展示字段 -> `document_nodes.description`
- 归一化字段 -> `document_nodes.search_text`
- 剩余 data -> `document_nodes.metadata_json`

源记录映射：

- `GraphNode.data.term_record ?? GraphNode.data.record` -> `document_records`
- 词条 ID 或 record ID -> `document_records.external_id`
- 标题/名称 -> `document_records.title`
- 描述 -> `document_records.description`
- 一级/二级/三级类目 -> `category_1`、`category_2`、`category_3`
- 属地 -> `place_path`
- 出处 -> `book_title`、`chapter_title`、`version_title`
- 利用方法和功效 -> `usage_text`、`effect_text`
- 原站链接 -> `source_url`
- 参与搜索的文本 -> `search_text`
- 未建模的低频字段 -> `metadata_json`

边映射：

- `GraphEdge.id` -> `document_edges.external_id`
- 映射后的节点 ID -> `source_node_id` 和 `target_node_id`
- `GraphEdge.type` -> `document_edges.edge_type`
- `GraphEdge.label` -> `document_edges.label`
- `GraphEdge.weight` -> `document_edges.weight`
- `GraphEdge.record_ids` -> `document_edge_record_links`
- `GraphEdge.source_kind` -> `document_edges.source_kind`

如果边引用了未知节点，导入应失败并生成报告，不要静默丢弃边。

导入禁止把整份 `entity_graph.json` 原样写入 `metadata_json`、记录表、节点表或边表。完整源文件只能写入 `document_source_contents.content_text`，`metadata_json` 只保存已解析实体的补充字段。

## UI 形态

使用产品型 UI 密度和现有 Ant Design 组件语言。

首页应增加一个特殊的“知识库”栏目。它不是普通素材处理工具卡，而是项目级知识集合入口，负责展示已导入知识库、导入新知识库、进入搜索/详情/图谱画布。

推荐第一版：

- 在首页工具列表旁或下方增加“知识库”栏目，展示当前项目下的知识库集合。
- 进入知识库栏目后，提供导入、浏览、搜索、详情和图谱画布。
- 图谱画布是第一版 UI 的组成部分，不推迟到后续阶段。
- 不改角色卡片，不增加角色知识关联入口。

### 首页知识库栏目

- 标题：知识库。
- 集合列表：名称、来源类型、记录数、节点数、边数、最近导入时间、状态。
- 主操作：导入知识库。
- 集合操作：打开、替换导入、删除。

### 知识库工作区

知识库工作区的逻辑和交互参考 `D:\devgame\山海再就业\services\admin` 的 `shj-graph` 模块，采用三栏布局：

```text
左侧过滤控制 | 中间列表或图谱画布 | 右侧详情
```

顶部集合栏保留在工作区上方：

- 当前集合选择。
- 导入集合。
- 删除集合。
- 刷新。
- 集合统计：记录、节点、关系。

不展示源文件摘要，例如 `entity_graph.json · 24167 KB · 19d6d56697`。

左侧过滤控制参考 admin 的 `shj-graph-controls`：

- 标题：山海经图谱，后续其他 adapter 可替换为 adapter 显示名。
- 当前可见节点和关系统计。
- 搜索输入和搜索按钮。
- 搜索状态提示：聚焦时暂时忽略关键词。
- 是否有描述：全部、有描述、无描述。
- 层级类目关联展示筛选。
- 类目树筛选输入。
- 类目树：一级、二级、三级类目，可勾选。
- 实体角色筛选：词条、属地、类目。只有当前图谱存在 `entity` 节点时显示。
- 节点类型筛选：术语、类目、属地、出处书、章节、版本、描述特征等。没有 `entity` 节点时显示。
- 关系类型筛选。
- 重置视图。

中间区域参考 admin 的 `shj-graph-canvas`，拥有两个模式：

- `list`：默认模式，无聚焦节点时展示筛选结果列表。
- `graph`：聚焦模式，选中某个节点后展示 ECharts force graph。

列表模式：

- 列表标题为“筛选结果”。
- 如果图谱存在 `entity` 节点，列表主项为 `entity`；否则主项为 `term`。
- 列表按中文标签排序。
- 每行展示节点名、角色、类目路径、属地等紧凑元数据。
- 每行提供“查看详情”，点击后设置聚焦节点并切换到图谱模式。

图谱模式：

- 使用当前项目已接入的 ECharts，不使用 admin 的 CDN 加载。
- 采用 force graph、可拖拽、可缩放平移、节点标签常显。
- 节点颜色和分类参考 admin：术语、描述、类目、归属。
- 聚焦节点放大并高亮。
- 边显示箭头和关系标签。
- 右键图谱节点触发 admin 的 context action：普通节点切换聚焦，类目节点可转为类目筛选。
- ECharts 缺失或初始化失败时显示内联错误，不让页面空白。

右侧详情参考 admin 的 `shj-graph-details`：

- 未选择节点时显示“选择一个节点查看信息”。
- 选择节点后显示标题、节点类型、角色、描述、类目路径、一级/二级/三级类目、利用方法、功效、属地、出处和原站链接。
- 下方显示相邻节点列表。
- 相邻节点按关系标签分组展示，描述聚合节点的子项可以展开显示。
- 可聚焦的相邻节点用按钮呈现，点击后继续聚焦并刷新中间图谱。

响应式行为：

- 宽屏保持三栏。
- 中等宽度变为左侧过滤和中间主区域两栏，详情落到下方。
- 小屏改为单列，过滤、主区域和详情顺序排列，图谱区域保留稳定高度。

### 交互状态机

工作区状态：

```ts
interface DocumentGraphFilterState {
  query: string
  categories: string[]
  categoryLevel?: 1 | 2 | 3
  categoryFilters?: Array<{ level: 1 | 2 | 3; value: string; parent?: string; grandparent?: string }>
  entityRoles?: string[]
  description: 'all' | 'with' | 'without'
  nodeTypes: string[]
  edgeTypes: string[]
  focusNodeId?: string
  focusRecordId?: string
}
```

状态规则：

- 搜索提交会清除 `focusNodeId` 和 `focusRecordId`，回到列表模式。
- 聚焦状态下暂时忽略关键词过滤，保持 admin 的交互提示。
- 选择列表节点会设置 `focusNodeId`，进入图谱模式。
- 右侧邻居节点点击会设置新的 `focusNodeId`。
- 类目节点 context action 会清除聚焦，并转为类目筛选。
- 重置视图清空搜索、类目、聚焦，恢复全部实体角色、节点类型和关系类型。
- 当前集合切换会重建过滤默认值并清空聚焦。

第一版不需要把 `focus` 和 `record` 写入 URL。当前应用是 Electron 单页工具，工具切换不依赖浏览器路由；聚焦状态保存在 React hook 内即可。后续如需深链接，再引入 URL 同步。

### 图谱数据投影

前端不直接消费 `entity_graph.json`。进入集合后，hook 调用 `getDocumentCollectionGraph`，把数据库行组装为 admin 兼容的 `GraphData`：

```ts
interface GraphData {
  nodes: Record<string, GraphNode>
  edges: Record<string, GraphEdge>
}
```

节点投影：

- `DocumentNode.id` -> `GraphNode.id`
- `DocumentNode.label` -> `GraphNode.label`
- `DocumentNode.node_type` -> `GraphNode.type`
- `document_node_record_links` -> `GraphNode.records`
- `DocumentNode.metadata_json.roles` -> `GraphNode.data.roles`
- `DocumentNode.metadata_json.category_paths` -> `GraphNode.data.category_paths`
- 关联的第一条 `DocumentRecord` -> `GraphNode.data.term_record`

边投影：

- `DocumentEdge.id` -> `GraphEdge.id`
- `DocumentEdge.source_node_id` -> `GraphEdge.source`
- `DocumentEdge.target_node_id` -> `GraphEdge.target`
- `DocumentEdge.edge_type` -> `GraphEdge.type`
- `DocumentEdge.label` -> `GraphEdge.label`
- `document_edge_record_links` -> `GraphEdge.record_ids`
- `DocumentEdge.source_kind` -> `GraphEdge.source_kind`

纯 model 层复刻 admin 的 `filterGraph`、`buildCategoryTree`、`focusTargetForNode`、`contextMenuTargetForNode`、`describeNode` 和 `toEChartsOption` 行为，并用当前项目类型命名。React 组件只负责渲染和派发事件。

能内联完成的流程不要优先使用 modal。第一版导入和浏览可以使用页面内面板；只有文件选择和确认替换集合等必要场景才使用 modal。

## 本地与远程行为

本地项目：

- 文档表存于本地 SQLite DB。
- 导入源文件元数据、源文件内容、规范化记录、节点、边和 link 行存于本地 SQLite DB。

远程项目：

- 文档表存于远程 DB。
- 导入源文件元数据、源文件内容、规范化记录、节点、边和 link 行存于远程 DB。
- 第一版文档源 JSON 不使用 Qiniu Kodo，源内容直接进入远程 DB 的 `document_source_contents`。
- 普通集合列表只读取集合摘要和计数字段。
- 记录、节点和边从 DB 查询。

远程同步和迁移必须包含所有新文档表。第一版必须更新导出/导入行结构和 repository proxy，让本地到远程迁移保留文档集合、源文件元数据、源文件内容、规范化记录、节点、边、link 行和导入任务。

Repository 可以提供受限的 `getDocumentSourceContent`，用于迁移、导出、审计或未来重新解析。普通知识库 UI 不调用它，也不在集合摘要中展示原始源文件内容。

## 删除行为

文档集合删除是硬删除：

1. 删除 collection 行。
2. 级联删除 `document_sources`、`document_source_contents`、records、nodes、edges、link 行和相关导入任务。
3. 如果后续版本增加派生对象资源，派生对象资源使用现有项目 cleanup task 策略。

第一版不支持单独删除节点。节点只通过集合替换或集合删除而删除。

## 结构守卫

更新 `src/appStructure.test.ts`，保护这些边界：

- `DocumentWorkspace` 面板不直接导入 DB adapter。
- 导入 adapter 不导入 React。
- 文档 repository 和导入 service 不导入 UI 面板。
- 图谱过滤、聚焦、类目树和 ECharts option 逻辑放在纯 model 文件，不放进 React 组件。
- 第一版角色面板不导入文档工作区模块，也不解析图谱 JSON。
- `shjGraphImportAdapter` 是唯一包含山海经图谱结构假设的模块。
- 首页知识库栏目通过 adapter 契约渲染集合，不硬编码山海经字段。
- 普通知识库 UI 不读取 `document_source_contents.content_text`。

## 测试策略

实现代码前先补测试。

Schema 测试：

- Schema 生成包含所有文档表。
- Schema 生成包含 `document_source_contents`，并能和 `document_sources` 级联删除。
- SQLite schema 初始化可重复执行。
- PostgreSQL 和 MySQL schema 生成包含等价逻辑表。
- 文档表名加入 `PROJECT_SCHEMA_TABLES`。

Model 和 adapter 测试：

- `shj_graph` 转换会从图谱 JSON 生成规范化 records、nodes、edges 和 link 行。
- 节点转换保留 external ID、type、label 和搜索字段。
- 源记录转换保留 title、description、类目路径、属地路径、书名、章节、利用方法、功效和 source URL。
- 搜索文本来自规范化字段，不依赖原始 JSON blob。
- 边转换映射 source 和 target 节点 ID。
- `GraphNode.records` 转换为 `document_node_record_links`。
- `GraphEdge.record_ids` 转换为 `document_edge_record_links`。
- 边引用缺失节点时，导入验证失败。
- 写数据库前报告重复 external ID。
- 不允许 adapter 输出完整源 JSON 到 `metadata_json`、记录、节点或边。
- 导入 service 会把完整源 JSON 写入 `document_source_contents`。
- adapter 契约测试覆盖 `sourceType`、文件名匹配、节点标签、边标签和过滤元数据。
- 图谱投影会从数据库行组装出 admin 兼容的 `GraphData`。
- `filterGraph` 按类目路径、角色、是否有描述、节点类型和关系类型过滤。
- 无聚焦时只显示主实体及其允许展示的邻居。
- 聚焦实体时显示入边和出边的三层关系链。
- 多条描述关系会聚合到虚拟“描述”节点。
- 类目树从 `category_paths` 和记录类目字段构建。
- context action 能把类目节点转换为类目筛选。

Repository 测试：

- 导入图谱会创建一个 collection、source 元数据行、source content 行、records、nodes、edges 和 link 行。
- `document_sources` 只保存源文件元数据和 hash，完整 JSON 内容进入 `document_source_contents`。
- `getDocumentSourceContent` 可读取源内容，但普通集合列表不返回源正文。
- 替换集合时先删除旧 records、nodes、edges 和 link 行，再插入新行。
- 替换集合时同步替换 source content。
- 删除集合会删除 sources、source contents、records、nodes、edges 和 link 行。
- 项目行导出/导入包含文档规范化表，用于迁移。

UI model 测试：

- 搜索提交会清除聚焦并返回列表模式。
- 聚焦状态下关键词暂时忽略，并显示提示。
- 列表模式按 admin 规则展示 entity 或 term 主项。
- 图谱模式只在有聚焦节点时渲染 ECharts。
- 文档详情展示节点基础字段、源记录字段、相邻节点和可继续聚焦的邻居按钮。
- 首页知识库栏目列出 ready/failed/importing 集合。
- 图谱画布接收筛选后的节点和边，并能通过节点选择、右键和详情邻居点击驱动聚焦。

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
5. 增加导入 service，读取并分析源 JSON，把源文件元数据、源文件内容和规范化知识行在事务中写入 DB。
6. 增加首页“知识库”栏目和集合列表。
7. 增加集合图谱投影、admin 风格过滤模型、类目树、聚焦和详情模型。
8. 增加文档工作区三栏 UI：左侧过滤、中间列表/图谱、右侧详情。
9. 更新项目导出/导入、远程同步和本地到远程迁移。
10. 增加结构守卫。
11. 运行完整验证。

## 后续阶段：角色关联

角色关联不属于第一版。后续阶段再增加：

- `character_document_links` 表。
- 角色卡片中的知识关联区域。
- 跨 collection 的文档节点 picker。
- 角色删除和集合删除时的链接级联测试。
- 自定义 relation type 或固定 relation type 的产品决策。
