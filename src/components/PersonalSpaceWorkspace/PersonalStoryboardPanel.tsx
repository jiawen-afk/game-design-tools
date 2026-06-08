import type { UploadProps } from 'antd'
import type { DragEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Popconfirm, Upload } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { StoryboardCharacterAvatar } from './StoryboardCharacterAvatar'
import { StoryboardVoicePicker } from './StoryboardVoicePicker'
import { StoryboardVoiceRow } from './StoryboardVoiceRow'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import {
  getStoryboardVoiceListDropTarget,
  moveAssetIdAroundTarget,
  type DraggedStoryboardVoice,
  type StoryboardVoiceDropPlacement,
} from './storyboardVoiceDrag'
import {
  resolveStoryboardVoicePlaybackSource,
  revokeObjectUrls,
} from './storyboardPlaybackSources'

type StoryboardPlaybackStep = { groupId: string; assetId: string; source: string }

interface PersonalStoryboardPanelProps {
  storyboardGroups: StoryboardGroup[]
  newStoryboardName: string
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardLinkedCharacterIds: (groupId: string) => string[]
  getStoryboardVoiceUploadProps: (groupId: string) => UploadProps
  onNewStoryboardNameChange: (name: string) => void
  onCreateStoryboard: () => void
  onRenameStoryboard: (groupId: string, name: string) => void
  onToggleStoryboardStar: (groupId: string) => void
  storyboardExportingKey: string
  onExportStoryboardVoiceAssets: (groupId: string) => void
  onExportStoryboardCharacterAssets: (groupId: string) => void
  onExportAllStoryboardVoiceAssets: () => void
  onExportAllStoryboardCharacterAssets: () => void
  onDeleteStoryboard: (groupId: string) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onMoveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string, placement?: StoryboardVoiceDropPlacement) => void
}

