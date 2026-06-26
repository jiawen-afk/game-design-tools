import { shjGraphImportAdapter } from './shjGraphImportAdapter'
import type { KnowledgeBaseImportAdapter } from './documentKnowledgeTypes'

function flattenSearchParts(parts: unknown[]): string[] {
  return parts.flatMap((part) => {
    if (part == null) return []
    if (Array.isArray(part)) return flattenSearchParts(part)
    const value = String(part).replace(/\s+/g, ' ').trim()
    return value ? [value] : []
  })
}

export function createDocumentSearchText(parts: unknown[]) {
  return Array.from(new Set(flattenSearchParts(parts))).join(' ')
}

const knowledgeBaseAdapters: KnowledgeBaseImportAdapter[] = [
  shjGraphImportAdapter,
]

export function listKnowledgeBaseAdapters() {
  return [...knowledgeBaseAdapters]
}

export function getKnowledgeBaseAdapter(sourceType: string) {
  return knowledgeBaseAdapters.find((adapter) => adapter.sourceType === sourceType) ?? null
}
