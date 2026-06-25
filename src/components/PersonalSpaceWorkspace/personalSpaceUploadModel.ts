export interface UploadFileEntry {
  originFileObj?: File | null
}

export interface SpriteUploadBatch {
  files: File[]
  batchKey: string
}

export interface SpriteUploadBatchTracker {
  current: string
}

export interface SpriteUploadBatchTrackerRef {
  current: string | null
}

function isFileLike(item: unknown): item is File {
  return Boolean(
    item &&
    typeof item === 'object' &&
    'name' in item &&
    'size' in item,
  )
}

export function createSpriteUploadBatch(fileEntries: Array<UploadFileEntry | File | null | undefined>): SpriteUploadBatch | null {
  const files = fileEntries.flatMap((item) => {
    if (!item) return []
    if (isFileLike(item)) return [item]
    return item.originFileObj ? [item.originFileObj] : []
  })
  const hasPng = files.some((file) => file.name.toLowerCase().endsWith('.png'))
  const hasIndexJson = files.some((file) => file.name.toLowerCase() === 'index.json')
  if (!hasPng || !hasIndexJson) return null
  return {
    files,
    batchKey: files.map((file) => `${file.name}:${file.size}`).sort().join('|'),
  }
}

export function consumeSpriteUploadBatch(
  batch: SpriteUploadBatch | null,
  tracker: SpriteUploadBatchTracker,
): SpriteUploadBatch | null {
  if (!batch) return null
  if (tracker.current === batch.batchKey) return null
  tracker.current = batch.batchKey
  return batch
}

export function createRecordSpriteUploadBatchTracker(
  recordRef: { current: Record<string, string> },
  key: string,
): SpriteUploadBatchTracker {
  return {
    get current() {
      return recordRef.current[key] ?? ''
    },
    set current(value: string) {
      if (value) {
        recordRef.current[key] = value
      } else {
        delete recordRef.current[key]
      }
    },
  }
}

export function createNullableSpriteUploadBatchTracker(
  ref: SpriteUploadBatchTrackerRef,
): SpriteUploadBatchTracker {
  return {
    get current() {
      return ref.current ?? ''
    },
    set current(value: string) {
      ref.current = value || null
    },
  }
}
