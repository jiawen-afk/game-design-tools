const electron = require('electron')

const invoke = (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args)
const on = (channel, listener) => {
  const wrapped = (_event, payload) => listener(payload)
  electron.ipcRenderer.on(channel, wrapped)
  return () => electron.ipcRenderer.removeListener(channel, wrapped)
}

electron.contextBridge.exposeInMainWorld('gameDesignToolsDesktop', {
  selectPersonalSpaceDirectory: () => invoke('personal-space:select-directory'),
  registerPersonalSpaceDirectory: (rootPath) => invoke('personal-space:register-directory', rootPath),
  ensurePersonalSpaceDirectory: (parentPath, name, options) => invoke('personal-space:ensure-directory', parentPath, name, options),
  getPersonalSpaceFile: (parentPath, name, options) => invoke('personal-space:get-file', parentPath, name, options),
  readPersonalSpaceFile: (filePath) => invoke('personal-space:read-file', filePath),
  writePersonalSpaceFile: (filePath, data) => invoke('personal-space:write-file', filePath, data),
  removePersonalSpaceEntry: (parentPath, name) => invoke('personal-space:remove-entry', parentPath, name),
  saveFile: (fileName, data) => invoke('file:save', fileName, data),
  openPath: (targetPath) => invoke('shell:open-path', targetPath),
  getAppUpdateStatus: () => invoke('app-update:get-status'),
  checkForAppUpdates: () => invoke('app-update:check'),
  installAppUpdate: () => invoke('app-update:install'),
  onAppUpdateStatus: (listener) => on('app-update:status', listener),
  detectHardware: () => invoke('hardware:detect'),
  runVoxcpmSetup: (options) => invoke('voxcpm:run-setup', options),
  queryVoxcpmSetupStatus: () => invoke('voxcpm:setup-status'),
  controlVoxcpmService: (action) => invoke('voxcpm:service', action),
  queryUpscaleStatus: () => invoke('upscayl:status'),
  installUpscaleRuntime: (options) => invoke('upscayl:install', options),
  upscaleImage: (options) => invoke('upscayl:upscale', options),
  onUpscaleInstallProgress: (listener) => on('upscayl:install-progress', listener),
  listProjectConnectionProfiles: (type) => invoke('project-profile:list', type),
  saveProjectConnectionProfile: (input) => invoke('project-profile:save', input),
  deleteProjectConnectionProfile: (profileId) => invoke('project-profile:delete', profileId),
  verifyProjectDatabaseProfile: (profileId) => invoke('project-profile:verify-database', profileId),
  initializeProjectDatabaseSchema: (profileId, dialect) => invoke('project-profile:initialize-database-schema', profileId, dialect),
  verifyProjectKodoProfile: (profileId, projectId) => invoke('project-profile:verify-kodo', profileId, projectId),
})
