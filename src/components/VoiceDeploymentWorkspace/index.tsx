import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Input, message, Modal, Select, Tag } from 'antd'
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
import {
  addCharacterProfile,
  readPersonalSpaceState,
  writePersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  personalSpaceDirectoryRequiredMessage,
  usePersonalSpaceDirectoryAuthorization,
} from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import { readStoredRecords, writeStoredRecords } from './voiceRecordStorage'
import {
  collectVoiceRecordToPersonalSpace,
  type VoiceCollectLinkTarget,
} from './voicePersonalSpaceCollector'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { useVoiceCollectLinkDialog } from './useVoiceCollectLinkDialog'
import { useVoiceDeploymentSetup } from './useVoiceDeploymentSetup'
import { useVoiceGenerationWorkflow } from './useVoiceGenerationWorkflow'

export default function VoiceDeploymentWorkspace() {
  const [messageApi, messageContextHolder] = message.useMessage()
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
    controlDesktopService,
    selectModel,
    setDownloadSource,
    setModelPath,
  } = useVoiceDeploymentSetup()
  const [records, setRecords] = useState<VoiceGenerationRecord[]>(readStoredRecords)
  const [personalSpaceSnapshot, setPersonalSpaceSnapshot] = useState(() => readPersonalSpaceState())
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)
  const [selectedVoiceCharacterId, setSelectedVoiceCharacterId] = useState<string | null>(null)
  const {
    personalSpaceCollectEnabled,
    personalSpaceCollectDisabledReason,
  } = usePersonalSpaceDirectoryAuthorization()

  useEffect(() => { writeStoredRecords(records) }, [records])
  const personalSpaceVoiceAssets = personalSpaceSnapshot.assets.filter((asset) => asset.kind === 'voice')
  const selectedVoiceCharacterName = personalSpaceSnapshot.characters.find((character) => character.id === selectedVoiceCharacterId)?.name ?? ''
  const characterLinkOptions = personalSpaceSnapshot.characters.map((character) => ({ label: character.name, value: character.id }))
  const effectLinkOptions = personalSpaceSnapshot.assets
    .filter((asset) => asset.kind === 'effect')
    .map((asset) => ({ label: asset.name, value: asset.id }))
  const storyboardLinkOptions = personalSpaceSnapshot.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))

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

  const createVoiceCharacter = useCallback((name: string) => {
    const nextSpace = addCharacterProfile(personalSpaceSnapshot, name)
    const createdCharacter = nextSpace.characters[nextSpace.characters.length - 1]
    writePersonalSpaceState(nextSpace)
    setPersonalSpaceSnapshot(nextSpace)
    setSelectedVoiceCharacterId(createdCharacter?.id ?? null)
    void messageApi.success(`已创建角色：${createdCharacter?.name ?? name.trim()}`)
  }, [messageApi, personalSpaceSnapshot])

  const collectRecordToPersonalSpace = useCallback(async (
    record: VoiceGenerationRecord,
    link?: { target: VoiceCollectLinkTarget; targetId: string },
  ) => {
    try {
      const nextSpace = await collectVoiceRecordToPersonalSpace(record, link)
      setPersonalSpaceSnapshot(nextSpace)
      const linkLabel = link?.target === 'character' ? '并关联角色'
        : link?.target === 'effect' ? '并关联特效'
        : link?.target === 'storyboard' ? '并关联剧情'
        : ''
      void messageApi.success(`已收藏到个人空间${linkLabel}`)
    } catch (error) {
      const reason = error instanceof Error && error.message === personalSpaceDirectoryRequiredMessage
        ? error.message
        : '收藏到个人空间失败，请检查浏览器存储权限。'
      void messageApi.error(reason)
    }
  }, [messageApi])

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
    onOpen: () => setPersonalSpaceSnapshot(readPersonalSpaceState()),
    onConfirm: (record, link) => void collectRecordToPersonalSpace(record, link),
  })

  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

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
            <p className="field-note">会先把当前配音收藏到个人空间，再建立这条关联。</p>
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
                onClick={() => void controlDesktopService('start').then(() => runCheck(port))}
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

      {desktopServiceResult ? (
        <Alert
          className="status-alert"
          type={desktopServiceResult.ok ? 'success' : 'warning'}
          showIcon
          title={desktopServiceResult.ok ? '服务命令已执行' : '服务命令未完成'}
          description={desktopServiceResult.output || '没有返回详细信息。'}
        />
      ) : null}

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

          <VoiceLibraryPanel
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

          <VoiceLibraryPanel
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
        </div>
      )}
    </section>
  )
}
