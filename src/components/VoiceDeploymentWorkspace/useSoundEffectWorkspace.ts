import { useEffect, useMemo, useState } from 'react'

import { useStableAudioSetup } from './useStableAudioSetup'
import { useSoundEffectGenerationWorkflow } from './useSoundEffectGenerationWorkflow'
import {
  chooseSoundEffectModel,
  deriveStableAudioInstallState,
  stableAudioModels,
  type SoundEffectRecord,
  type StableAudioModelId,
} from './soundEffectModel'
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

  const installState = useMemo(
    () => deriveStableAudioInstallState(setup.modelStatusResults),
    [setup.modelStatusResults],
  )
  const setupModelMeta = useMemo(
    () => stableAudioModels.find((item) => item.id === setup.selectedModel) ?? stableAudioModels[0]!,
    [setup.selectedModel],
  )
  const availableGenerationModels = useMemo(() => {
    if (!installState.dependenciesReady) return stableAudioModels
    return stableAudioModels.filter((model) => installState.installedModelIds.includes(model.id))
  }, [installState.dependenciesReady, installState.installedModelIds])
  const generationModelMeta = useMemo(
    () => stableAudioModels.find((item) => item.id === generation.soundParams.model) ?? stableAudioModels[0]!,
    [generation.soundParams.model],
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

  useEffect(() => {
    if (!installState.dependenciesReady || installState.installedModelIds.length === 0) return
    const model = chooseSoundEffectModel(generation.soundParams.model, installState.installedModelIds)
    if (model !== generation.soundParams.model) generation.updateModel(model)
  }, [generation, installState.dependenciesReady, installState.installedModelIds])

  const changeSoundEffectModel = (model: StableAudioModelId) => {
    generation.updateModel(model)
  }

  const loadSoundEffectRecord = (record: SoundEffectRecord) => {
    generation.loadParams(record)
  }

  const canGenerateWithSelectedModel = generation.canGenerate && (
    !installState.dependenciesReady || installState.installedModelIds.includes(generation.soundParams.model)
  )

  const generateSoundEffect = () => {
    if (!canGenerateWithSelectedModel) return
    void generation.generateSound()
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
      selectedModelMeta: setupModelMeta,
      dependenciesReady: installState.dependenciesReady,
      installedModelIds: installState.installedModelIds,
      missingModelIds: installState.missingModelIds,
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
      desktopHfLoginBusy: setup.desktopHfLoginBusy,
      desktopHfLoginResult: setup.desktopHfLoginResult,
      desktopHfLoginError: setup.desktopHfLoginError,
      desktopDependencyStatusBusy: setup.desktopDependencyStatusBusy,
      desktopDependencyStatusResult: setup.desktopDependencyStatusResult,
      desktopServiceBusy: setup.desktopServiceBusy,
      desktopServiceResult: setup.desktopServiceResult,
      onModelChange: setup.setSelectedModel,
      onDownloadSourceChange: setup.setDownloadSource,
      onModelPathChange: setup.setModelPath,
      onPortInputChange: setup.setPortInput,
      onApplyPort: setup.applyPort,
      onRunCheck: () => void setup.runCheck(setup.port, true),
      onRunDesktopSetup: (model?: StableAudioModelId) => void setup.runDesktopSetup(model),
      onRunDesktopHfLogin: () => void setup.runDesktopHfLogin(),
      onQueryDesktopDependencyStatus: () => void setup.queryDesktopDependencyStatus(),
      onStartDesktopService: () => void setup.startDesktopService(),
      onControlDesktopService: setup.controlDesktopService,
    },
    generationPanelProps: {
      soundParams: generation.soundParams,
      generationError: generation.generationError,
      generating: generation.generating,
      canGenerate: canGenerateWithSelectedModel,
      stableAudioModels: availableGenerationModels,
      selectedModelMeta: generationModelMeta,
      onParamsChange: generation.updateParams,
      onGenerationModelChange: changeSoundEffectModel,
      onGenerate: generateSoundEffect,
      onResetParams: () => generation.resetParams(generation.soundParams.model),
    },
    libraryPanelProps: {
      records,
      lastGeneratedId,
      spriteLinkOptions,
      collectingRecordId,
      collectError,
      onLoad: loadSoundEffectRecord,
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
