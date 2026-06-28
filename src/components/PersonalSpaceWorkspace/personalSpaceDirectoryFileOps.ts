import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'

export function sanitizePathPart(value: string): string {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

export function splitStoredPath(path: string) {
  return path.split(/[\\/]+/).filter(Boolean)
}

export function relativePartsForRoot(rootName: string, storedPath: string) {
  const parts = splitStoredPath(storedPath)
  return parts[0] === rootName ? parts.slice(1) : parts
}

export async function ensureDirectory(root: PersonalSpaceDirectoryHandle, parts: string[]) {
  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(sanitizePathPart(part), { create: true })
  }
  return current
}

export async function writeFile(directory: PersonalSpaceDirectoryHandle, name: string, data: Blob) {
  const file = await directory.getFileHandle(sanitizePathPart(name), { create: true })
  const writable = await file.createWritable()
  await writable.write(data)
  await writable.close()
}
