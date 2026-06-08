import type { UploadProps } from 'antd'
import type { DragEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Empty, Input, Modal, Popconfirm, Select, Space, Upload } from 'antd'
import {
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup, StoryboardVoiceEntry } from './personalSpaceModel'
import { PersonalAssetPreview } from './PersonalAssetPreview'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  readStoredResourceBlob,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'

type SelectOption = { label: string; value: string }
type StoryboardPlaybackStep = { groupId: string; assetId: string; source: string }
type StoryboardPlaybackSource = { source: string; objectUrl?: string } | null
type StoryboardVoiceDropPlacement = 'before' | 'after'
type DraggedStoryboardVoice = { groupId: string; assetId: string; placement?: StoryboardVoiceDropPlacement } | null
type StoryboardVoiceDropTarget = { assetId: string; placement: StoryboardVoiceDropPlacement } | null

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

function includesKeyword(values: Array<string | undefined>, keyword: string) {
  const cleanKeyword = keyword.trim().toLowerCase()
  if (!cleanKeyword) return true
  return values.some((value) => value?.toLowerCase().includes(cleanKeyword))
}

function characterInitial(name: string) {
  return name.trim().slice(0, 1) || '?'
}

function findPortraitAsset(character: CharacterProfile, allAssets: PersonalSpaceAsset[]) {
  const portraitLink = character.portraitAssets.slice().sort((a, b) => a.order - b.order)[0]
  return portraitLink ? allAssets.find((asset) => asset.id === portraitLink.assetId) : undefined
}

function CharacterAvatar({ character, allAssets }: { character: CharacterProfile; allAssets: PersonalSpaceAsset[] }) {
  const portrait = findPortraitAsset(character, allAssets)
  const portraitPath = portrait?.resourcePaths[0]
  return (
    <Avatar
      size={34}
      src={portraitPath}
      className="storyboard-avatar"
    >
      {characterInitial(character.name)}
    </Avatar>
  )
}

function moveAssetIdAroundTarget(
  assetIds: string[],
  draggedAssetId: string,
  targetAssetId: string,
  placement: StoryboardVoiceDropPlacement,
) {
  if (draggedAssetId === targetAssetId) return assetIds
  const next = assetIds.filter((assetId) => assetId !== draggedAssetId)
  const targetIndex = next.indexOf(targetAssetId)
  if (targetIndex < 0) return assetIds
  next.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, draggedAssetId)
  return next
}

function getStoryboardVoiceListDropTarget(event: DragEvent<HTMLElement>, draggedAssetId: string): StoryboardVoiceDropTarget {
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-storyboard-voice-id]'))
    .map((row) => ({ row, assetId: row.dataset.storyboardVoiceId ?? '' }))
    .filter((row) => row.assetId && row.assetId !== draggedAssetId)
  if (rows.length === 0) return null
  const beforeRow = rows.find(({ row }) => {
    const rect = row.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2
  })
  if (beforeRow) return { assetId: beforeRow.assetId, placement: 'before' }
  return { assetId: rows[rows.length - 1].assetId, placement: 'after' }
}

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

async function createStoredResourceObjectUrl(storedPath: string) {
  if (!storedPath || !canCreateObjectUrl()) return ''
  const directoryHandle = getPersonalSpaceDirectoryHandle() ?? await loadPersistedPersonalSpaceDirectoryHandle()
  if (!directoryHandle) return ''
  setPersonalSpaceDirectoryHandle(directoryHandle)
  const blob = await readStoredResourceBlob(directoryHandle, storedPath)
  return URL.createObjectURL(blob)
}

function revokeObjectUrls(objectUrls: string[]) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
}

