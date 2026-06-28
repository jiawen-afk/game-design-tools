import {
  createRemoteProjectRepository,
  databaseProfile,
  documentGraphInput,
  postgresqlPayload,
  tableDefinitions,
  type RemoteProjectRepository,
} from './projectRemoteRepositoryTestHelpers.test'

export { documentGraphInput, tableDefinitions }

export interface RemoteDocumentGraphQuery {
  statement: string
  params: unknown[]
}

interface QueryResult {
  rows?: unknown[]
}

type QueryHandler = (statement: string, params: unknown[]) => QueryResult | Promise<QueryResult>

export function createDocumentGraphRepository(handleQuery: QueryHandler = () => ({ rows: [] })) {
  const queries: RemoteDocumentGraphQuery[] = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        return handleQuery(statement, params)
      },
      end: async () => {},
    }),
  })

  return { queries, repository }
}

export function replaceDocumentGraph(
  repository: Pick<RemoteProjectRepository, 'replaceDocumentGraph'>,
  graph = documentGraphInput('p1'),
) {
  return repository.replaceDocumentGraph({
    projectId: 'p1',
    collection: graph.collection,
    sources: graph.sources,
    sourceContents: graph.sourceContents,
    records: graph.records,
    nodes: graph.nodes,
    edges: graph.edges,
    nodeRecordLinks: graph.nodeRecordLinks,
    edgeRecordLinks: graph.edgeRecordLinks,
    importRun: graph.importRun,
  })
}
