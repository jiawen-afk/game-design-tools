import { useCallback, useEffect, useMemo, useState } from 'react'

import { useStableAudioSetup } from './useStableAudioSetup'
import { useSoundEffectGenerationWorkflow } from './useSoundEffectGenerationWorkflow'
import { useSoundEffectRecordLibrary } from './useSoundEffectRecordLibrary'
import { useVoiceProjectResourceReadOptions } from './useVoiceProjectResourceReadOptions'
import {
  chooseSoundEffectModel,
  deriveStableAudioInstallState,
  stableAudioModels,
  type SoundEffectRecord,
  type StableAudioModelId,
} from './soundEffectModel'
import { collectSoundEffectRecordToPersonalSpace, type SoundCollectLink } from './soundEffectPersonalSpaceCollector'
import { readCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/projectSpaceState'
import { getDesktopApi } from '../../desktopApi'

export function useSoundEffectWorkspace() {
  const setup = useStableAudioSetup()
  const recordLibrary = useSoundEffectRecordLibrary()
  const projectResourceReadOptions = useVoiceProjectResourceReadOptions()
  const [currentProjectSpace, setCurrentProjectSpace] = useState(() => readCurrentProjectSpaceState())
  const [collectingRecordId, setCollectingRecordId] = useState('')
  const [collectError, setCollectError] = useState('')
  const generation = useSoundEffectGenerationWorkflow({
    connected: setup.connected,
    port: setup.port,
    recordCount: recordLibrary.records.length,
    onRecordCreated: recordLibrary.addRecord,
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
  const spriteAssets = useMemo(() => (
    currentProjectSpace.assets
      .filter((asset) => asset.kind === 'sprite')
  ), [currentProjectSpace.assets])
  const spriteLinkOptions = useMemo(() => (
    spriteAssets
      .map((asset) => ({ label: asset.name, value: asset.id }))
  ), [spriteAssets])
  const personalSpaceSoundAssets = useMemo(() => (
    currentProjectSpace.assets
      .filter((asset) => asset.kind === 'sound')
  ), [currentProjectSpace.assets])

  useEffect(() => {
    if (!installState.dependenciesReady || installState.installedModelIds.length === 0) return
    const model = chooseSoundEffectModel(generation.soundParams.model, installState.installedModelIds)
    if (model !== generation.soundParams.model) generation.updateModel(model)
  }, [generation, installState.dependenciesReady, installState.installedModelIds])

  const changeSoundEffectModel = (model: StableAudioModelId) => {
    generation.updateModel(model)
  }

  const openStableAudioModelPath = () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !setup.modelPath.trim()) return
    void desktopApi.openPath(setup.modelPath).catch(() => {})
  }

  const refreshCurrentProjectSpace = useCallback(() => {
    setCurrentProjectSpace(readCurrentProjectSpaceState())
  }, [])

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
    records: recordLibrary.records,
    lastGeneratedId: recordLibrary.lastGeneratedId,
    audioClipActions: {
      addSoundEffectClipRecord: recordLibrary.addRecord,
    },
    projectSpaceActions: {
      refreshCurrentProjectSpace,
    },
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
      onOpenModelPath: openStableAudioModelPath,
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
      records: recordLibrary.records,
      lastGeneratedId: recordLibrary.lastGeneratedId,
      personalSpaceSoundAssets,
      spriteLinkOptions,
      projectResourceReadOptions,
      collectingRecordId,
      collectError,
      onLoad: loadSoundEffectRecord,
      onRenameRecord: recordLibrary.renameRecord,
      onDeleteRecord: recordLibrary.deleteRecord,
      onClearRecords: recordLibrary.clearRecords,
      onCollectRecord: (record: SoundEffectRecord) => void collectRecord(record),
      onCollectAndLinkSprite: (record: SoundEffectRecord, spriteId: string) => void collectRecord(record, {
        target: 'sprite',
        targetId: spriteId,
      }),
    },
  }
}
