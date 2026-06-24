import { useEffect, useRef, useState } from 'react'
import { Button, Empty, Modal } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import { spriteFrameModalStyle } from './personalSpacePreviewModel'
import { useStoredResourcePreviewSource } from './useStoredResourcePreviewSource'

function assetPreviewSource(asset: PersonalSpaceAsset) {
  return asset.resourcePaths[0] ?? ''
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

function useSpritePreviewIndex(
  asset: PersonalSpaceAsset,
  options: {
    projectObjectStorage?: ProjectObjectStorage
    projectAssetManager?: ProjectAssetManager
    projectId?: string
    projectMode?: ProjectMode
    enabled?: boolean
  },
) {
  const [index, setIndex] = useState<SpritePreviewIndex | null>(null)
  const indexSource = useStoredResourcePreviewSource(asset, 1, asset.resourcePaths[1] ?? '', options)

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
  projectAssetManager,
  projectId,
  projectMode,
}: {
  asset: PersonalSpaceAsset
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}) {
  const [imageOpen, setImageOpen] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [spriteOpen, setSpriteOpen] = useState(false)
  const [spritePlaying, setSpritePlaying] = useState(false)
  const [spriteFrameIndex, setSpriteFrameIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const shouldLoadFullSource = asset.kind === 'voice'
    ? audioPlaying
    : asset.kind === 'sprite'
      ? spriteOpen
      : imageOpen
  const source = useStoredResourcePreviewSource(asset, 0, assetPreviewSource(asset), {
    projectObjectStorage,
    projectAssetManager,
    projectId,
    projectMode,
    enabled: shouldLoadFullSource,
  })
  const spriteIndex = useSpritePreviewIndex(asset, {
    projectObjectStorage,
    projectAssetManager,
    projectId,
    projectMode,
    enabled: spriteOpen,
  })
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
      if (audioPlaying) {
        audioRef.current?.pause()
        setAudioPlaying(false)
        return
      }
      setAudioPlaying(true)
    }
    return (
      <div className="asset-preview asset-preview-audio">
        <Button
          type="text"
          icon={audioPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={toggleAudio}
          aria-label={audioPlaying ? '暂停声音预览' : '播放声音预览'}
        />
        <audio
          ref={audioRef}
          src={source}
          onCanPlay={() => {
            if (audioPlaying) void audioRef.current?.play()
          }}
          onEnded={() => setAudioPlaying(false)}
        />
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