function StoryboardVoiceRow({
  entry,
  groupId,
  voiceAsset,
  speaker,
  characterOptions,
  allAssets,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onDragStartStoryboardVoice,
  onDragEndStoryboardVoice,
  isDragging,
  isDropTarget,
  dropPlacement,
  isTimelinePlaying,
  isCurrentPlayback,
  onPlayFrom,
  onStopPlayback,
}: {
  entry: StoryboardVoiceEntry
  groupId: string
  voiceAsset: PersonalSpaceAsset
  speaker?: CharacterProfile
  characterOptions: SelectOption[]
  allAssets: PersonalSpaceAsset[]
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onDragStartStoryboardVoice: (groupId: string, assetId: string) => void
  onDragEndStoryboardVoice: () => void
  isDragging: boolean
  isDropTarget: boolean
  dropPlacement?: StoryboardVoiceDropPlacement
  isTimelinePlaying: boolean
  isCurrentPlayback: boolean
  onPlayFrom: (groupId: string, assetId: string) => void
  onStopPlayback: () => void
}) {
  return (
    <article
      className={`storyboard-voice-row${isDragging ? ' storyboard-voice-row is-dragging' : ''}${isDropTarget ? ` storyboard-voice-row is-drop-target is-drop-${dropPlacement ?? 'after'}` : ''}`}
      data-storyboard-voice-id={voiceAsset.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', voiceAsset.id)
        onDragStartStoryboardVoice(groupId, voiceAsset.id)
      }}
      onDragEnd={onDragEndStoryboardVoice}
    >
      <div className="storyboard-voice-speaker">
        {speaker ? <CharacterAvatar character={speaker} allAssets={allAssets} /> : <Avatar size={34} className="storyboard-avatar">?</Avatar>}
        <Select
          size="small"
          className="storyboard-speaker-select"
          placeholder="关联角色"
          value={speaker?.id}
          options={characterOptions}
          showSearch
          optionFilterProp="label"
          onChange={(characterId) => onAssignStoryboardVoiceCharacter(groupId, voiceAsset.id, characterId)}
        />
      </div>
      <div className="storyboard-voice-main">
        <div className="storyboard-voice-meta">
          <PersonalAssetPreview asset={voiceAsset} />
          <strong>{voiceAsset.name}</strong>
          {speaker && <span>{speaker.name}</span>}
        </div>
        <Input
          size="small"
          value={entry.text}
          aria-label="对白文本"
          placeholder="对白文本"
          onChange={(event) => onUpdateStoryboardVoiceText(groupId, voiceAsset.id, event.target.value)}
        />
      </div>
      <div className={`storyboard-timeline${isTimelinePlaying ? ' is-playing' : ''}${isCurrentPlayback ? ' is-current' : ''}`}>
        <span className="storyboard-timeline-line" aria-hidden="true" />
        <Button
          size="small"
          type={isCurrentPlayback ? 'primary' : 'default'}
          icon={<PlayCircleOutlined />}
          onClick={() => onPlayFrom(groupId, voiceAsset.id)}
        >
          从这里开始播放
        </Button>
        {isTimelinePlaying && (
          <Button size="small" danger icon={<StopOutlined />} onClick={onStopPlayback}>
            停止播放
          </Button>
        )}
      </div>
      <Space.Compact>
        <Button
          size="small"
          danger
          icon={<DisconnectOutlined />}
          aria-label="取消关联配音"
          onClick={() => onUnassignStoryboardVoice(groupId, voiceAsset.id)}
        />
      </Space.Compact>
    </article>
  )
}

