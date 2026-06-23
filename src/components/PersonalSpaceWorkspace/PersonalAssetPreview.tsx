import { useEffect, useRef, useState } from 'react'
import { Button, Empty, Modal } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'

import type { ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import { spriteFrameModalStyle } from './personalSpacePreviewModel'
import { resolveProjectAssetResourceSource } from './projectAssetResourceResolver'

function assetPreviewSource(asset: PersonalSpaceAsset) {
  return asset.resourcePaths[0] ?? ''
}

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

function useStoredResourcePreviewSource(
  asset: PersonalSpaceAsset,
  resourceIndex: number,
  fallbackSource: string,
  projectObjectStorage?: ProjectObjectStorage,
) {
  const storedPath = asset.storageResourcePaths[resourceIndex] ?? ''
  const [storedSource, setStoredSource] = useState('')

  useEffect(() => {
    if ((!storedPath && !fallbackSource) || !canCreateObjectUrl()) {
      setStoredSource('')
      return undefined
    }
    let alive = true
    let objectUrl = ''
    void (async () => {
      const resolved = await resolveProjectAssetResourceSource(storedPath, fallbackSource, { projectObjectStorage })
      objectUrl = resolved?.objectUrl ?? ''
      if (alive) setStoredSource(resolved?.source ?? '')
      else if (objectUrl) URL.revokeObjectURL(objectUrl)
    })().catch(() => {
      if (alive) setStoredSource('')
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fallbackSource, projectObjectStorage, storedPath])

  return storedSource || fallbackSource
}

interface SpritePreviewFrame {
  x: number
  y: number
  w: number
  h: number
}

interface SpritePreviewIndex {
  sheet_size?: { w: number; h: number }
  fps?: number
  frames?: SpritePreviewFrame[]
}

function useSpritePreviewIndex(asset: PersonalSpaceAsset, projectObjectStorage?: ProjectObjectStorage) {
  const [index, setIndex] = useState<SpritePreviewIndex | null>(null)
  const indexSource = useStoredResourcePreviewSource(asset, 1, asset.resourcePaths[1] ?? '', projectObjectStorage)

  useEffect(() => {
    if (asset.kind !== 'sprite' || !indexSource) {
      setIndex(null)
      return
    }
    let alive = true
    void fetch(indexSource)
      .then((response) => response.json())
      .then((value: SpritePreviewIndex) => {
        if (alive && Array.isArray(value.frames)) setIndex(value)
      })
      .catch(() => {
        if (alive) setIndex(null)
      })
    return () => {
      alive = false
    }
  }, [asset.kind, indexSource])

  return index
}

export function PersonalAssetPreview({
  asset,
  projectObjectStorage,
}: {
  asset: PersonalSpaceAsset
  projectObjectStorage?: ProjectObjectStorage
}) {
  const [imageOpen, setImageOpen] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [spriteOpen, setSpriteOpen] = useState(false)
  const [spritePlaying, setSpritePlaying] = useState(false)
  const [spriteFrameIndex, setSpriteFrameIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const source = useStoredResourcePreviewSource(asset, 0, assetPreviewSource(asset), projectObjectStorage)
  const spriteIndex = useSpritePreviewIndex(asset, projectObjectStorage)
  const spriteFrames = spriteIndex?.frames ?? []
  const spriteFrame = spriteFrames[spriteFrameIndex % Math.max(1, spriteFrames.length)]

  useEffect(() => {
    if (!spritePlaying || spriteFrames.length <= 1) return undefined
    const delay = Math.max(40, Math.round(1000 / Math.max(1, spriteIndex?.fps ?? 12)))
    const timer = window.setInterval(() => {
      setSpriteFrameIndex((index) => (index + 1) % spriteFrames.length)
    }, delay)
    return () => window.clearInterval(timer)
  }, [spriteFrames.length, spriteIndex?.fps, spritePlaying])

  if (asset.kind === 'voice') {
    const toggleAudio = () => {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) {
        void audio.play()
        setAudioPlaying(true)
      } else {
        audio.pause()
        setAudioPlaying(false)
      }
    }
    return (
      <div className="asset-preview asset-preview-audio">
        <Button
          type="text"
          icon={audioPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={toggleAudio}
          aria-label={audioPlaying ? '暂停声音预览' : '播放声音预览'}
        />
        <audio ref={audioRef} src={source} onEnded={() => setAudioPlaying(false)} />
      </div>
    )
  }

  if (asset.kind === 'sprite') {
    const scale = spriteFrame ? Math.min(56 / spriteFrame.w, 56 / spriteFrame.h) : 1
    const backgroundSize = spriteFrame && spriteIndex?.sheet_size
      ? `${spriteIndex.sheet_size.w * scale}px ${spriteIndex.sheet_size.h * scale}px`
      : undefined
    const backgroundPosition = spriteFrame ? `${-spriteFrame.x * scale}px ${-spriteFrame.y * scale}px` : undefined
    const openSpritePreview = () => {
      setSpriteOpen(true)
      setSpritePlaying(true)
      setSpriteFrameIndex(0)
    }
    const closeSpritePreview = () => {
      setSpriteOpen(false)
      setSpritePlaying(false)
    }
    return (
      <>
        <button
          type="button"
          className="asset-preview asset-preview-image"
          onClick={openSpritePreview}
          aria-label="打开精灵图播放预览"
        >
          {source && spriteFrame ? (
            <span
              className="asset-preview-sprite-frame"
              style={{
                width: `${spriteFrame.w * scale}px`,
                height: `${spriteFrame.h * scale}px`,
                backgroundImage: `url(${source})`,
                backgroundPosition,
                backgroundSize,
              }}
            />
          ) : source ? <img src={source} alt="" /> : <span>精灵</span>}
          <PlayCircleOutlined />
        </button>
        <Modal
          title={asset.name}
          open={spriteOpen}
          onCancel={closeSpritePreview}
          footer={[
            <Button key="toggle" icon={spritePlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => setSpritePlaying((playing) => !playing)}>
              {spritePlaying ? '暂停播放' : '继续播放'}
            </Button>,
          ]}
        >
          <div className="asset-preview-sprite-stage">
            {source && spriteFrame ? (
              <span
                className="asset-preview-sprite-frame-modal"
                style={{
                  ...spriteFrameModalStyle(spriteFrame, spriteIndex?.sheet_size),
                  backgroundImage: `url(${source})`,
                }}
              />
            ) : source ? <img className="asset-preview-large" src={source} alt="" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可预览资源" />}
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        className="asset-preview asset-preview-image preview-image"
        onClick={() => setImageOpen(true)}
        aria-label="查看图片预览"
      >
        {source ? <img src={source} alt="" /> : <span>预览</span>}
      </button>
      <Modal
        title={asset.name}
        open={imageOpen}
        footer={null}
        onCancel={() => setImageOpen(false)}
      >
        {source ? <img className="asset-preview-large" src={source} alt="" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可预览资源" />}
      </Modal>
    </>
  )
}
