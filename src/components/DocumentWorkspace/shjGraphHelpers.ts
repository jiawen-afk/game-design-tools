export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function asString(value: unknown) {
  return String(value ?? '').trim()
}

export function optionalString(value: unknown) {
  const text = asString(value)
  return text || null
}

export function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : []
}

function flattenSearchParts(parts: unknown[]): string[] {
  return parts.flatMap((part) => {
    if (part == null) return []
    if (Array.isArray(part)) return flattenSearchParts(part)
    const value = String(part).replace(/\s+/g, ' ').trim()
    return value ? [value] : []
  })
}

export function searchText(parts: unknown[]) {
  return Array.from(new Set(flattenSearchParts(parts))).join(' ')
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function rowId(kind: string, ...parts: string[]) {
  return `doc_${kind}_${stableHash(parts.join('\u001f'))}`
}

export function jsonOrNull(value: Record<string, unknown>) {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : null
}
