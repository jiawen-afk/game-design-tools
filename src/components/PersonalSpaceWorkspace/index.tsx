import { useEffect, useState } from 'react'
import type { UploadProps } from 'antd'
import { Alert, Button, Checkbox, Empty, Input, message, Popconfirm, Select, Space, Tabs, Tag, Upload } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, DownOutlined, ExportOutlined, FolderOpenOutlined, PlusOutlined, SaveOutlined, UpOutlined, UploadOutlined } from '@ant-design/icons'
import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  deleteCharacterProfile,
  deleteStoryboardGroup,
  exportStoryboardReference,
  linkEffectAssetToVoice,
  readPersonalSpaceState,
  renameCharacterProfile,
  renameStoryboardGroup,
  reorderCharacterProfile,
  reorderCharacterVoice,
  reorderStoryboardVoice,
  setStoryboardCharacters,
  type CommonAssetKind,
  type PersonalSpaceState,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceText,
  writePersonalSpaceState,
} from './personalSpaceModel'
import {
  type PersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  deleteAssetWithOptionalResources,
  exportStoryboardAssetToTarget,
  pickPersonalSpaceDirectory,
} from './personalSpaceResourceActions'

import '../VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css'
import './personalSpace.css'

function assetKindLabel(kind: string) {
  if (kind === 'sprite') return '精灵图'
  if (kind === 'voice') return '配音'
  if (kind === 'effect') return '特效'
  return '地图'
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

function splitTags(value: string) {
  return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean)
}

