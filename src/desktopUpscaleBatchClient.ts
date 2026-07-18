import type {
  DesktopUpscaleApi,
  DesktopUpscaleImageBatchResult,
  DesktopUpscaleOptions,
  DesktopUpscaleOutputFormat,
} from './desktopUpscaleApi'

export interface DesktopUpscaleBatchCandidate<T> {
  value: T
  inputName: string
  outputFormat: DesktopUpscaleOutputFormat
  data: ArrayBuffer
  options: DesktopUpscaleOptions
}

export interface DesktopUpscaleBatchCandidateResult<T> {
  value: T
  result: DesktopUpscaleImageBatchResult
}

interface IndexedCandidate<T> extends DesktopUpscaleBatchCandidate<T> {
  id: string
  index: number
}

interface CandidateGroup<T> {
  outputFormat: DesktopUpscaleOutputFormat
  options: DesktopUpscaleOptions
  candidates: IndexedCandidate<T>[]
}

function createCompatibilityKey<T>(candidate: DesktopUpscaleBatchCandidate<T>) {
  const { options } = candidate
  return JSON.stringify([
    candidate.outputFormat === 'jpeg' ? 'jpg' : candidate.outputFormat,
    options.model,
    options.scale,
    options.tileSize,
    options.ttaMode,
    options.gpuId,
    options.threadProfile,
  ])
}

export async function executeUpscaleBatchCandidates<T>(
  api: Pick<DesktopUpscaleApi, 'upscaleImageBatch'>,
  candidates: DesktopUpscaleBatchCandidate<T>[],
): Promise<DesktopUpscaleBatchCandidateResult<T>[]> {
  const indexedCandidates = candidates.map((candidate, index): IndexedCandidate<T> => ({
    ...candidate,
    id: `item-${index}`,
    index,
  }))
  const groups = new Map<string, CandidateGroup<T>>()
  for (const candidate of indexedCandidates) {
    const key = createCompatibilityKey(candidate)
    const group = groups.get(key)
    if (group) {
      group.candidates.push(candidate)
    } else {
      groups.set(key, {
        outputFormat: candidate.outputFormat,
        options: candidate.options,
        candidates: [candidate],
      })
    }
  }

  const resultById = new Map<string, DesktopUpscaleImageBatchResult>()
  for (const group of groups.values()) {
    const results = await api.upscaleImageBatch({
      items: group.candidates.map((candidate) => ({
        id: candidate.id,
        inputName: candidate.inputName,
        data: candidate.data,
      })),
      outputFormat: group.outputFormat,
      options: group.options,
    })
    const expectedIds = new Set(group.candidates.map((candidate) => candidate.id))
    for (const result of results) {
      if (!expectedIds.has(result.id)) {
        throw new Error(`批量高清化返回了未知结果：${result.id}`)
      }
      if (resultById.has(result.id)) {
        throw new Error(`批量高清化返回了重复结果：${result.id}`)
      }
      resultById.set(result.id, result)
    }
    for (const candidate of group.candidates) {
      if (!resultById.has(candidate.id)) {
        throw new Error(`批量高清化缺少结果：${candidate.id}`)
      }
    }
  }

  return indexedCandidates
    .sort((left, right) => left.index - right.index)
    .map((candidate) => ({
      value: candidate.value,
      result: resultById.get(candidate.id)!,
    }))
}
