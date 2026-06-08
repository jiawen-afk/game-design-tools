import { Divider, Typography } from 'antd'

import { ExportPanel } from './ExportPanel'
import { PlaybackPanel } from './PlaybackPanel'
import type { PlaybackWorkspaceViewModel } from './usePlaybackWorkspace'
import type { SpriteExportViewModel } from './useSpriteExport'
import type { FrameItem } from './types'

const { Text } = Typography

export interface OutputWorkspacePanelProps {
  frames: FrameItem[]
  playback: PlaybackWorkspaceViewModel
  spriteExport: SpriteExportViewModel
  canvasWidth: number
  canvasHeight: number
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
}

export function OutputWorkspacePanel({
  frames,
  playback,
  spriteExport,
  canvasWidth,
  canvasHeight,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
}: OutputWorkspacePanelProps) {
  return (
    <>
      <PlaybackPanel
        frames={frames}
        selectedCount={playback.selectedFrameIdSet.size}
        fps={playback.fps}
        playbackMode={playback.playbackMode}
        playing={playback.playing}
        previewFrame={playback.previewFrame}
        playbackFrameCount={playback.playbackFrames.length}
        playIndex={playback.playIndex}
        visibleFrameCount={playback.visibleFrames.length}
        selectedFrameIds={playback.selectedFrameIdSet}
        playbackFrameIds={playback.playbackFrameIdSet}
        onStartAll={playback.startAllPlayback}
        onStartSelected={playback.startSelectedPlayback}
        onPause={() => playback.setPlaying(false)}
        onFpsChange={playback.setFps}
        onPlaybackModeChange={playback.setPlaybackMode}
        onBatchHideSelected={playback.batchHideSelected}
        onDragStart={playback.handlePlaybackRowDragStart}
        onDrop={playback.handlePlaybackRowDrop}
        onSelect={playback.selectFrameTag}
        onToggleHidden={playback.handlePlaybackRowToggleHidden}
      />

      <ExportPanel
        columns={spriteExport.columns}
        visibleFrameCount={playback.visibleFrames.length}
        exporting={spriteExport.exporting}
        personalSpaceCollectEnabled={personalSpaceCollectEnabled}
        personalSpaceCollectDisabledReason={personalSpaceCollectDisabledReason}
        onColumnsChange={spriteExport.setColumns}
        onExport={() => void spriteExport.exportAll()}
        onCollectToPersonalSpace={() => void spriteExport.collectToPersonalSpace()}
      />

      <Divider />
      <Text type="secondary">
        当前帧数：{frames.length}，公共画布：{canvasWidth} × {canvasHeight}
      </Text>
    </>
  )
}
