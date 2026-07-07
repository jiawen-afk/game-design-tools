import { useEffect } from 'react'
import { message } from 'antd'

import { type VoiceGenerationRecord, voiceModeMeta } from './voiceDeploymentModel'
import { useAppToast } from '../AppToastProvider'
import { useVoiceCollectLinkDialog } from './useVoiceCollectLinkDialog'
import { useVoiceDeploymentSetup } from './useVoiceDeploymentSetup'
import { useVoiceGenerationWorkflow } from './useVoiceGenerationWorkflow'
import { useVoiceProjectSpaceActions } from './useVoiceProjectSpaceActions'
import { useVoiceProjectResourceReadOptions } from './useVoiceProjectResourceReadOptions'
import { useVoiceRecordLibrary } from './useVoiceRecordLibrary'

export function useVoiceDeploymentWorkspace() {
  const [messageApi, messageContextHolder] = message.useMessage()
  const { showToast } = useAppToast()
  const setup = useVoiceDeploymentSetup()
  const projectSpace = useVoiceProjectSpaceActions(messageApi)
  const projectResourceReadOptions = useVoiceProjectResourceReadOptions()
  const recordLibrary = useVoiceRecordLibrary()
  const generation = useVoiceGenerationWorkflow({
    connected: setup.connected,
    port: setup.port,
    serviceUrl: setup.serviceUrl,
    recordCount: recordLibrary.records.length,
    selectedCharacterName: projectSpace.selectedVoiceCharacterName,
    onRecordCreated: recordLibrary.addRecord,
  })
  const selectedMode = voiceModeMeta.find((item) => item.id === generation.voiceParams.mode) ?? voiceModeMeta[0]
  const collectLink = useVoiceCollectLinkDialog({
    characterLinkOptions: projectSpace.characterLinkOptions,
    effectLinkOptions: projectSpace.effectLinkOptions,
    storyboardLinkOptions: projectSpace.storyboardLinkOptions,
    onOpen: projectSpace.refreshPersonalSpaceSnapshot,
    onConfirm: (record, link) => void projectSpace.collectRecordToPersonalSpace(record, link),
  })

  useEffect(() => {
    if (!setup.desktopServiceResult) {
      return
    }

    showToast({
      type: setup.desktopServiceResult.ok ? 'success' : 'warning',
      title: setup.desktopServiceResult.ok ? '服务命令已执行' : '服务命令未完成',
      description: setup.desktopServiceResult.output || '没有返回详细信息。',
      durationMs: setup.desktopServiceResult.ok ? 5200 : 9000,
    })
  }, [setup.desktopServiceResult, showToast])

  return {
    connected: setup.connected,
    messageContextHolder,
    collectLinkModalProps: {
      pendingCollectLink: collectLink.pendingCollectLink,
      collectLinkMeta: collectLink.collectLinkMeta,
      onConfirm: collectLink.confirmCollectLink,
      onCancel: collectLink.closeCollectLinkDialog,
      onTargetChange: collectLink.updateCollectLinkTargetId,
    },
    headerProps: {
      port: setup.port,
      portInput: setup.portInput,
      setPortInput: setup.setPortInput,
      serviceUrl: setup.serviceUrl,
      connectionStatus: setup.connectionStatus,
      connected: setup.connected,
      desktopRuntime: setup.desktopRuntime,
      desktopServiceBusy: setup.desktopServiceBusy,
      runCheck: setup.runCheck,
      applyPort: setup.applyPort,
      startDesktopService: setup.startDesktopService,
      controlDesktopService: setup.controlDesktopService,
    },
    generationPanelProps: {
      voiceParams: generation.voiceParams,
      selectedModeNote: selectedMode.note,
      generationError: generation.generationError,
      generating: generation.generating,
      canGenerate: generation.canGenerate,
      characters: projectSpace.personalSpaceSnapshot.characters,
      selectedCharacterId: projectSpace.selectedVoiceCharacterId,
      onModeChange: generation.setMode,
      onParamsChange: generation.updateParams,
      onAdvancedChange: generation.updateAdvanced,
      onCharacterSelect: projectSpace.setSelectedVoiceCharacterId,
      onCharacterCreate: projectSpace.createVoiceCharacter,
      onReferenceFileSelected: generation.selectReferenceFile,
      onGenerate: () => void generation.generateVoice(),
      onResetParams: generation.resetParams,
    },
    setupPanelsProps: {
      selectedModel: setup.selectedModel,
      downloadSource: setup.downloadSource,
      modelPath: setup.modelPath,
      modelPathValid: setup.modelValidation.valid,
      desktopRuntime: setup.desktopRuntime,
      desktopHardware: setup.desktopHardware,
      desktopHardwareEvaluation: setup.desktopHardwareEvaluation,
      desktopHardwareBusy: setup.desktopHardwareBusy,
      desktopSetupBusy: setup.desktopSetupBusy,
      desktopSetupResult: setup.desktopSetupResult,
      desktopSetupError: setup.desktopSetupError,
      desktopDependencyStatusBusy: setup.desktopDependencyStatusBusy,
      desktopDependencyStatusResult: setup.desktopDependencyStatusResult,
      onModelChange: setup.selectModel,
      onDownloadSourceChange: setup.setDownloadSource,
      onModelPathChange: setup.setModelPath,
      onDetectDesktopHardware: () => void setup.detectDesktopHardware(),
      onRunDesktopSetup: () => void setup.runDesktopSetup(),
      onQueryDesktopDependencyStatus: () => void setup.queryDesktopDependencyStatus(),
    },
    audioClipActions: {
      addVoiceClipRecord: recordLibrary.addRecord,
    },
    projectSpaceActions: {
      refreshPersonalSpaceSnapshot: projectSpace.refreshPersonalSpaceSnapshot,
    },
    libraryPanelProps: {
      records: recordLibrary.records,
      lastGeneratedId: recordLibrary.lastGeneratedId,
      personalSpaceVoiceAssets: projectSpace.personalSpaceVoiceAssets,
      personalSpaceCharacters: projectSpace.personalSpaceSnapshot.characters,
      personalSpaceStoryboardGroups: projectSpace.personalSpaceSnapshot.storyboardGroups,
      projectResourceReadOptions,
      onLoad: generation.loadParams,
      onClone: generation.cloneFromRecord,
      onDelete: recordLibrary.deleteRecord,
      onClearHistory: recordLibrary.clearRecords,
      onRename: recordLibrary.renameRecord,
      onCollect: (record: VoiceGenerationRecord) => void projectSpace.collectRecordToPersonalSpace(record),
      onCollectWithLink: collectLink.openCollectLinkDialog,
      personalSpaceCollectEnabled: projectSpace.personalSpaceCollectEnabled,
      personalSpaceCollectDisabledReason: projectSpace.personalSpaceCollectDisabledReason,
    },
  }
}
