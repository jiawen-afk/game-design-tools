import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveSelectedProjectRemoteProfileBinding } from './useSelectedProjectRemoteProfileBinding'

test('selected project remote profile binding ignores failed remote settings preload', async () => {
  let bindingLookups = 0

  const result = await resolveSelectedProjectRemoteProfileBinding({
    selectedProjectId: 'project-a',
    ensureRemoteProjectSettings: async () => {
      throw new Error('远程设置读取失败')
    },
    remoteDeviceBindingResolver: {
      currentDeviceBindingForProject: () => {
        bindingLookups += 1
        return { databaseProfileId: 'db1', storageProfileId: 'kodo1' }
      },
    },
  })

  assert.equal(result, null)
  assert.equal(bindingLookups, 0)
})

