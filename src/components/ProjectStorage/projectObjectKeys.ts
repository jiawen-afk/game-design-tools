import type { ProjectMimeGroup } from './projectStorageTypes'

export interface ProjectObjectKeyInput {
  projectName: string
  fileMime: string
  resourceId: string
  extension: string
}

const knownMimeGroups = new Set<ProjectMimeGroup>(['image', 'audio', 'application', 'video', 'text', 'font', 'model'])

export function sanitizeObjectKeyPart(value: string) {
  return (value.trim() || 'unnamed').replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
}

export function normalizeFileExtension(value: string) {
  const extension = value.trim().replace(/^\./, '').toLowerCase()
  return extension || 'bin'
}

export function extensionFromFileName(fileName: string) {
  const match = fileName.trim().match(/\.([^.\\/]+)$/)
  return normalizeFileExtension(match?.[1] ?? '')
}

export function mimeGroupFromMimeType(mimeType: string): ProjectMimeGroup {
  const group = mimeType.trim().toLowerCase().split('/')[0] as ProjectMimeGroup
  return knownMimeGroups.has(group) ? group : 'application'
}

export function buildProjectObjectKey(input: ProjectObjectKeyInput) {
  return [
    'objects',
    sanitizeObjectKeyPart(input.projectName),
    sanitizeObjectKeyPart(input.fileMime.trim().toLowerCase() || 'application/octet-stream'),
    `${sanitizeObjectKeyPart(input.resourceId)}.${normalizeFileExtension(input.extension)}`,
  ].join('/')
}