export default function PersonalSpaceWorkspace() {
  const [space, setSpace] = useState<PersonalSpaceState>(() => readPersonalSpaceState())
  const [draftStorageDirectory, setDraftStorageDirectory] = useState(space.settings.storageDirectory)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const [directoryHandle, setDirectoryHandle] = useState<PersonalSpaceDirectoryHandle | null>(null)
  const [savedSettings, setSavedSettings] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    writePersonalSpaceState(space)
  }, [space])

  useEffect(() => {
    let mounted = true
    loadPersistedPersonalSpaceDirectoryHandle()
      .then((handle) => {
        if (!mounted || !handle) return
        setDirectoryHandle(handle)
        setPersonalSpaceDirectoryHandle(handle)
        if (!space.settings.storageDirectory) {
          setDraftStorageDirectory(handle.name)
          setSpace((current) => ({
            ...current,
            settings: { ...current.settings, storageDirectory: handle.name },
          }))
        }
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [space.settings.storageDirectory])

  const saveSettings = () => {
    setSpace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        storageDirectory: draftStorageDirectory.trim(),
      },
    }))
    setSavedSettings(true)
    window.setTimeout(() => setSavedSettings(false), 1600)
    void messageApi.success('已保存个人空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        void messageApi.warning('当前浏览器不支持授权本地目录，请继续使用路径记录模式。')
        return
      }
      setDirectoryHandle(handle)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.name },
      }))
      void messageApi.success('已授权资源存储目录')
    } catch {
      void messageApi.warning('未选择资源存储目录')
    }
  }

  const createCharacter = () => {
    setSpace((current) => addCharacterProfile(current, newCharacterName))
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    setSpace((current) => addStoryboardGroup(current, newStoryboardName))
    setNewStoryboardName('')
  }

  const copyStoryboardReference = (id: string) => {
    const exported = exportStoryboardReference(space, id)
    void navigator.clipboard?.writeText(JSON.stringify(exported, null, 2))
  }

  const exportStoryboardAsset = async (id: string) => {
    try {
      const result = await exportStoryboardAssetToTarget(space, id, directoryHandle)
      void messageApi.success(result.kind === 'directory'
        ? `已导出剧情编排资产：${result.path}`
        : '已下载剧情编排资产')
    } catch (error) {
      void messageApi.error(`导出剧情编排资产失败：${String(error)}`)
    }
  }

  const uploadCharacterPortrait = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createPortraitAssetForUpload(space, file, directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'portrait', ['肖像'])
      })
      void messageApi.success('已上传角色肖像')
    } catch (error) {
      void messageApi.error(`上传肖像失败：${String(error)}`)
    }
  }

  const uploadCommonResource = async (kind: CommonAssetKind, file: File) => {
    try {
      const storedAsset = await createCommonResourceAssetForUpload(space, kind, file, directoryHandle)
      setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
      void messageApi.success(`已导入${assetKindLabel(kind)}素材`)
    } catch (error) {
      void messageApi.error(`导入${assetKindLabel(kind)}素材失败：${String(error)}`)
    }
  }

  const deleteAsset = async (assetId: string) => {
    const result = await deleteAssetWithOptionalResources(space, assetId, directoryHandle)
    setSpace((current) => applyAssetDeleteResult(current, assetId, result))
    if (result.attemptedResourceDeletion) {
      if (result.pendingDeletedPaths.length > 0) {
        void messageApi.warning('部分资源未能删除，已记录到待删除资源路径。')
      } else {
        void messageApi.success('已删除资源和存储目录文件。')
      }
    }
  }

  const portraitUploadProps = (characterId: string): UploadProps => ({
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCharacterPortrait(characterId, file as File)
      return false
    },
  })

  const commonResourceUploadProps = (kind: CommonAssetKind): UploadProps => ({
    accept: kind === 'map' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCommonResource(kind, file as File)
      return false
    },
  })

  const portraitAssets = space.assets.filter((asset) => asset.kind === 'map' && (asset.groupName === '角色肖像' || asset.tags.includes('肖像')))
  const mapAssets = space.assets.filter((asset) => asset.kind === 'map' && asset.groupName !== '角色肖像' && !asset.tags.includes('肖像'))
  const effectAssets = space.assets.filter((asset) => asset.kind === 'effect')
  const spriteAssets = space.assets.filter((asset) => asset.kind === 'sprite')
  const voiceAssets = space.assets.filter((asset) => asset.kind === 'voice')
  const characterOptions = space.characters.map((character) => ({ label: character.name, value: character.id }))
  const assetOptions = (assets: typeof space.assets) => assets.map((asset) => ({ label: asset.name, value: asset.id }))
  const resourceSections = [
    {
      kind: 'map' as const,
      title: '地图素材',
      description: '地图、场景底图、地块参考和关卡背景。',
      importLabel: '导入地图素材',
      emptyDescription: '还没有地图素材。导入地图或从工作台收藏后会显示在这里。',
      assets: mapAssets,
    },
    {
      kind: 'effect' as const,
      title: '特效素材',
      description: '技能特效、命中特效、环境特效和可关联音效的表现资源。',
      importLabel: '导入特效素材',
      emptyDescription: '还没有特效素材。导入特效后可继续关联配音素材。',
      assets: effectAssets,
    },
    {
      kind: 'voice' as const,
      title: '配音素材',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音素材',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      assets: voiceAssets,
    },
  ]
  const assetCounts = {
    sprite: spriteAssets.length,
    voice: voiceAssets.length,
    map: mapAssets.length,
    effect: effectAssets.length,
  }

  const storyboardVoiceRefs = (assetId: string) => space.storyboardGroups
    .flatMap((group) => group.voiceEntries
      .filter((entry) => entry.assetId === assetId)
      .map((entry) => `${group.name} #${entry.order + 1}`))

  const renderResourceSection = (section: (typeof resourceSections)[number]) => (
    <section className="space-panel">
      <section className="resource-section" aria-labelledby={`resource-${section.kind}-title`}>
        <div className="resource-section-head">
          <div>
            <h3 id={`resource-${section.kind}-title`}>{section.title}</h3>
            <p className="panel-copy">{section.description}</p>
          </div>
          <div className="resource-section-actions">
            <Tag>{section.assets.length} 个</Tag>
            <Upload {...commonResourceUploadProps(section.kind)}>
              <Button icon={<UploadOutlined />}>{section.importLabel}</Button>
            </Upload>
          </div>
        </div>

        {section.assets.length === 0 ? (
          <EmptyBlock description={section.emptyDescription} />
        ) : (
          <div className="resource-list">
            {section.assets.map((item) => (
              <article className="space-record" key={item.id}>
                <div className="command-row">
                  <Input
                    value={item.name}
                    aria-label={`${section.title}名称`}
                    onChange={(event) => setSpace((current) => updatePersonalSpaceAsset(current, item.id, { name: event.target.value }))}
                  />
                  <Space>
                    <Tag>{assetKindLabel(item.kind)}</Tag>
                    <Popconfirm title="删除资源" description="会移除角色和剧情中的关联；勾选设置后会尝试同步删除存储目录资源。" onConfirm={() => void deleteAsset(item.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
                <div className="form-stack">
                  <Input
                    value={item.groupName}
                    aria-label={`${section.title}分组`}
                    addonBefore="分组"
                    onChange={(event) => setSpace((current) => updatePersonalSpaceAsset(current, item.id, { groupName: event.target.value }))}
                  />
                  <Input
                    value={item.tags.join('、')}
                    aria-label={`${section.title}标签`}
                    addonBefore="标签"
                    onChange={(event) => setSpace((current) => updatePersonalSpaceAsset(current, item.id, { tags: event.target.value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean) }))}
                  />
                  <span className="field-note">{item.resourcePaths.join('、') || '未绑定本地文件'}</span>
                  {item.storageResourcePaths.length > 0 && (
                    <span className="field-note">存储目标：{item.storageResourcePaths.join('、')}</span>
                  )}
                  {item.kind === 'effect' && (
                    <label className="form-field">
                      <span className="field-label">关联配音素材</span>
                      <Select
                        mode="multiple"
                        value={item.linkedVoiceAssetIds}
                        options={assetOptions(voiceAssets)}
                        onChange={(voiceIds) => setSpace((current) => voiceIds.reduce((next, voiceId) => linkEffectAssetToVoice(next, item.id, voiceId), updatePersonalSpaceAsset(current, item.id, { linkedVoiceAssetIds: [] })))}
                      />
                    </label>
                  )}
                  {item.kind === 'voice' && (
                    <>
                      <label className="form-field">
                        <span className="field-label">关联角色</span>
                        <Select
                          mode="multiple"
                          value={item.linkedCharacterIds}
                          options={characterOptions}
                          onChange={(characterIds) => setSpace((current) => updatePersonalSpaceAsset(current, item.id, { linkedCharacterIds: characterIds }))}
                        />
                      </label>
                      <label className="form-field">
                        <span className="field-label">关联剧情组</span>
                        <Select
                          mode="multiple"
                          value={item.linkedStoryboardIds}
                          options={space.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))}
                          onChange={(storyboardIds) => setSpace((current) => updatePersonalSpaceAsset(current, item.id, { linkedStoryboardIds: storyboardIds }))}
                        />
                      </label>
                      <span className="field-note">剧情顺序：{storyboardVoiceRefs(item.id).join('、') || '未编排到剧情组'}</span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )

  return (
    <section className="personal-space" aria-labelledby="personal-space-title">
      {contextHolder}
      <div className="personal-hero">
        <div>
          <p className="kicker">个人空间</p>
          <h2 id="personal-space-title">素材与编排管理</h2>
          <p>承接精灵图工作台和配音工作台产出的资源，把角色、素材、剧情组和本地目录串成同一个资产关系表。</p>
        </div>
        <div className="storage-status">
          <Tag color={directoryHandle ? 'success' : undefined}>{directoryHandle ? '已授权目录' : '路径记录模式'}</Tag>
          <span>{draftStorageDirectory || '未设置资源存储目录'}</span>
        </div>
      </div>

      <section className="personal-overview" aria-label="个人空间总览">
        <div className="personal-stat">
          <span>角色</span>
          <strong>{space.characters.length}</strong>
        </div>
        <div className="personal-stat">
          <span>剧情组</span>
          <strong>{space.storyboardGroups.length}</strong>
        </div>
        <div className="personal-stat">
          <span>精灵图</span>
          <strong>{assetCounts.sprite}</strong>
        </div>
        <div className="personal-stat">
          <span>地图</span>
          <strong>{assetCounts.map}</strong>
        </div>
        <div className="personal-stat">
          <span>特效</span>
          <strong>{assetCounts.effect}</strong>
        </div>
        <div className="personal-stat">
          <span>配音</span>
          <strong>{assetCounts.voice}</strong>
        </div>
      </section>

      <Tabs
        className="personal-tabs"
        items={[
          {
            key: 'characters',
            label: '角色',
            children: (
              <section className="space-panel">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={newCharacterName}
                    onChange={(event) => setNewCharacterName(event.target.value)}
                    onPressEnter={createCharacter}
                    placeholder="新角色名称"
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={createCharacter}>创建角色</Button>
                </Space.Compact>
                <strong>角色列表</strong>
                {space.characters.length === 0 ? (
                  <EmptyBlock description="还没有角色。创建后可继续关联肖像、精灵图和配音。" />
                ) : (
                  <div className="form-stack">
                    {[...space.characters].sort((a, b) => a.order - b.order).map((item) => (
                      <article className="space-record" key={item.id}>
                        <div className="command-row">
                          <Input
                            value={item.name}
                            aria-label="角色名称"
                            onChange={(event) => setSpace((current) => renameCharacterProfile(current, item.id, event.target.value))}
                          />
                          <Space>
                            <Button size="small" icon={<UpOutlined />} onClick={() => setSpace((current) => reorderCharacterProfile(current, item.id, 'up'))} />
                            <Button size="small" icon={<DownOutlined />} onClick={() => setSpace((current) => reorderCharacterProfile(current, item.id, 'down'))} />
                            <Popconfirm title="删除角色" description="会移除该角色与素材、剧情组的关联。" onConfirm={() => setSpace((current) => deleteCharacterProfile(current, item.id))}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                        <span className="field-note">肖像 {item.portraitAssetIds.length} · 精灵图 {item.spriteAssetIds.length} · 配音 {item.voiceAssetIds.length}</span>
                        <div className="space-columns">
                          <div className="space-column">
                            <strong>角色肖像</strong>
                            <Upload {...portraitUploadProps(item.id)}>
                              <Button icon={<UploadOutlined />}>上传肖像</Button>
                            </Upload>
                            <Select
                              placeholder="关联肖像资源"
                              options={assetOptions(portraitAssets)}
                              onChange={(assetId) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, assetId, 'portrait', ['肖像']))}
                            />
                            {item.portraitAssets.map((link) => (
                              <Input
                                key={link.assetId}
                                addonBefore={space.assets.find((asset) => asset.id === link.assetId)?.name ?? '肖像'}
                                value={link.tags.join('、')}
                                aria-label="角色肖像标签"
                                onChange={(event) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, link.assetId, 'portrait', splitTags(event.target.value)))}
                              />
                            ))}
                          </div>
                          <div className="space-column">
                            <strong>角色精灵图</strong>
                            <Select
                              placeholder="关联精灵图资源"
                              options={assetOptions(spriteAssets)}
                              onChange={(assetId) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, assetId, 'sprite', ['站立']))}
                            />
                            {item.spriteAssets.map((link) => (
                              <Input
                                key={link.assetId}
                                addonBefore={space.assets.find((asset) => asset.id === link.assetId)?.name ?? '精灵图'}
                                value={link.tags.join('、')}
                                aria-label="角色精灵图标签"
                                placeholder="站立、上走、下走、左走、右走、奔跑、互动、攻击、施法、受伤、死亡"
                                onChange={(event) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, link.assetId, 'sprite', splitTags(event.target.value)))}
                              />
                            ))}
                          </div>
                          <div className="space-column">
                            <strong>角色配音</strong>
                            <Select
                              placeholder="关联配音资源"
                              options={assetOptions(voiceAssets)}
                              onChange={(assetId) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, assetId, 'voice', ['角色配音']))}
                            />
                            {item.voiceAssets.map((link) => (
                              <div className="form-stack" key={link.assetId}>
                                <div className="command-row">
                                  <Input
                                    addonBefore={space.assets.find((asset) => asset.id === link.assetId)?.name ?? '配音'}
                                    value={link.tags.join('、')}
                                    aria-label="角色配音标签"
                                    onChange={(event) => setSpace((current) => assignAssetToCharacterColumn(current, item.id, link.assetId, 'voice', splitTags(event.target.value)))}
                                  />
                                  <Space>
                                    <Button size="small" icon={<UpOutlined />} onClick={() => setSpace((current) => reorderCharacterVoice(current, item.id, link.assetId, 'up'))} />
                                    <Button size="small" icon={<DownOutlined />} onClick={() => setSpace((current) => reorderCharacterVoice(current, item.id, link.assetId, 'down'))} />
                                  </Space>
                                </div>
                                <span className="field-note">剧情顺序：{storyboardVoiceRefs(link.assetId).join('、') || '未关联剧情组'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ),
          },
          {
            key: 'storyboards',
            label: '剧情编排',
            children: (
              <section className="space-panel">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={newStoryboardName}
                    onChange={(event) => setNewStoryboardName(event.target.value)}
                    onPressEnter={createStoryboard}
                    placeholder="新剧情分组名称"
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={createStoryboard}>创建剧情组</Button>
                </Space.Compact>
                <strong>剧情分组</strong>
                {space.storyboardGroups.length === 0 ? (
                  <EmptyBlock description="还没有剧情分组。创建后可导入角色、导入配音、填写对白文本，并按组导出剧情编排资产。" />
                ) : (
                  <div className="form-stack">
                    {space.storyboardGroups.map((item) => (
                      <article className="space-record" key={item.id}>
                        <div className="command-row">
                          <Input
                            value={item.name}
                            aria-label="剧情组名称"
                            onChange={(event) => setSpace((current) => renameStoryboardGroup(current, item.id, event.target.value))}
                          />
                          <Space>
                            <Button size="small" icon={<ExportOutlined />} onClick={() => copyStoryboardReference(item.id)}>复制参考资产</Button>
                            <Button size="small" icon={<ExportOutlined />} onClick={() => void exportStoryboardAsset(item.id)}>导出参考资产</Button>
                            <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => setSpace((current) => deleteStoryboardGroup(current, item.id))}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                        <span className="field-note">角色 {item.characterIds.length} · 配音 {item.voiceAssetIds.length}</span>
                        <div className="form-stack">
                          <label className="form-field">
                            <span className="field-label">导入角色</span>
                            <Select
                              mode="multiple"
                              value={item.characterIds}
                              options={characterOptions}
                              onChange={(characterIds) => setSpace((current) => setStoryboardCharacters(current, item.id, characterIds))}
                            />
                          </label>
                          <label className="form-field">
                            <span className="field-label">导入配音</span>
                            <Select
                              placeholder="选择配音素材"
                              options={assetOptions(voiceAssets)}
                              onChange={(assetId) => setSpace((current) => assignVoiceToStoryboardGroup(current, item.id, assetId, ''))}
                            />
                          </label>
                          {[...item.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => (
                            <div className="command-row" key={entry.assetId}>
                              <label className="form-field">
                                <span className="field-label">对白文本 #{entry.order + 1} · {space.assets.find((asset) => asset.id === entry.assetId)?.name ?? '配音'}</span>
                                <Input.TextArea
                                  rows={2}
                                  value={entry.text}
                                  aria-label="对白文本"
                                  placeholder="对白文本"
                                  onChange={(event) => setSpace((current) => updateStoryboardVoiceText(current, item.id, entry.assetId, event.target.value))}
                                />
                              </label>
                              <Space>
                                <Button size="small" icon={<UpOutlined />} onClick={() => setSpace((current) => reorderStoryboardVoice(current, item.id, entry.assetId, 'up'))} />
                                <Button size="small" icon={<DownOutlined />} onClick={() => setSpace((current) => reorderStoryboardVoice(current, item.id, entry.assetId, 'down'))} />
                              </Space>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ),
          },
          ...resourceSections.map((section) => ({
            key: `resource-${section.kind}`,
            label: section.title,
            children: renderResourceSection(section),
          })),
          {
            key: 'settings',
            label: '设置',
            children: (
              <section className="space-panel">
                <div className="form-stack">
                  <label className="form-field">
                    <span className="field-label">资源存储目录</span>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        prefix={<FolderOpenOutlined />}
                        value={draftStorageDirectory}
                        onChange={(event) => setDraftStorageDirectory(event.target.value)}
                        placeholder="例如 D:\\GameAssets\\PersonalSpace"
                      />
                      <Button icon={<FolderOpenOutlined />} onClick={() => void chooseStorageDirectory()}>
                        选择授权目录
                      </Button>
                    </Space.Compact>
                  </label>

                  <Checkbox
                    checked={space.settings.deleteResourcesWithContent}
                    onChange={(event) => setSpace((current) => ({
                      ...current,
                      settings: { ...current.settings, deleteResourcesWithContent: event.target.checked },
                    }))}
                  >
                    删除内容同时删除资源
                  </Checkbox>

                  <Button
                    type="primary"
                    icon={savedSettings ? <CheckCircleOutlined /> : <SaveOutlined />}
                    onClick={saveSettings}
                  >
                    {savedSettings ? '已保存' : '保存设置'}
                  </Button>

                  <Alert
                    type="info"
                    showIcon
                    title={directoryHandle ? '已授权本地资源目录' : '未授权目录时使用路径记录模式'}
                    description={directoryHandle
                      ? '收藏和上传的新资源会写入授权目录，并按角色肖像、角色精灵图、配音素材、特效素材、地图素材分类。'
                      : '可以手动填写目录路径生成存储目标；点击选择授权目录后，支持浏览器文件系统写入和删除。'}
                  />

                  {space.pendingDeletedResourcePaths.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      title="待删除资源路径"
                      description={space.pendingDeletedResourcePaths.join('、')}
                    />
                  )}
                </div>
              </section>
            ),
          },
        ]}
      />

    </section>
  )
}
