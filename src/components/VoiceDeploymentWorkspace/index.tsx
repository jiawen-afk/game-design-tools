import { useEffect, useState } from 'react'
import { Button, Input, message, Modal, Select, Tag } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import './voiceDeploymentWorkspace.css'
import {
  type VoiceGenerationRecord,
  clearVoiceRecords,
  deleteVoiceRecord,
  updateRecordName,
  voiceModeMeta,
} from './voiceDeploymentModel'
import { useAppToast } from '../AppToastProvider'
import { readStoredRecords, writeStoredRecords } from './voiceRecordStorage'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { useVoiceCollectLinkDialog } from './useVoiceCollectLinkDialog'
import { useVoiceDeploymentSetup } from './useVoiceDeploymentSetup'
import { useVoiceGenerationWorkflow } from './useVoiceGenerationWorkflow'
import { useVoiceProjectSpaceActions } from './useVoiceProjectSpaceActions'

export default function VoiceDeploymentWorkspace() {
  const [messageApi, messageContextHolder] = message.useMessage()
  const { showToast } = useAppToast()
  const {
    port,
    portInput,
    setPortInput,
    connectionStatus,
    modelValidation,
    selectedModel,
    downloadSource,
    modelPath,
    serviceUrl,
    connected,
    desktopRuntime,
    desktopHardware,
    desktopHardwareEvaluation,
    desktopHardwareBusy,
    desktopSetupBusy,
    desktopSetupResult,
    desktopSetupError,
    desktopDependencyStatusBusy,
    desktopDependencyStatusResult,
    desktopServiceBusy,
    desktopServiceResult,
    runCheck,
    applyPort,
    detectDesktopHardware,
    runDesktopSetup,
    queryDesktopDependencyStatus,
    startDesktopService,
    controlDesktopService,
    selectModel,
    setDownloadSource,
    setModelPath,
  } = useVoiceDeploymentSetup()
  const [records, setRecords] = useState<VoiceGenerationRecord[]>(readStoredRecords)
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)
  const {
    personalSpaceSnapshot,
    personalSpaceVoiceAssets,
    selectedVoiceCharacterId,
    selectedVoiceCharacterName,
    setSelectedVoiceCharacterId,
    characterLinkOptions,
    effectLinkOptions,
    storyboardLinkOptions,
    personalSpaceCollectEnabled,
    personalSpaceCollectDisabledReason,
    createVoiceCharacter,
    collectRecordToPersonalSpace,
    refreshPersonalSpaceSnapshot,
  } = useVoiceProjectSpaceActions(messageApi)

  useEffect(() => { writeStoredRecords(records) }, [records])

  const renameRecord = (id: string, name: string) => {
    setRecords((current) => updateRecordName(current, id, name))
  }

  const deleteRecord = (id: string) => {
    setRecords((current) => deleteVoiceRecord(current, id))
  }

  const clearRecords = () => {
    setRecords((current) => clearVoiceRecords(current))
    setLastGeneratedId(null)
  }

  const {
    voiceParams,
    generating,
    generationError,
    canGenerate,
    updateParams,
    updateAdvanced,
    setMode,
    resetParams,
    selectReferenceFile,
    loadParams,
    cloneFromRecord,
    generateVoice,
  } = useVoiceGenerationWorkflow({
    connected,
    port,
    serviceUrl,
    recordCount: records.length,
    selectedCharacterName: selectedVoiceCharacterName,
    onRecordCreated: (record) => {
      setRecords((current) => [record, ...current].slice(0, 80))
      setLastGeneratedId(record.id)
    },
  })

  const selectedMode = voiceModeMeta.find((item) => item.id === voiceParams.mode) ?? voiceModeMeta[0]

  const {
    pendingCollectLink,
    collectLinkMeta,
    openCollectLinkDialog,
    closeCollectLinkDialog,
    updateCollectLinkTargetId,
    confirmCollectLink,
  } = useVoiceCollectLinkDialog({
    characterLinkOptions,
    effectLinkOptions,
    storyboardLinkOptions,
    onOpen: refreshPersonalSpaceSnapshot,
    onConfirm: (record, link) => void collectRecordToPersonalSpace(record, link),
  })

  useEffect(() => {
    if (!desktopServiceResult) {
      return
    }

    showToast({
      type: desktopServiceResult.ok ? 'success' : 'warning',
      title: desktopServiceResult.ok ? '服务命令已执行' : '服务命令未完成',
      description: desktopServiceResult.output || '没有返回详细信息。',
      durationMs: desktopServiceResult.ok ? 5200 : 9000,
    })
  }, [desktopServiceResult, showToast])

  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

  const renderVoiceLibraryPanel = (libraryVariant: 'sticky' | 'embedded') => (
    <VoiceLibraryPanel
      libraryVariant={libraryVariant}
      records={records}
      lastGeneratedId={lastGeneratedId}
      personalSpaceVoiceAssets={personalSpaceVoiceAssets}
      personalSpaceCharacters={personalSpaceSnapshot.characters}
      personalSpaceStoryboardGroups={personalSpaceSnapshot.storyboardGroups}
      onLoad={loadParams}
      onClone={cloneFromRecord}
      onDelete={deleteRecord}
      onClearHistory={clearRecords}
      onRename={renameRecord}
      onCollect={(record) => void collectRecordToPersonalSpace(record)}
      onCollectWithLink={openCollectLinkDialog}
      personalSpaceCollectEnabled={personalSpaceCollectEnabled}
      personalSpaceCollectDisabledReason={personalSpaceCollectDisabledReason}
    />
  )

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      {messageContextHolder}
      <Modal
        title={collectLinkMeta?.title}
        open={Boolean(pendingCollectLink)}
        okText="收藏并关联"
        cancelText="取消"
        okButtonProps={{ disabled: !pendingCollectLink?.targetId }}
        onOk={confirmCollectLink}
        onCancel={closeCollectLinkDialog}
      >
        {collectLinkMeta && (
          <div className="modal-grid">
            <label className="form-field">
              <span className="field-label">{collectLinkMeta.label}</span>
              <Select
                value={pendingCollectLink?.targetId}
                options={collectLinkMeta.options}
                placeholder={collectLinkMeta.label}
                notFoundContent={collectLinkMeta.empty}
                onChange={updateCollectLinkTargetId}
              />
            </label>
            <p className="field-note">会先把当前配音收藏到项目空间，再建立这条关联。</p>
          </div>
        )}
      </Modal>
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">配音工作台</h2>
          <p>通过 VoxCPM 在本机运行语音生成服务，工作台直接调用本地接口完成语音生成，无需把素材发送到外部服务器。</p>
        </div>
        <div className="hero-status">
          {connectionTag}
          <Button.Group className="voice-service-actions">
            <Button
              icon={connectionStatus === 'checking' ? <LoadingOutlined /> : <ReloadOutlined />}
              disabled={connectionStatus === 'checking'}
              onClick={() => runCheck(port)}
            >
              重新检测
            </Button>
            {connected ? (
              <Button
                icon={<ReloadOutlined />}
                loading={desktopServiceBusy}
                disabled={!desktopRuntime || desktopServiceBusy}
                onClick={() => void controlDesktopService('restart').then(() => runCheck(port))}
              >
                重启服务
              </Button>
            ) : (
              <Button
                icon={<PlayCircleOutlined />}
                loading={desktopServiceBusy}
                disabled={!desktopRuntime || desktopServiceBusy}
                onClick={() => void startDesktopService()}
              >
                启动服务
              </Button>
            )}
            <Button
              danger
              icon={<PoweroffOutlined />}
              loading={desktopServiceBusy}
              disabled={!desktopRuntime || desktopServiceBusy}
              onClick={() => void controlDesktopService('stop').then(() => runCheck(port))}
            >
              停止服务
            </Button>
          </Button.Group>
        </div>
      </div>

      <div className="voice-panel port-row">
        <span className="port-label">服务地址</span>
        <code>{serviceUrl}</code>
        <Input
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          onPressEnter={applyPort}
          onBlur={applyPort}
          addonBefore="端口"
          style={{ width: 160 }}
        />
      </div>

      {connected ? (
        <div className="voice-studio">
          <VoiceGenerationPanel
            voiceParams={voiceParams}
            selectedModeNote={selectedMode.note}
            generationError={generationError}
            generating={generating}
            canGenerate={canGenerate}
            characters={personalSpaceSnapshot.characters}
            selectedCharacterId={selectedVoiceCharacterId}
            onModeChange={setMode}
            onParamsChange={updateParams}
            onAdvancedChange={updateAdvanced}
            onCharacterSelect={setSelectedVoiceCharacterId}
            onCharacterCreate={createVoiceCharacter}
            onReferenceFileSelected={selectReferenceFile}
            onGenerate={() => void generateVoice()}
            onResetParams={resetParams}
          />

          {renderVoiceLibraryPanel('sticky')}
        </div>
      ) : (
        <div className="voice-grid">
          <VoiceSetupPanels
            selectedModel={selectedModel}
            downloadSource={downloadSource}
            modelPath={modelPath}
            modelPathValid={modelValidation.valid}
            desktopRuntime={desktopRuntime}
            desktopHardware={desktopHardware}
            desktopHardwareEvaluation={desktopHardwareEvaluation}
            desktopHardwareBusy={desktopHardwareBusy}
            desktopSetupBusy={desktopSetupBusy}
            desktopSetupResult={desktopSetupResult}
            desktopSetupError={desktopSetupError}
            desktopDependencyStatusBusy={desktopDependencyStatusBusy}
            desktopDependencyStatusResult={desktopDependencyStatusResult}
            onModelChange={selectModel}
            onDownloadSourceChange={setDownloadSource}
            onModelPathChange={setModelPath}
            onDetectDesktopHardware={() => void detectDesktopHardware()}
            onRunDesktopSetup={() => void runDesktopSetup()}
            onQueryDesktopDependencyStatus={() => void queryDesktopDependencyStatus()}
          />

          {renderVoiceLibraryPanel('embedded')}
        </div>
      )}
    </section>
  )
}
