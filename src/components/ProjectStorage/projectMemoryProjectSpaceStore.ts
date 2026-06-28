import type { LegacyProjectRows } from './projectLegacyMigration'
import type {
  Asset,
  AssetGroup,
  AssetRelation,
  Character,
  CharacterAssetLink,
  ProjectCleanupTask,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'

type MemoryProjectSpaceRows = Pick<
  LegacyProjectRows,
  | 'assetGroups'
  | 'assets'
  | 'characters'
  | 'characterAssetLinks'
  | 'storyboardGroups'
  | 'storyboardVoiceEntries'
  | 'assetRelations'
>

export class MemoryProjectSpaceStore {
  private assetGroups = new Map<string, AssetGroup[]>()
  private assets = new Map<string, Asset[]>()
  private characters = new Map<string, Character[]>()
  private characterAssetLinks = new Map<string, CharacterAssetLink[]>()
  private storyboardGroups = new Map<string, StoryboardGroup[]>()
  private storyboardVoiceEntries = new Map<string, StoryboardVoiceEntry[]>()
  private assetRelations = new Map<string, AssetRelation[]>()
  private cleanupTasks = new Map<string, ProjectCleanupTask[]>()

  initializeProject(projectId: string) {
    this.assetGroups.set(projectId, [])
    this.assets.set(projectId, [])
    this.characters.set(projectId, [])
    this.characterAssetLinks.set(projectId, [])
    this.storyboardGroups.set(projectId, [])
    this.storyboardVoiceEntries.set(projectId, [])
    this.assetRelations.set(projectId, [])
    this.cleanupTasks.set(projectId, [])
  }

  importProjectRows(projectId: string, rows: MemoryProjectSpaceRows) {
    this.assetGroups.set(projectId, [...rows.assetGroups])
    this.assets.set(projectId, [...rows.assets])
    this.characters.set(projectId, [...rows.characters])
    this.characterAssetLinks.set(projectId, [...rows.characterAssetLinks])
    this.storyboardGroups.set(projectId, [...rows.storyboardGroups])
    this.storyboardVoiceEntries.set(projectId, [...rows.storyboardVoiceEntries])
    this.assetRelations.set(projectId, [...rows.assetRelations])
  }

  exportProjectRows(projectId: string): MemoryProjectSpaceRows {
    return {
      assetGroups: [...(this.assetGroups.get(projectId) ?? [])],
      assets: [...(this.assets.get(projectId) ?? [])],
      characters: [...(this.characters.get(projectId) ?? [])],
      characterAssetLinks: [...(this.characterAssetLinks.get(projectId) ?? [])],
      storyboardGroups: [...(this.storyboardGroups.get(projectId) ?? [])],
      storyboardVoiceEntries: [...(this.storyboardVoiceEntries.get(projectId) ?? [])],
      assetRelations: [...(this.assetRelations.get(projectId) ?? [])],
    }
  }

  listAssets(projectId: string) {
    return [...(this.assets.get(projectId) ?? [])]
  }

  addCleanupTasks(tasks: ProjectCleanupTask[]) {
    for (const task of tasks) {
      const current = this.cleanupTasks.get(task.project_id) ?? []
      this.cleanupTasks.set(task.project_id, [...current.filter((item) => item.id !== task.id), task])
    }
  }

  listCleanupTasks(projectId: string) {
    return [...(this.cleanupTasks.get(projectId) ?? [])]
  }

  deleteProject(projectId: string) {
    this.assetGroups.delete(projectId)
    this.assets.delete(projectId)
    this.characters.delete(projectId)
    this.characterAssetLinks.delete(projectId)
    this.storyboardGroups.delete(projectId)
    this.storyboardVoiceEntries.delete(projectId)
    this.assetRelations.delete(projectId)
    // Cleanup tasks intentionally outlive the project row so failed object
    // deletions can be retried after a hard delete.
  }
}