export function PersonalStoryboardPanel({
  storyboardGroups,
  newStoryboardName,
  characters,
  voiceAssets,
  allAssets,
  getStoryboardLinkedCharacterIds,
  getStoryboardVoiceUploadProps,
  onNewStoryboardNameChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onToggleStoryboardStar,
  storyboardExportingKey,
  onExportStoryboardVoiceAssets,
  onExportStoryboardCharacterAssets,
  onExportAllStoryboardVoiceAssets,
  onExportAllStoryboardCharacterAssets,
  onDeleteStoryboard,
  onAssignVoiceToStoryboard,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onMoveStoryboardVoice,
}: PersonalStoryboardPanelProps) {
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters])
  const voiceById = useMemo(() => new Map(voiceAssets.map((asset) => [asset.id, asset])), [voiceAssets])
  const characterOptions = characters.map((character) => ({ label: character.name, value: character.id }))
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackQueueRef = useRef<StoryboardPlaybackStep[]>([])
  const playbackObjectUrlsRef = useRef<string[]>([])
  const playbackRequestRef = useRef(0)
  const playbackIndexRef = useRef(0)
  const [currentPlayback, setCurrentPlayback] = useState<StoryboardPlaybackStep | null>(null)
  const [draggedStoryboardVoice, setDraggedStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [dropTargetStoryboardVoice, setDropTargetStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [previewStoryboardVoiceOrders, setPreviewStoryboardVoiceOrders] = useState<Record<string, string[]>>({})
  const [creatingStoryboard, setCreatingStoryboard] = useState(false)
  const [selectedStoryboardFilter, setSelectedStoryboardFilter] = useState('全部剧情组')
  const [onlyStarredStoryboards, setOnlyStarredStoryboards] = useState(false)
  const [renamingStoryboardId, setRenamingStoryboardId] = useState('')
  const [storyboardNameDrafts, setStoryboardNameDrafts] = useState<Record<string, string>>({})
  const isExportingStoryboard = Boolean(storyboardExportingKey)
  const starFilteredStoryboardGroups = onlyStarredStoryboards ? storyboardGroups.filter((group) => group.starred) : storyboardGroups
  const recentStoryboardOptions = starFilteredStoryboardGroups.slice(-20).reverse()
  const storyboardFilterOptions = [
    { label: '最近创建的20个剧情组', value: '全部剧情组' },
    ...storyboardGroups.map((group) => ({ label: group.name, value: group.id })),
  ]
  const visibleStoryboardGroups = selectedStoryboardFilter === '全部剧情组'
    ? recentStoryboardOptions
    : starFilteredStoryboardGroups.filter((group) => group.id === selectedStoryboardFilter)

  const stopStoryboardPlayback = () => {
    playbackRequestRef.current += 1
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    revokeObjectUrls(playbackObjectUrlsRef.current)
    playbackObjectUrlsRef.current = []
    playbackQueueRef.current = []
    playbackIndexRef.current = 0
    setCurrentPlayback(null)
  }

  const clearStoryboardPlaybackForRestart = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    revokeObjectUrls(playbackObjectUrlsRef.current)
    playbackObjectUrlsRef.current = []
    playbackQueueRef.current = []
    playbackIndexRef.current = 0
    setCurrentPlayback(null)
  }

  const playStoryboardStep = (step: StoryboardPlaybackStep | null) => {
    if (!step) {
      stopStoryboardPlayback()
      return
    }
    setCurrentPlayback(step)
  }

  const playNextStoryboardVoice = () => {
    playbackIndexRef.current += 1
    playStoryboardStep(playbackQueueRef.current[playbackIndexRef.current] ?? null)
  }

  const playStoryboardFrom = async (groupId: string, assetId: string) => {
    const requestId = playbackRequestRef.current + 1
    playbackRequestRef.current = requestId
    clearStoryboardPlaybackForRestart()
    const group = storyboardGroups.find((item) => item.id === groupId)
    if (!group) return
    const orderedEntries = [...group.voiceEntries].sort((a, b) => a.order - b.order)
    const startIndex = orderedEntries.findIndex((entry) => entry.assetId === assetId)
    if (startIndex < 0) return
    const playbackSources = await Promise.all(orderedEntries.slice(startIndex).map(async (entry) => {
      const asset = voiceById.get(entry.assetId)
      const playbackSource = asset ? await resolveStoryboardVoicePlaybackSource(asset) : null
      return playbackSource ? { entry, playbackSource } : null
    }))
    const objectUrls = playbackSources.flatMap((item) => item?.playbackSource.objectUrl ? [item.playbackSource.objectUrl] : [])
    if (playbackRequestRef.current !== requestId) {
      revokeObjectUrls(objectUrls)
      return
    }
    playbackObjectUrlsRef.current = objectUrls
    const queue = playbackSources.flatMap<StoryboardPlaybackStep>((item) => (
      item ? [{ groupId, assetId: item.entry.assetId, source: item.playbackSource.source }] : []
    ))
    playbackQueueRef.current = queue
    playbackIndexRef.current = 0
    playStoryboardStep(queue[0] ?? null)
  }

  const startStoryboardVoiceDrag = (groupId: string, assetId: string) => {
    const group = storyboardGroups.find((item) => item.id === groupId)
    const assetIds = group ? [...group.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => entry.assetId) : []
    setDraggedStoryboardVoice({ groupId, assetId })
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders((orders) => ({ ...orders, [groupId]: assetIds }))
  }

  const previewStoryboardVoiceDrop = (groupId: string, targetAssetId: string, placement: StoryboardVoiceDropPlacement) => {
    if (!draggedStoryboardVoice || draggedStoryboardVoice.groupId !== groupId) return
    setDropTargetStoryboardVoice({ groupId, assetId: targetAssetId, placement })
    setPreviewStoryboardVoiceOrders((orders) => {
      const group = storyboardGroups.find((item) => item.id === groupId)
      const baseOrder = orders[groupId]
        ?? (group ? [...group.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => entry.assetId) : [])
      return {
        ...orders,
        [groupId]: moveAssetIdAroundTarget(baseOrder, draggedStoryboardVoice.assetId, targetAssetId, placement),
      }
    })
  }

  const previewStoryboardVoiceListDrop = (event: DragEvent<HTMLElement>, groupId: string, draggedAssetId: string) => {
    const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
    if (!target) return
    previewStoryboardVoiceDrop(groupId, target.assetId, target.placement)
  }

  const dropStoryboardVoiceOnList = (event: DragEvent<HTMLElement>, groupId: string) => {
    event.preventDefault()
    const draggedAssetId = event.dataTransfer.getData('text/plain')
    if (draggedAssetId) {
      const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
      if (target) onMoveStoryboardVoice(groupId, draggedAssetId, target.assetId, target.placement)
    }
    endStoryboardVoiceDrag()
  }

  function cancelStoryboardVoiceListDrop(event: DragEvent<HTMLElement>, groupId: string) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDropTargetStoryboardVoice((target) => (target?.groupId === groupId ? null : target))
    setPreviewStoryboardVoiceOrders((orders) => {
      if (!orders[groupId]) return orders
      const next = { ...orders }
      delete next[groupId]
      return next
    })
  }

  const endStoryboardVoiceDrag = () => {
    setDraggedStoryboardVoice(null)
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders({})
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentPlayback) return
    audio.src = currentPlayback.source
    audio.load()
    void audio.play()
  }, [currentPlayback])

  useEffect(() => () => stopStoryboardPlayback(), [])

  useEffect(() => {
    if (selectedStoryboardFilter !== '全部剧情组' && !storyboardGroups.some((group) => group.id === selectedStoryboardFilter)) {
      setSelectedStoryboardFilter('全部剧情组')
    }
  }, [selectedStoryboardFilter, storyboardGroups])

  const confirmCreateStoryboard = () => {
    if (!newStoryboardName.trim()) return
    onCreateStoryboard()
    setCreatingStoryboard(false)
  }

  const cancelCreateStoryboard = () => {
    onNewStoryboardNameChange('')
    setCreatingStoryboard(false)
  }

  return (
      <section className="space-panel">
      <audio ref={audioRef} onEnded={playNextStoryboardVoice} />
      <div className="storyboard-panel-toolbar">
        <div className="storyboard-toolbar-left">
          <PersonalSpaceTextPopover
            open={creatingStoryboard}
            onOpenChange={(open) => {
              if (open) setCreatingStoryboard(true)
              else cancelCreateStoryboard()
            }}
            className="storyboard-create-popover"
            value={newStoryboardName}
            ariaLabel="新剧情分组名称"
            placeholder="新剧情分组名称"
            confirmIcon={<PlusOutlined />}
            confirmDisabled={!newStoryboardName.trim()}
            onValueChange={onNewStoryboardNameChange}
            onConfirm={confirmCreateStoryboard}
            onCancel={cancelCreateStoryboard}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingStoryboard(true)}>创建剧情组</Button>
          </PersonalSpaceTextPopover>
          <PersonalSpaceFilterControl
            className="storyboard-filter-control"
            value={selectedStoryboardFilter}
            defaultValue="全部剧情组"
            options={storyboardFilterOptions}
            onlyStarred={onlyStarredStoryboards}
            onChange={setSelectedStoryboardFilter}
            onOnlyStarredChange={setOnlyStarredStoryboards}
          />
        </div>
        <div className="storyboard-global-actions">
          <Button
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === 'all-voices'}
            disabled={isExportingStoryboard || storyboardGroups.length === 0}
            onClick={onExportAllStoryboardVoiceAssets}
          >
            导出所有分组配音资产
          </Button>
          <Button
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === 'all-characters'}
            disabled={isExportingStoryboard || storyboardGroups.length === 0}
            onClick={onExportAllStoryboardCharacterAssets}
          >
            导出所有分组关联角色资产
          </Button>
        </div>
      </div>
      {storyboardGroups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有剧情分组。创建后可导入配音、填写对白文本，并按组导出剧情编排资产。" />
      ) : (
        <div className="form-stack">
          {visibleStoryboardGroups.map((item) => {
            const linkedCharacterIds = getStoryboardLinkedCharacterIds(item.id)
            const orderedVoiceEntries = [...item.voiceEntries].sort((a, b) => a.order - b.order)
            const previewVoiceAssetIds = previewStoryboardVoiceOrders[item.id]
            const visibleVoiceEntries = previewVoiceAssetIds
              ? previewVoiceAssetIds.flatMap((assetId) => orderedVoiceEntries.find((entry) => entry.assetId === assetId) ?? [])
              : orderedVoiceEntries
            return (
            <article className="space-record" key={item.id}>
              <div className="command-row storyboard-command-row">
                <div className="record-name-view storyboard-name-view">
                  <span className="field-label">分组名称</span>
                  <Button
                    size="small"
                    type="text"
                    className="star-toggle-button"
                    icon={item.starred ? <StarFilled /> : <StarOutlined />}
                    aria-label={item.starred ? '取消星标剧情分组' : '星标剧情分组'}
                    onClick={() => onToggleStoryboardStar(item.id)}
                  />
                  <strong>{item.name}</strong>
                  <PersonalSpaceTextPopover
                    open={renamingStoryboardId === item.id}
                    onOpenChange={(open) => {
                      setRenamingStoryboardId(open ? item.id : '')
                      setStoryboardNameDrafts((drafts) => ({ ...drafts, [item.id]: open ? (drafts[item.id] ?? item.name) : '' }))
                    }}
                    className="storyboard-name-rename-popover"
                    value={storyboardNameDrafts[item.id] ?? item.name}
                    ariaLabel={`${item.name}分组名称`}
                    placeholder="分组名称"
                    confirmDisabled={!(storyboardNameDrafts[item.id] ?? '').trim()}
                    onValueChange={(value) => setStoryboardNameDrafts((drafts) => ({ ...drafts, [item.id]: value }))}
                    onConfirm={() => {
                      onRenameStoryboard(item.id, storyboardNameDrafts[item.id] ?? item.name)
                      setStoryboardNameDrafts((drafts) => ({ ...drafts, [item.id]: '' }))
                      setRenamingStoryboardId('')
                    }}
                    onCancel={() => {
                      setStoryboardNameDrafts((drafts) => ({ ...drafts, [item.id]: '' }))
                      setRenamingStoryboardId('')
                    }}
                  >
                    <Button size="small" icon={<EditOutlined />} aria-label="重命名剧情分组" />
                  </PersonalSpaceTextPopover>
                </div>
                <div className="storyboard-header-actions">
                  <Upload {...getStoryboardVoiceUploadProps(item.id)}>
                    <Button size="small" icon={<UploadOutlined />}>导入配音</Button>
                  </Upload>
                  <StoryboardVoicePicker
                    groupId={item.id}
                    voiceAssets={voiceAssets}
                    onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
                  />
                  <Button
                    size="small"
                    icon={<ExportOutlined />}
                    loading={storyboardExportingKey === `group-voices-${item.id}`}
                    disabled={isExportingStoryboard}
                    onClick={() => onExportStoryboardVoiceAssets(item.id)}
                  >
                    导出分组配音资产
                  </Button>
                  <Button
                    size="small"
                    icon={<ExportOutlined />}
                    loading={storyboardExportingKey === `group-characters-${item.id}`}
                    disabled={isExportingStoryboard}
                    onClick={() => onExportStoryboardCharacterAssets(item.id)}
                  >
                    导出分组关联角色资产
                  </Button>
                  <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => onDeleteStoryboard(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
              <span className="field-note">关联角色 {linkedCharacterIds.length} · 配音 {item.voiceAssetIds.length}</span>
              <div className="storyboard-arranger">
                <aside className="storyboard-character-pane" aria-label="关联角色">
                  <span className="field-label">关联角色</span>
                  <div className="storyboard-character-list">
                    {linkedCharacterIds
                      .map((characterId) => characterById.get(characterId))
                      .filter((character): character is CharacterProfile => Boolean(character))
                      .map((character) => (
                        <div className="storyboard-character-item" key={character.id}>
                          <StoryboardCharacterAvatar character={character} allAssets={allAssets} />
                          <span>{character.name}</span>
                        </div>
                      ))}
                    {linkedCharacterIds.length === 0 && (
                      <span className="field-note">导入的配音关联角色后会显示在这里。</span>
                    )}
                  </div>
                </aside>
                <div
                  className="storyboard-voice-pane"
                  onDragOver={(event) => {
                    const draggedAssetId = event.dataTransfer.getData('text/plain') || draggedStoryboardVoice?.assetId
                    if (!draggedAssetId || draggedStoryboardVoice?.groupId !== item.id) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    previewStoryboardVoiceListDrop(event, item.id, draggedAssetId)
                  }}
                  onDragLeave={(event) => cancelStoryboardVoiceListDrop(event, item.id)}
                  onDrop={(event) => dropStoryboardVoiceOnList(event, item.id)}
                >
                  <div className="storyboard-voice-list">
                    {visibleVoiceEntries.map((entry) => {
                      const voiceAsset = voiceById.get(entry.assetId)
                      if (!voiceAsset) return null
                      const speaker = voiceAsset.linkedCharacterIds
                        .map((characterId) => characterById.get(characterId))
                        .find((character): character is CharacterProfile => Boolean(character))
                      return (
                        <StoryboardVoiceRow
                          key={entry.assetId}
                          entry={entry}
                          groupId={item.id}
                          voiceAsset={voiceAsset}
                          speaker={speaker}
                          characterOptions={characterOptions}
                          allAssets={allAssets}
                          onUnassignStoryboardVoice={onUnassignStoryboardVoice}
                          onAssignStoryboardVoiceCharacter={onAssignStoryboardVoiceCharacter}
                          onUpdateStoryboardVoiceText={onUpdateStoryboardVoiceText}
                          onDragStartStoryboardVoice={startStoryboardVoiceDrag}
                          onDragEndStoryboardVoice={endStoryboardVoiceDrag}
                          isDragging={draggedStoryboardVoice?.groupId === item.id && draggedStoryboardVoice.assetId === entry.assetId}
                          isDropTarget={dropTargetStoryboardVoice?.groupId === item.id && dropTargetStoryboardVoice.assetId === entry.assetId}
                          dropPlacement={dropTargetStoryboardVoice?.groupId === item.id && dropTargetStoryboardVoice.assetId === entry.assetId ? dropTargetStoryboardVoice.placement : undefined}
                          isTimelinePlaying={currentPlayback?.groupId === item.id}
                          isCurrentPlayback={currentPlayback?.groupId === item.id && currentPlayback.assetId === entry.assetId}
                          onPlayFrom={playStoryboardFrom}
                          onStopPlayback={stopStoryboardPlayback}
                        />
                      )
                    })}
                  </div>
                  {item.voiceEntries.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有导入配音。选择配音素材后即可编排多名角色对白。" />
                  )}
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
