import { useMemo, useState } from 'react'

import { useStableAudioSetup } from './useStableAudioSetup'
import { useSoundEffectGenerationWorkflow } from './useSoundEffectGenerationWorkflow'
import { stableAudioModels, type SoundEffectRecord } from './soundEffectModel'
import { collectSoundEffectRecordToPersonalSpace, type SoundCollectLink } from './soundEffectPersonalSpaceCollector'
import { readCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/projectSpaceState'

export function useSoundEffectWorkspace() {
  const setup = useStableAudioSetup()
  const [records, setRecords] = useState<SoundEffectRecord[]>([])
  const [lastGeneratedId, setLastGeneratedId] = useState('')
  const [currentProjectSpace, setCurrentProjectSpace] = useState(() => readCurrentProjectSpaceState())
  const [collectingRecordId, setCollectingRecordId] = useState('')
  const [collectError, setCollectError] = useState('')
  const generation = useSoundEffectGenerationWorkflow({
    connected: setup.connected,
    port: setup.port,
    recordCount: records.length,
    onRecordCreated: (record) => {
      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)])
      setLastGeneratedId(record.id)
    },
  })

  const selectedModelMeta = useMemo(
    () => stableAudioModels.find((item) => item.id === setup.selectedModel) ?? stableAudioModels[0]!,
    [setup.selectedModel],
  )
  const spriteLinkOptions = useMemo(() => (
    currentProjectSpace.assets
      .filter((asset) => asset.kind === 'sprite')
      .map((asset) => ({ label: asset.name, value: asset.id }))
  ), [currentProjectSpace.assets])

  const renameRecord = (recordId: string, name: string) => {
    setRecords((current) => current.map((record) => (
      record.id === recordId ? { ...record, name: name.trim() || record.name } : record
    )))
  }

  const deleteRecord = (recordId: string) => {
    setRecords((current) => current.filter((record) => record.id !== recordId))
  }

  const clearRecords = () => {
    setRecords([])
    setLastGeneratedId('')
  }

  const collectRecord = async (record: SoundEffectRecord, link?: SoundCollectLink) => {
    setCollectingRecordId(record.id)
    setCollectError('')
    try {
      const nextProjectSpace = await collectSoundEffectRecordToPersonalSpace(record, link, {
        onSyncError: (error) => {
          setCollectError(error instanceof Error ? error.message : '音效素材已收藏，本次同步未完成。')
        },
      })
      setCurrentProjectSpace(nextProjectSpace)
    } catch (error) {
      setCollectError(error instanceof Error ? error.message : '收藏音效素材失败。')
    } finally {
      setCollectingRecordId('')
    }
  }

  return {
    connected: setup.connected,
    setup,
    generation,
    records,
    lastGeneratedId,
    setupPanelProps: {
      stableAudioModels,
      selectedModel: setup.selectedModel,
      selectedModelMeta,
      downloadSource: setup.downloadSource,
      modelPath: setup.modelPath,
      port: setup.port,
      portInput: setup.portInput,
      serviceUrl: setup.serviceUrl,
      connectionStatus: setup.connectionStatus,
      connected: setup.connected,
      desktopRuntime: setup.desktopRuntime,
      desktopSetupBusy: setup.desktopSetupBusy,
      desktopSetupResult: setup.desktopSetupResult,
      desktopSetupError: setup.desktopSetupError,
      desktopDependencyStatusBusy: setup.desktopDependencyStatusBusy,
      desktopDependencyStatusResult: setup.desktopDependencyStatusResult,
      desktopServiceBusy: setup.desktopServiceBusy,
      desktopServiceResult: setup.desktopServiceResult,
      onModelChange: setup.setSelectedModel,
      onDownloadSourceChange: setup.setDownloadSource,
      onModelPathChange: setup.setModelPath,
      onPortInputChange: setup.setPortInput,
      onApplyPort: setup.applyPort,
      onRunCheck: () => void setup.runCheck(setup.port),
      onRunDesktopSetup: () => void setup.runDesktopSetup(),
      onQueryDesktopDependencyStatus: () => void setup.queryDesktopDependencyStatus(),
      onStartDesktopService: () => void setup.startDesktopService(),
      onControlDesktopService: setup.controlDesktopService,
    },
    generationPanelProps: {
      soundParams: generation.soundParams,
      generationError: generation.generationError,
      generating: generation.generating,
      canGenerate: generation.canGenerate,
      selectedModelMeta,
      onParamsChange: generation.updateParams,
      onGenerate: () => void generation.generateSound(),
      onResetParams: generation.resetParams,
    },
    libraryPanelProps: {
      records,
      lastGeneratedId,
      spriteLinkOptions,
      collectingRecordId,
      collectError,
      onLoad: generation.loadParams,
      onRenameRecord: renameRecord,
      onDeleteRecord: deleteRecord,
      onClearRecords: clearRecords,
      onCollectRecord: (record: SoundEffectRecord) => void collectRecord(record),
      onCollectAndLinkSprite: (record: SoundEffectRecord, spriteId: string) => void collectRecord(record, {
        target: 'sprite',
        targetId: spriteId,
      }),
    },
  }
}
