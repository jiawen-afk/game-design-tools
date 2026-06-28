const {
  registerProjectLocalRepositoryIpcHandlers,
} = require('./projectLocalRepositoryIpcHandlers.cjs')
const {
  registerProjectObjectIpcHandlers,
} = require('./projectObjectIpcHandlers.cjs')
const {
  registerProjectProfileIpcHandlers,
} = require('./projectProfileIpcHandlers.cjs')
const {
  registerProjectRemoteRepositoryIpcHandlers,
} = require('./projectRemoteRepositoryIpcHandlers.cjs')

function registerProjectStorageIpcHandlers(context) {
  registerProjectProfileIpcHandlers(context)
  registerProjectLocalRepositoryIpcHandlers(context)
  registerProjectObjectIpcHandlers(context)
  registerProjectRemoteRepositoryIpcHandlers(context)
}

module.exports = {
  registerProjectStorageIpcHandlers,
}
