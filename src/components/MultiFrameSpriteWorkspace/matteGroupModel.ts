export type MatteImportGroupKind = 'video' | 'spriteSheet' | 'imageBatch'

export interface MatteGroupFrameState {
  id: string
  matteGroupId: string
  matteGroupName: string
}

export interface MatteFrameGroup<T extends MatteGroupFrameState> {
  id: string
  name: string
  firstFrame: T
  frameCount: number
  frames: T[]
}

export interface InitialMatteFrameInput {
  existingFrameCount: number
  createdIds: string[]
}

export function getInitialMatteFrameIds({ existingFrameCount, createdIds }: InitialMatteFrameInput): string[] {
  void existingFrameCount
  return createdIds[0] ? [createdIds[0]] : []
}

const MATTE_GROUP_KIND_LABELS: Record<MatteImportGroupKind, string> = {
  video: '视频处理',
  spriteSheet: '精灵图处理',
  imageBatch: '批量图片',
}

export function getNextMatteGroupName(
  frames: Array<Pick<MatteGroupFrameState, 'matteGroupId' | 'matteGroupName'>>,
  kind: MatteImportGroupKind
): string {
  const groupIds = new Set(frames.map((frame) => frame.matteGroupId).filter(Boolean))
  const groupIndexById = new Map<string, number>()
  frames.forEach((frame) => {
    if (!frame.matteGroupId || groupIndexById.has(frame.matteGroupId)) return
    const match = /^(\d+)-/.exec(frame.matteGroupName)
    groupIndexById.set(frame.matteGroupId, match ? Number(match[1]) : groupIndexById.size + 1)
  })
  const maxIndex = Math.max(groupIds.size, 0, ...groupIndexById.values())
  return `${maxIndex + 1}-${MATTE_GROUP_KIND_LABELS[kind]}`
}

export function buildMatteFrameGroups<T extends MatteGroupFrameState>(frames: T[]): MatteFrameGroup<T>[] {
  const groups: MatteFrameGroup<T>[] = []
  const groupById = new Map<string, MatteFrameGroup<T>>()
  frames.forEach((frame) => {
    let group = groupById.get(frame.matteGroupId)
    if (!group) {
      group = {
        id: frame.matteGroupId,
        name: frame.matteGroupName,
        firstFrame: frame,
        frameCount: 0,
        frames: [],
      }
      groupById.set(frame.matteGroupId, group)
      groups.push(group)
    }
    group.frames.push(frame)
    group.frameCount = group.frames.length
  })
  return groups
}

export function removeMatteFrameGroup<T extends MatteGroupFrameState>(frames: T[], groupId: string): T[] {
  const next = frames.filter((frame) => frame.matteGroupId !== groupId)
  return next.length === frames.length ? frames : next
}
