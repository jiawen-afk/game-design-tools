import { Divider, Modal, Select, Typography } from 'antd'

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
        onCollectToPersonalSpaceWithCharacter={spriteExport.openCollectCharacterDialog}
      />

      <Modal
        title="收藏并关联角色"
        open={spriteExport.collectCharacterDialogOpen}
        okText="收藏并关联"
        cancelText="取消"
        okButtonProps={{ disabled: !spriteExport.collectCharacterId }}
        onOk={() => void spriteExport.collectToPersonalSpaceWithCharacter()}
        onCancel={spriteExport.closeCollectCharacterDialog}
      >
        <div className="modal-grid">
          <label className="form-field">
            <span className="field-label">选择角色</span>
            <Select
              value={spriteExport.collectCharacterId}
              options={spriteExport.collectCharacterOptions}
              placeholder="选择角色"
              notFoundContent="个人空间还没有角色。请先在个人空间创建角色。"
              onChange={spriteExport.setCollectCharacterId}
            />
          </label>
          <p className="field-note">会先把当前精灵图收藏到个人空间，再关联到这个角色的精灵图栏。</p>
        </div>
      </Modal>

      <Divider />
      <Text type="secondary">
        当前帧数：{frames.length}，公共画布：{canvasWidth} × {canvasHeight}
      </Text>
    </>
  )
}
