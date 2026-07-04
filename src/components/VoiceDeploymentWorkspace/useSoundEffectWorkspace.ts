import { useMemo, useState } from 'react'

import { useStableAudioSetup } from './useStableAudioSetup'
import { useSoundEffectGenerationWorkflow } from './useSoundEffectGenerationWorkflow'
import { stableAudioModels, type SoundEffectRecord } from './soundEffectModel'

export function useSoundEffectWorkspace() {
  const setup = useStableAudioSetup()
  const [records, setRecords] = useState<SoundEffectRecord[]>([])
  const [lastGeneratedId, setLastGeneratedId] = useState('')
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

  const collectUnavailable = () => undefined

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
      spriteLinkOptions: [] as Array<{ label: string; value: string }>,
      onLoad: generation.loadParams,
      onRenameRecord: renameRecord,
      onDeleteRecord: deleteRecord,
      onClearRecords: clearRecords,
      onCollectRecord: collectUnavailable,
      onCollectAndLinkSprite: collectUnavailable,
    },
  }
}
