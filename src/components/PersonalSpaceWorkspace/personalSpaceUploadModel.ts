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

type SpriteUploadEntry = UploadFileEntry | File | null | undefined

function fileBaseName(name: string): string {
  return name.split(/[\\/]/).filter(Boolean).pop() ?? name
}

function isSpriteImageName(name: string): boolean {
  const normalized = fileBaseName(name).toLowerCase()
  return normalized.endsWith('.png') || normalized.endsWith('.webp')
}

function isIndexJsonName(name: string): boolean {
  return fileBaseName(name).toLowerCase() === 'index.json'
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip')
}

function mimeTypeForName(name: string): string {
  const normalized = name.toLowerCase()
  if (normalized.endsWith('.webp')) return 'image/webp'
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.json')) return 'application/json'
  return ''
}

function isFileLike(item: unknown): item is File {
  return Boolean(
    item &&
    typeof item === 'object' &&
    'name' in item &&
    'size' in item,
  )
}

function isUploadFileEntry(item: unknown): item is UploadFileEntry {
  return Boolean(item && typeof item === 'object' && 'originFileObj' in item)
}

function filesFromUploadEntries(fileEntries: Array<SpriteUploadEntry>): File[] {
  return fileEntries.flatMap((item) => {
    if (!item) return []
    if (isUploadFileEntry(item)) return item.originFileObj ? [item.originFileObj] : []
    if (isFileLike(item)) return [item]
    return []
  })
}

export function createSpriteUploadBatch(fileEntries: Array<SpriteUploadEntry>): SpriteUploadBatch | null {
  const files = filesFromUploadEntries(fileEntries)
  const hasSpriteImage = files.some((file) => isSpriteImageName(file.name))
  const hasIndexJson = files.some((file) => isIndexJsonName(file.name))
  if (!hasSpriteImage || !hasIndexJson) return null
  return {
    files,
    batchKey: files.map((file) => `${file.name}:${file.size}`).sort().join('|'),
  }
}

async function extractSpriteUploadFilesFromZip(zipFile: File): Promise<File[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((a, b) => a.name.localeCompare(b.name))
  const spriteEntry = entries.find((entry) => isSpriteImageName(entry.name))
  const indexEntry = entries.find((entry) => isIndexJsonName(entry.name))
  if (!spriteEntry || !indexEntry) return []

  const spriteName = fileBaseName(spriteEntry.name) || 'sprite.png'
  const [spriteData, indexData] = await Promise.all([
    spriteEntry.async('arraybuffer'),
    indexEntry.async('arraybuffer'),
  ])
  return [
    new File([spriteData], spriteName, { type: mimeTypeForName(spriteName) }),
    new File([indexData], 'index.json', { type: 'application/json' }),
  ]
}

export async function resolveSpriteUploadBatch(fileEntries: Array<SpriteUploadEntry>): Promise<SpriteUploadBatch | null> {
  const directBatch = createSpriteUploadBatch(fileEntries)
  if (directBatch) return directBatch

  const zipFile = filesFromUploadEntries(fileEntries).find((file) => isZipFile(file))
  if (!zipFile) return null
  return createSpriteUploadBatch(await extractSpriteUploadFilesFromZip(zipFile))
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
