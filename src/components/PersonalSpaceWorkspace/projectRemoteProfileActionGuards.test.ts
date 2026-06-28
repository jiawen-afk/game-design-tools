import test from 'node:test'
import assert from 'node:assert/strict'

import type { GameDesignToolsDesktopApi } from '../../desktopApi'
import { getDesktopApiForRemoteProfileAction } from './projectRemoteProfileActionGuards'

function installDesktopApi(api: Partial<GameDesignToolsDesktopApi> | null) {
  const previous = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: api ? { gameDesignToolsDesktop: api } : undefined,
  })
  return () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previous,
    })
  }
}

function createMessages() {
  const warnings: string[] = []
  return {
    messageApi: {
      warning: (content: string) => warnings.push(content),
    },
    warnings,
  }
}

test('remote profile action guard warns validation errors before draft or runtime checks', () => {
  const restore = installDesktopApi(null)
  const { messageApi, warnings } = createMessages()
  try {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi,
      validationErrors: ['缺少数据库主机。'],
      draftTested: false,
      untestedMessage: '请先测试远程数据库配置',
      runtimeUnavailableMessage: '当前桌面运行时不可用。',
    })

    assert.equal(desktopApi, null)
    assert.deepEqual(warnings, ['缺少数据库主机。'])
  } finally {
    restore()
  }
})

test('remote profile action guard requires tested drafts when requested', () => {
  const restore = installDesktopApi({})
  const { messageApi, warnings } = createMessages()
  try {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi,
      validationErrors: [],
      draftTested: false,
      untestedMessage: '请先验证七牛 Kodo 配置',
      runtimeUnavailableMessage: '当前桌面运行时不可用。',
    })

    assert.equal(desktopApi, null)
    assert.deepEqual(warnings, ['请先验证七牛 Kodo 配置'])
  } finally {
    restore()
  }
})

test('remote profile action guard returns the desktop api when guards pass', () => {
  const api = {
    listProjectConnectionProfiles: async () => [],
  } as Partial<GameDesignToolsDesktopApi>
  const restore = installDesktopApi(api)
  const { messageApi, warnings } = createMessages()
  try {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi,
      validationErrors: [],
      runtimeUnavailableMessage: '当前桌面运行时不可用。',
    })

    assert.equal(desktopApi, api)
    assert.deepEqual(warnings, [])
  } finally {
    restore()
  }
})
