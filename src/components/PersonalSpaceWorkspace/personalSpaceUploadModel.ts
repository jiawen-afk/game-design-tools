export interface UploadFileEntry {
  originFileObj?: File | null
}

export interface SpriteUploadBatch {
  files: File[]
  batchKey: string
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
