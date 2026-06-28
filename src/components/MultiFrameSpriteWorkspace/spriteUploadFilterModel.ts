export interface UploadFileIdentity {
  name: string
  size: number
  lastModified: number
}

export interface UploadFilterState {
  existingKeys: Set<string>
  pendingKeys: Set<string>
}

export function buildUploadFileKey(file: UploadFileIdentity): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function filterNewUploadFiles<T extends UploadFileIdentity>(
  files: T[],
  state: UploadFilterState
): T[] {
  const seen = new Set<string>()
  const next: T[] = []
  for (const file of files) {
    const key = buildUploadFileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    if (state.existingKeys.has(key)) continue
    if (state.pendingKeys.has(key)) continue
    next.push(file)
  }
  return next
}
