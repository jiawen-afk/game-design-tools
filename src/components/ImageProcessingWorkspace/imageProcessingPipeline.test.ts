import test from 'node:test'
import assert from 'node:assert/strict'

import type { ImageExportSaveApi, LoadedImageDraft, ProcessedImageDraft } from './imageProcessingPipeline'
import {
  revokeImageObjectUrl,
  revokeLoadedImageDraftUrl,
  revokeProcessedImageDraftUrl,
  saveImageExportBlob,
} from './imageProcessingPipeline'

function collectRevokedUrls(run: () => void) {
  const revokedUrls: string[] = []
  const originalRevokeObjectUrl = URL.revokeObjectURL
  URL.revokeObjectURL = ((url: string) => {
    revokedUrls.push(url)
  }) as typeof URL.revokeObjectURL
  try {
    run()
  } finally {
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
  return revokedUrls
}

test('image processing pipeline centralizes object URL cleanup', () => {
  const loadedDraft = {
    sourceUrl: 'blob://source',
  } as LoadedImageDraft
  const processedDraft = {
    url: 'blob://processed',
  } as ProcessedImageDraft

  const revokedUrls = collectRevokedUrls(() => {
    revokeImageObjectUrl('blob://temporary')
    revokeImageObjectUrl(null)
    revokeLoadedImageDraftUrl(loadedDraft)
    revokeLoadedImageDraftUrl(null)
    revokeProcessedImageDraftUrl(processedDraft)
    revokeProcessedImageDraftUrl(null)
  })

  assert.deepEqual(revokedUrls, ['blob://temporary', 'blob://source', 'blob://processed'])
})

test('image processing pipeline saves export blobs through desktop API when available', async () => {
  const saved: Array<{ fileName: string; data: ArrayBuffer }> = []
  const blob = new Blob(['export-data'], { type: 'image/png' })
  const api = {
    saveFile: async (fileName, data) => {
      saved.push({ fileName, data })
      return { name: fileName, path: `D:\\exports\\${fileName}` }
    },
  } satisfies ImageExportSaveApi

  await saveImageExportBlob('hero.png', blob, api)

  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.fileName, 'hero.png')
  assert.equal(new TextDecoder().decode(saved[0]?.data), 'export-data')
})

test('image processing pipeline reports cancelled desktop saves', async () => {
  await assert.rejects(
    saveImageExportBlob('hero.png', new Blob(['export-data']), { saveFile: async () => null }),
    /未选择保存位置/
  )
})

test('image processing pipeline falls back to browser download and revokes the export URL', async () => {
  const clickedDownloads: string[] = []
  const revokedUrls: string[] = []
  const originalDocument = globalThis.document
  const originalCreateObjectUrl = URL.createObjectURL
  const originalRevokeObjectUrl = URL.revokeObjectURL
  const anchor = {
    href: '',
    download: '',
    click() {
      clickedDownloads.push(`${this.download}:${this.href}`)
    },
  }
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tagName: string) {
        assert.equal(tagName, 'a')
        return anchor
      },
    },
  })
  URL.createObjectURL = (() => 'blob://export') as typeof URL.createObjectURL
  URL.revokeObjectURL = ((url: string) => {
    revokedUrls.push(url)
  }) as typeof URL.revokeObjectURL
  try {
    await saveImageExportBlob('hero.webp', new Blob(['export-data']))
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
  }

  assert.deepEqual(clickedDownloads, ['hero.webp:blob://export'])
  assert.deepEqual(revokedUrls, ['blob://export'])
})