function StoryboardVoicePicker({
  groupId,
  voiceAssets,
  onAssignVoiceToStoryboard,
}: {
  groupId: string
  voiceAssets: PersonalSpaceAsset[]
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedVoiceAssetIds, setSelectedVoiceAssetIds] = useState<string[]>([])
  const [lastSelectedVoiceAssetId, setLastSelectedVoiceAssetId] = useState<string | null>(null)
  const filteredVoiceAssets = voiceAssets.filter((asset) => includesKeyword([asset.name, asset.dialogueText, asset.tags.join('、')], search))
  const selectedVoiceAssetIdSet = useMemo(() => new Set(selectedVoiceAssetIds), [selectedVoiceAssetIds])
  const selectedVoiceAssets = selectedVoiceAssetIds
    .map((assetId) => voiceAssets.find((asset) => asset.id === assetId))
    .filter((asset): asset is PersonalSpaceAsset => Boolean(asset))

  const closePicker = () => {
    setOpen(false)
    setSearch('')
    setSelectedVoiceAssetIds([])
    setLastSelectedVoiceAssetId(null)
  }

  const confirmVoice = () => {
    if (selectedVoiceAssetIds.length === 0) return
    selectedVoiceAssetIds.forEach((assetId) => onAssignVoiceToStoryboard(groupId, assetId))
    closePicker()
  }

  const selectVoiceAsset = (assetId: string, event: MouseEvent<HTMLButtonElement>) => {
    const filteredAssetIds = filteredVoiceAssets.map((asset) => asset.id)
    setSelectedVoiceAssetIds((current) => {
      if (event.shiftKey && lastSelectedVoiceAssetId) {
        const anchorIndex = filteredAssetIds.indexOf(lastSelectedVoiceAssetId)
        const targetIndex = filteredAssetIds.indexOf(assetId)
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
          const rangeAssetIds = filteredAssetIds.slice(start, end + 1)
          if (event.altKey || event.ctrlKey || event.metaKey) return Array.from(new Set([...current, ...rangeAssetIds]))
          return rangeAssetIds
        }
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return current.includes(assetId) ? current.filter((item) => item !== assetId) : [...current, assetId]
      }
      return [assetId]
    })
    setLastSelectedVoiceAssetId(assetId)
  }

  return (
    <div className="storyboard-voice-picker">
      <Button size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)}>关联配音</Button>
      <Modal
        open={open}
        title="关联配音"
        onCancel={closePicker}
        footer={[
          <Button key="cancel" onClick={closePicker}>取消</Button>,
          <Button key="confirm" type="primary" disabled={selectedVoiceAssetIds.length === 0} onClick={confirmVoice}>
            确认关联{selectedVoiceAssetIds.length > 1 ? ` ${selectedVoiceAssetIds.length} 个` : ''}配音
          </Button>,
        ]}
      >
        <div className="storyboard-voice-picker-modal">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索配音"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        <div className="voice-picker-popover">
          {filteredVoiceAssets.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的配音" />
          ) : filteredVoiceAssets.map((asset) => (
            <button
              type="button"
              className={`voice-picker-option${selectedVoiceAssetIdSet.has(asset.id) ? ' is-selected' : ''}`}
              key={asset.id}
              onClick={(event) => selectVoiceAsset(asset.id, event)}
            >
              <strong>{asset.name}</strong>
              <span>{asset.dialogueText || asset.tags.join('、') || '未填写台词'}</span>
            </button>
          ))}
        </div>
          <span className="field-note">
            {selectedVoiceAssets.length > 0
              ? `已选 ${selectedVoiceAssets.length} 个：${selectedVoiceAssets.map((asset) => asset.name).join('、')}`
              : '选择配音后确认关联。Alt 可增减选择，Shift 可连续选择。'}
          </span>
        </div>
      </Modal>
    </div>
  )
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

  const resolveStoryboardVoicePlaybackSource = async (asset: PersonalSpaceAsset): Promise<StoryboardPlaybackSource> => {
    const storedPath = asset.storageResourcePaths[0]
    if (storedPath) {
      try {
        const objectUrl = await createStoredResourceObjectUrl(storedPath)
        if (objectUrl) return { source: objectUrl, objectUrl }
      } catch {
        // Fall back to the in-memory object URL when the authorized directory is unavailable.
      }
    }
    const source = asset.resourcePaths[0]
    return source ? { source } : null
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
                          <CharacterAvatar character={character} allAssets={allAssets} />
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
