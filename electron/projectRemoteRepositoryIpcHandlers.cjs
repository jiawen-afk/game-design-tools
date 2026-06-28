const {
  getRemoteDatabaseRepository,
} = require('./projectStorageIpcContext.cjs')

function registerProjectRemoteRepositoryIpcHandlers({ app, ipcMain }) {
  ipcMain.handle('project-remote-repository:create-project', async (_event, input = {}) => {
    const repository = await getRemoteDatabaseRepository(app, String(input.databaseProfileId || ''))
    return repository.createRemoteProject(input)
  })

  ipcMain.handle('project-remote-repository:update-project', async (_event, projectId, input = {}, databaseProfileId = '') => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || input.databaseProfileId || ''))
    return repository.updateProject(String(projectId || ''), input)
  })

  ipcMain.handle('project-remote-repository:list-projects', async (_event, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listProjects()
  })

  ipcMain.handle('project-remote-repository:get-project', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getProject(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:import-rows', async (_event, rows, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.importProjectRows(rows)
    return true
  })

  ipcMain.handle('project-remote-repository:export-rows', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.exportProjectRows(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:list-assets', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listAssets(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:add-cleanup-tasks', async (_event, tasks = [], databaseProfileId) => {
    const normalizedTasks = Array.isArray(tasks) ? tasks : []
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.addCleanupTasks(normalizedTasks)
    return true
  })

  ipcMain.handle('project-remote-repository:list-cleanup-tasks', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listCleanupTasks(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:list-document-collections', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listDocumentCollections(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:get-document-collection', async (_event, projectId, collectionId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getDocumentCollection(String(projectId || ''), String(collectionId || ''))
  })

  ipcMain.handle('project-remote-repository:delete-document-collection', async (_event, projectId, collectionId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.deleteDocumentCollection(String(projectId || ''), String(collectionId || ''))
    return true
  })

  ipcMain.handle('project-remote-repository:list-document-sources', async (_event, projectId, collectionId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listDocumentSources(String(projectId || ''), String(collectionId || ''))
  })

  ipcMain.handle('project-remote-repository:get-document-source-content', async (_event, projectId, sourceId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getDocumentSourceContent(String(projectId || ''), String(sourceId || ''))
  })

  ipcMain.handle('project-remote-repository:get-document-collection-graph', async (_event, projectId, collectionId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getDocumentCollectionGraph(String(projectId || ''), String(collectionId || ''))
  })

  ipcMain.handle('project-remote-repository:replace-document-graph', async (_event, input = {}, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.replaceDocumentGraph(input)
  })

  ipcMain.handle('project-remote-repository:search-document-records', async (_event, input = {}, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.searchDocumentRecords(input)
  })

  ipcMain.handle('project-remote-repository:search-document-nodes', async (_event, input = {}, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.searchDocumentNodes(input)
  })

  ipcMain.handle('project-remote-repository:get-document-node', async (_event, projectId, nodeId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getDocumentNode(String(projectId || ''), String(nodeId || ''))
  })

  ipcMain.handle('project-remote-repository:list-document-neighbors', async (_event, projectId, nodeId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listDocumentNeighbors(String(projectId || ''), String(nodeId || ''))
  })

  ipcMain.handle('project-remote-repository:delete-project', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.deleteProject(String(projectId || ''))
    return true
  })
}

module.exports = {
  registerProjectRemoteRepositoryIpcHandlers,
}
