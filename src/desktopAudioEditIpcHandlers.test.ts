import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { registerAudioEditIpcHandlers } = require('../electron/audioEditIpcHandlers.cjs')

function createIpcMain() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    },
  }
}

test('audio edit export as returns null when the save dialog is canceled', async () => {
  const ipcMain = createIpcMain()
  registerAudioEditIpcHandlers({
    app: { getPath: () => os.tmpdir() },
    ipcMain,
    dialog: {
      showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
    },
  })

  const result = await ipcMain.handlers.get('audio-edit:export-as')?.({}, {
    fileName: 'clip.wav',
    data: new Uint8Array([1, 2, 3]).buffer,
  })

  assert.equal(result, null)
})

test('audio edit export as writes the selected wav file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdt-audio-edit-export-'))
  const outputPath = path.join(tempDir, 'chosen.wav')
  const ipcMain = createIpcMain()
  registerAudioEditIpcHandlers({
    app: { getPath: () => os.tmpdir() },
    ipcMain,
    dialog: {
      showSaveDialog: async () => ({ canceled: false, filePath: outputPath }),
    },
  })

  const result = await ipcMain.handlers.get('audio-edit:export-as')?.({}, {
    fileName: 'bad<>name.wav',
    data: new Uint8Array([4, 5, 6]).buffer,
  })

  assert.deepEqual(new Uint8Array(await fsp.readFile(outputPath)), new Uint8Array([4, 5, 6]))
  assert.equal(result.fileName, 'chosen.wav')
  assert.equal(result.audioPath, outputPath)
  assert.match(result.audioUrl, /^file:/)
})
