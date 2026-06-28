const {
  getLocalProjectRepository,
} = require('./projectStorageIpcContext.cjs')

function registerProjectLocalRepositoryIpcHandlers({ app, ipcMain }) {
  ipcMain.handle('project-local-repository:initialize', async () => {
    await getLocalProjectRepository(app).initializeSchema()
    return true
  })

  ipcMain.handle('project-local-repository:create-project', async (_event, input = {}) => (
    getLocalProjectRepository(app).createProject(input)
  ))

  ipcMain.handle('project-local-repository:create-remote-project', async (_event, input = {}) => (
    getLocalProjectRepository(app).createRemoteProject(input)
  ))

  ipcMain.handle('project-local-repository:update-project', async (_event, projectId, input = {}) => (
    getLocalProjectRepository(app).updateProject(String(projectId || ''), input)
  ))

  ipcMain.handle('project-local-repository:list-projects', async () => (
    getLocalProjectRepository(app).listProjects()
  ))

  ipcMain.handle('project-local-repository:get-project', async (_event, projectId) => (
    getLocalProjectRepository(app).getProject(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:import-rows', async (_event, rows) => {
    await getLocalProjectRepository(app).importProjectRows(rows)
    return true
  })

  ipcMain.handle('project-local-repository:export-rows', async (_event, projectId) => (
    getLocalProjectRepository(app).exportProjectRows(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:list-assets', async (_event, projectId) => (
    getLocalProjectRepository(app).listAssets(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:add-cleanup-tasks', async (_event, tasks = []) => {
    await getLocalProjectRepository(app).addCleanupTasks(Array.isArray(tasks) ? tasks : [])
    return true
  })

  ipcMain.handle('project-local-repository:list-cleanup-tasks', async (_event, projectId) => (
    getLocalProjectRepository(app).listCleanupTasks(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:list-document-collections', async (_event, projectId) => (
    getLocalProjectRepository(app).listDocumentCollections(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:get-document-collection', async (_event, projectId, collectionId) => (
    getLocalProjectRepository(app).getDocumentCollection(String(projectId || ''), String(collectionId || ''))
  ))

  ipcMain.handle('project-local-repository:delete-document-collection', async (_event, projectId, collectionId) => {
    await getLocalProjectRepository(app).deleteDocumentCollection(String(projectId || ''), String(collectionId || ''))
    return true
  })

  ipcMain.handle('project-local-repository:list-document-sources', async (_event, projectId, collectionId) => (
    getLocalProjectRepository(app).listDocumentSources(String(projectId || ''), String(collectionId || ''))
  ))

  ipcMain.handle('project-local-repository:get-document-source-content', async (_event, projectId, sourceId) => (
    getLocalProjectRepository(app).getDocumentSourceContent(String(projectId || ''), String(sourceId || ''))
  ))

  ipcMain.handle('project-local-repository:get-document-collection-graph', async (_event, projectId, collectionId) => (
    getLocalProjectRepository(app).getDocumentCollectionGraph(String(projectId || ''), String(collectionId || ''))
  ))

  ipcMain.handle('project-local-repository:replace-document-graph', async (_event, input = {}) => (
    getLocalProjectRepository(app).replaceDocumentGraph(input)
  ))

  ipcMain.handle('project-local-repository:search-document-records', async (_event, input = {}) => (
    getLocalProjectRepository(app).searchDocumentRecords(input)
  ))

  ipcMain.handle('project-local-repository:search-document-nodes', async (_event, input = {}) => (
    getLocalProjectRepository(app).searchDocumentNodes(input)
  ))

  ipcMain.handle('project-local-repository:get-document-node', async (_event, projectId, nodeId) => (
    getLocalProjectRepository(app).getDocumentNode(String(projectId || ''), String(nodeId || ''))
  ))

  ipcMain.handle('project-local-repository:list-document-neighbors', async (_event, projectId, nodeId) => (
    getLocalProjectRepository(app).listDocumentNeighbors(String(projectId || ''), String(nodeId || ''))
  ))

  ipcMain.handle('project-local-repository:delete-project', async (_event, projectId) => {
    await getLocalProjectRepository(app).deleteProject(String(projectId || ''))
    return true
  })

  ipcMain.handle('project-device-bindings:list', async () => (
    getLocalProjectRepository(app).list()
  ))

  ipcMain.handle('project-device-bindings:write', async (_event, projectId, binding = {}) => {
    await getLocalProjectRepository(app).write(String(projectId || ''), binding)
    return true
  })

  ipcMain.handle('project-device-bindings:clear', async (_event, projectId) => {
    await getLocalProjectRepository(app).clear(String(projectId || ''))
    return true
  })
}

module.exports = {
  registerProjectLocalRepositoryIpcHandlers,
}
