import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space workspace delegates storyboard management panel', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const storyboardPanelWorkspaceHookPath = 'src/components/PersonalSpaceWorkspace/usePersonalStoryboardPanelWorkspace.ts'
  const storyboardPanelWorkspaceHookSource = existsSync(storyboardPanelWorkspaceHookPath)
    ? readFileSync(storyboardPanelWorkspaceHookPath, 'utf8')
    : ''
	const panelSource = [
	  readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8'),
	  storyboardPanelWorkspaceHookSource,
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardGroupCard.tsx', 'utf8'),
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardGroupHeader.tsx', 'utf8'),
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardCharacterPane.tsx', 'utf8'),
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardVoicePicker.tsx', 'utf8'),
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardVoicePane.tsx', 'utf8'),
	  readFileSync('src/components/PersonalSpaceWorkspace/StoryboardVoiceRow.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/StoryboardCharacterAvatar.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/storyboardPlaybackSources.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/storyboardVoiceDrag.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/CreateNamePopoverButton.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/useRecentStarredFilter.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/useRenameDrafts.ts', 'utf8'),
  ].join('\n')
  const storyboardPanelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8')
  const createNamePopoverSource = readFileSync('src/components/PersonalSpaceWorkspace/CreateNamePopoverButton.tsx', 'utf8')
  const createNamePopoverHookSource = readFileSync('src/components/PersonalSpaceWorkspace/useCreateNamePopover.ts', 'utf8')
  const storyboardGroupCardSource = readFileSync('src/components/PersonalSpaceWorkspace/StoryboardGroupCard.tsx', 'utf8')
  const storyboardGroupHeaderSource = readFileSync('src/components/PersonalSpaceWorkspace/StoryboardGroupHeader.tsx', 'utf8')
  const storyboardCharacterPaneSource = readFileSync('src/components/PersonalSpaceWorkspace/StoryboardCharacterPane.tsx', 'utf8')
  const storyboardVoicePaneSource = readFileSync('src/components/PersonalSpaceWorkspace/StoryboardVoicePane.tsx', 'utf8')
  const playbackHookSource = readFileSync('src/components/PersonalSpaceWorkspace/useStoryboardVoicePlayback.ts', 'utf8')
  const storyboardVoiceDragSource = readFileSync('src/components/PersonalSpaceWorkspace/storyboardVoiceDrag.ts', 'utf8')
  const dragDropHookPath = 'src/components/PersonalSpaceWorkspace/useStoryboardVoiceDragDrop.ts'
  const dragDropHookSource = existsSync(dragDropHookPath) ? readFileSync(dragDropHookPath, 'utf8') : ''
  const recentStarredFilterSource = readFileSync('src/components/PersonalSpaceWorkspace/useRecentStarredFilter.ts', 'utf8')
  const renameDraftsSource = readFileSync('src/components/PersonalSpaceWorkspace/useRenameDrafts.ts', 'utf8')
  const personalSpaceCssSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpace.storyboard.css', 'utf8')

  assert.match(source, /from '\.\/PersonalStoryboardPanel'/)
  assert.match(source, /<PersonalStoryboardPanel/)
  assert.match(panelSource, /from '\.\/StoryboardVoicePicker'/)
  assert.match(panelSource, /from '\.\/StoryboardVoiceRow'/)
  assert.match(storyboardPanelSource, /from '\.\/StoryboardGroupCard'/)
  assert.match(storyboardPanelSource, /<StoryboardGroupCard/)
  assert.match(storyboardGroupCardSource, /export function StoryboardGroupCard/)
  assert.match(playbackHookSource, /from '\.\/storyboardPlaybackSources'/)
  assert.match(panelSource, /from '\.\/storyboardVoiceDrag'/)
  assert.doesNotMatch(source, /剧情分组/)
  assert.doesNotMatch(source, /复制参考资产/)
  assert.doesNotMatch(source, /导出参考资产/)
  assert.doesNotMatch(source, /对白文本/)
  assert.match(panelSource, /function PersonalStoryboardPanel/)
  assert.match(panelSource, /from '\.\/PersonalSpaceFilterControl'/)
  assert.match(panelSource, /from '\.\/PersonalSpaceTextPopover'/)
  assert.match(panelSource, /<PersonalSpaceFilterControl/)
  assert.match(panelSource, /<PersonalSpaceTextPopover/)
  assert.match(createNamePopoverSource, /export function CreateNamePopoverButton/)
  assert.match(createNamePopoverHookSource, /export function useCreateNamePopover/)
  assert.match(storyboardPanelSource, /from '\.\/CreateNamePopoverButton'/)
  assert.match(storyboardPanelWorkspaceHookSource, /from '\.\/useCreateNamePopover'/)
  assert.match(storyboardPanelSource, /<CreateNamePopoverButton/)
  assert.doesNotMatch(storyboardPanelSource, /<PersonalSpaceTextPopover/)
  assert.doesNotMatch(panelSource, /<strong>剧情分组<\/strong>/)
  assert.doesNotMatch(panelSource, /<span className="section-caption">剧情分组<\/span>/)
  assert.doesNotMatch(panelSource, /复制参考资产/)
  assert.doesNotMatch(panelSource, /导出参考资产/)
  assert.match(storyboardGroupHeaderSource, /导出分组配音资产/)
  assert.match(storyboardGroupHeaderSource, /导出分组关联角色资产/)
  assert.match(panelSource, /导出所有分组配音资产/)
  assert.match(panelSource, /导出所有分组关联角色资产/)
  assert.match(panelSource, /storyboardExportingKey/)
  assert.match(storyboardPanelWorkspaceHookSource, /useCreateNamePopover/)
  assert.doesNotMatch(storyboardPanelSource, /creatingStoryboard/)
  assert.match(storyboardPanelWorkspaceHookSource, /useRecentStarredFilter/)
  assert.match(storyboardPanelSource, /selectedStoryboardFilter/)
  assert.match(storyboardPanelSource, /visibleStoryboardGroups/)
  assert.match(recentStarredFilterSource, /recentFilterOptions/)
  assert.match(recentStarredFilterSource, /slice\(-20\)\.reverse\(\)/)
  assert.match(panelSource, /storyboard-filter-control/)
  assert.match(panelSource, /最近创建的\d+个剧情组/)
  assert.match(panelSource, /visibleStoryboardGroups/)
  assert.doesNotMatch(storyboardPanelSource, /slice\(-20\)\.reverse\(\)/)
  assert.doesNotMatch(storyboardPanelSource, /setSelectedStoryboardFilter\('全部剧情组'\)/)
  assert.doesNotMatch(storyboardPanelSource, /filterOption\s*=/)
  assert.match(renameDraftsSource, /export function useRenameDrafts/)
  assert.match(renameDraftsSource, /setRenamingId/)
  assert.match(renameDraftsSource, /draft\.trim\(\)/)
  assert.match(storyboardPanelWorkspaceHookSource, /useRenameDrafts/)
  assert.doesNotMatch(storyboardPanelSource, /setRenamingStoryboardId/)
  assert.doesNotMatch(storyboardPanelSource, /setStoryboardNameDrafts/)
  assert.match(storyboardGroupHeaderSource, /EditOutlined/)
  assert.match(storyboardGroupHeaderSource, /分组名称/)
  assert.doesNotMatch(panelSource, /className="storyboard-name-input"[\s\S]*onChange=\{\(event\) => onRenameStoryboard/)
  assert.match(panelSource, /storyboard-create-popover/)
  assert.doesNotMatch(panelSource, /content=\{\(\s*<div className="voice-group-rename-popover storyboard-create-popover/)
  assert.doesNotMatch(panelSource, /content=\{\(\s*<div className="voice-group-rename-popover storyboard-name-rename-popover/)
  assert.doesNotMatch(panelSource, /导入角色/)
  assert.match(panelSource, /关联配音/)
  assert.match(storyboardGroupHeaderSource, /导入配音/)
  assert.match(storyboardGroupCardSource, /getStoryboardVoiceUploadProps/)
  assert.match(source, /storyboardVoiceUploadProps/)
  assert.doesNotMatch(panelSource, /搜索角色/)
  assert.match(panelSource, /搜索配音/)
  assert.match(panelSource, /voice-picker-popover/)
  assert.match(panelSource, /selectedVoiceAssetIds/)
  assert.match(panelSource, /lastSelectedVoiceAssetId/)
  assert.match(panelSource, /event\.altKey/)
  assert.match(panelSource, /event\.shiftKey/)
  assert.match(panelSource, /selectedVoiceAssetIds\.forEach\(\(assetId\) => onAssignVoiceToStoryboard\(groupId, assetId\)\)/)
  assert.doesNotMatch(panelSource, /selectedVoiceAssetId,\s*setSelectedVoiceAssetId/)
  assert.match(panelSource, /<Modal/)
  assert.doesNotMatch(panelSource, /<span className="field-label">导入配音<\/span>/)
  assert.doesNotMatch(panelSource, /placeholder="选择配音素材"/)
  assert.match(storyboardCharacterPaneSource, /storyboard-character-list/)
  assert.match(storyboardVoicePaneSource, /storyboard-voice-row/)
  assert.match(panelSource, /storyboard-timeline/)
  assert.match(panelSource, /从这里开始播放/)
  assert.match(panelSource, /停止播放/)
  assert.match(panelSource, /useStoryboardVoicePlayback/)
  assert.equal(existsSync(dragDropHookPath), true)
  assert.match(storyboardPanelWorkspaceHookSource, /from '\.\/useStoryboardVoiceDragDrop'/)
  assert.match(storyboardPanelWorkspaceHookSource, /useStoryboardVoiceDragDrop/)
  assert.match(dragDropHookSource, /export function useStoryboardVoiceDragDrop/)
  assert.match(dragDropHookSource, /useState<DraggedStoryboardVoice>/)
  assert.match(dragDropHookSource, /previewStoryboardVoiceOrders/)
  assert.match(dragDropHookSource, /getStoryboardVoiceListDropTarget/)
  assert.match(dragDropHookSource, /moveAssetIdAroundTarget/)
  assert.match(storyboardVoiceDragSource, /storyboardVoiceEntriesForPreview/)
  assert.match(storyboardPanelWorkspaceHookSource, /storyboardVoiceEntriesForPreview\(\w+, previewStoryboardVoiceOrders\[\w+\.id\]\)/)
  assert.doesNotMatch(storyboardPanelSource, /useState<DraggedStoryboardVoice>/)
  assert.doesNotMatch(storyboardPanelSource, /getStoryboardVoiceListDropTarget/)
  assert.doesNotMatch(storyboardPanelSource, /moveAssetIdAroundTarget/)
  assert.doesNotMatch(storyboardPanelSource, /const orderedVoiceEntries =/)
  assert.doesNotMatch(storyboardPanelSource, /\.sort\(\(a, b\) => a\.order - b\.order\)/)
  assert.doesNotMatch(storyboardPanelSource, /resolveStoryboardVoicePlaybackSource/)
  assert.doesNotMatch(storyboardPanelSource, /resolveProjectAssetResourceSource/)
  assert.doesNotMatch(storyboardPanelSource, /storageResourcePaths\[0\]/)
  assert.doesNotMatch(storyboardPanelSource, /<StoryboardVoiceRow/)
  assert.doesNotMatch(storyboardPanelSource, /storyboard-header-actions/)
  assert.doesNotMatch(storyboardPanelSource, /storyboard-arranger/)
  assert.match(storyboardVoicePaneSource, /<StoryboardVoiceRow/)
  assert.match(panelSource, /projectObjectStorage/)
  assert.match(playbackHookSource, /playStoryboardFrom/)
  assert.match(playbackHookSource, /resolveStoryboardVoicePlaybackSource/)
  assert.match(playbackHookSource, /scheduleStoryboardVoiceStarts/)
  assert.match(playbackHookSource, /playbackObjectUrlsRef/)
  assert.match(playbackHookSource, /playbackTimersRef/)
  assert.match(playbackHookSource, /activePlaybackAudiosRef/)
  assert.match(playbackHookSource, /loadStoryboardVoiceDurationUs/)
  assert.doesNotMatch(storyboardPanelSource, /new Audio\(/)
  assert.doesNotMatch(storyboardPanelSource, /playbackTimersRef/)
  assert.doesNotMatch(storyboardPanelSource, /playbackObjectUrlsRef/)
  assert.doesNotMatch(storyboardPanelSource, /activePlaybackAudiosRef/)
  assert.doesNotMatch(panelSource, /onEnded=\{playNextStoryboardVoice\}/)
  assert.match(panelSource, /PersonalAssetPreview/)
  assert.doesNotMatch(panelSource, /关联备注/)
  assert.doesNotMatch(panelSource, /未关联角色/)
  assert.doesNotMatch(panelSource, /UpOutlined/)
  assert.doesNotMatch(panelSource, /DownOutlined/)
  assert.match(panelSource, /onAssignStoryboardVoiceCharacter/)
  assert.match(panelSource, /draggedStoryboardVoice/)
  assert.match(panelSource, /previewStoryboardVoiceOrders/)
  assert.match(panelSource, /dropPlacement/)
  assert.match(panelSource, /storyboard-voice-row is-dragging/)
  assert.match(panelSource, /storyboard-voice-row is-drop-target/)
  assert.match(panelSource, /data-storyboard-voice-id/)
  assert.match(dragDropHookSource, /getStoryboardVoiceListDropTarget/)
  assert.match(panelSource, /previewStoryboardVoiceListDrop/)
  assert.match(panelSource, /dropStoryboardVoiceOnList/)
  assert.match(storyboardVoiceDragSource, /querySelectorAll<HTMLElement>\('\[data-storyboard-voice-id\]'\)/)
  assert.match(storyboardVoiceDragSource, /row\.assetId !== draggedAssetId/)
  assert.match(panelSource, /storyboard-voice-pane"[\s\S]*onDragOver=\{\(event\) =>/)
  assert.match(panelSource, /storyboard-voice-pane"[\s\S]*onDrop=\{\(event\) => dropStoryboardVoiceOnList\(event, item\.id\)\}/)
  assert.match(panelSource, /storyboard-voice-pane"[\s\S]*onDragLeave=\{\(event\) => cancelStoryboardVoiceListDrop\(event, item\.id\)\}/)
  assert.match(dragDropHookSource, /cancelStoryboardVoiceListDrop/)
  assert.match(dragDropHookSource, /event\.currentTarget\.contains\(event\.relatedTarget as Node \| null\)/)
  assert.match(dragDropHookSource, /delete next\[groupId\]/)
  assert.match(personalSpaceCssSource, /\.storyboard-voice-pane\s*\{[^}]*padding:/)
  assert.match(personalSpaceCssSource, /\.storyboard-voice-pane\s*\{[^}]*min-height:/)
  assert.doesNotMatch(panelSource, /storyboard-voice-edge-drop/)
  assert.doesNotMatch(panelSource, /拖到最前/)
  assert.doesNotMatch(panelSource, /拖到最后/)
  assert.match(panelSource, /draggable/)
  assert.match(panelSource, /onDrop/)
  assert.match(panelSource, /对白文本/)
  assert.doesNotMatch(panelSource, /onReorderStoryboardVoice/)
  assert.match(panelSource, /onMoveStoryboardVoice/)
  assert.match(panelSource, /onUnassignStoryboardVoice/)
  assert.match(panelSource, /取消关联配音/)
  assert.match(panelSource, /DisconnectOutlined/)
  assert.match(panelSource, /storyboard-panel-toolbar/)
})

test('storyboard panel delegates state orchestration to a focused hook', () => {
  const panelPath = 'src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx'
  const hookPath = 'src/components/PersonalSpaceWorkspace/usePersonalStoryboardPanelWorkspace.ts'

  assert.ok(existsSync(hookPath), 'expected storyboard panel workspace hook to exist')

  const panelSource = readFileSync(panelPath, 'utf8')
  const hookSource = readFileSync(hookPath, 'utf8')

  assert.match(panelSource, /from '\.\/usePersonalStoryboardPanelWorkspace'/)
  assert.match(panelSource, /usePersonalStoryboardPanelWorkspace/)
  assert.match(hookSource, /export function usePersonalStoryboardPanelWorkspace/)

  for (const delegatedWorkflow of [
    'useCreateNamePopover',
    'useRecentStarredFilter',
    'useRenameDrafts',
    'useStoryboardVoiceDragDrop',
    'useStoryboardVoicePlayback',
    'storyboardVoiceEntriesForPreview',
  ]) {
    assert.doesNotMatch(panelSource, new RegExp(`from '\\./${delegatedWorkflow}'`))
    assert.doesNotMatch(panelSource, new RegExp(`${delegatedWorkflow}\\(`))
    assert.match(hookSource, new RegExp(delegatedWorkflow))
  }

  assert.doesNotMatch(panelSource, /useMemo\(/)
  assert.match(hookSource, /useMemo\(/)
})

test('storyboard group card delegates voice list arrangement to a focused pane', () => {
  const groupCardPath = 'src/components/PersonalSpaceWorkspace/StoryboardGroupCard.tsx'
  const voicePanePath = 'src/components/PersonalSpaceWorkspace/StoryboardVoicePane.tsx'

  assert.ok(existsSync(voicePanePath), 'expected storyboard voice pane to exist')

  const groupCard = readFileSync(groupCardPath, 'utf8')
  const voicePane = readFileSync(voicePanePath, 'utf8')

  assert.match(groupCard, /from '\.\/StoryboardVoicePane'/)
  assert.match(groupCard, /<StoryboardVoicePane/)
  for (const delegatedToken of [
    '<StoryboardVoiceRow',
    'data-storyboard-voice-row-list',
    'Empty.PRESENTED_IMAGE_SIMPLE',
  ]) {
    assert.doesNotMatch(groupCard, new RegExp(delegatedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(voicePane, new RegExp(delegatedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(voicePane, /storyboard-voice-pane"[\s\S]*onDragOver=\{\(event\) =>/)
  assert.match(voicePane, /dropStoryboardVoiceOnList\(event, item\.id\)/)
})

test('storyboard group card delegates header and character pane rendering', () => {
  const groupCardPath = 'src/components/PersonalSpaceWorkspace/StoryboardGroupCard.tsx'
  const headerPath = 'src/components/PersonalSpaceWorkspace/StoryboardGroupHeader.tsx'
  const characterPanePath = 'src/components/PersonalSpaceWorkspace/StoryboardCharacterPane.tsx'

  assert.ok(existsSync(headerPath), 'expected storyboard group header component to exist')
  assert.ok(existsSync(characterPanePath), 'expected storyboard character pane component to exist')

  const groupCard = readFileSync(groupCardPath, 'utf8')
  const header = readFileSync(headerPath, 'utf8')
  const characterPane = readFileSync(characterPanePath, 'utf8')

  assert.match(groupCard, /from '\.\/StoryboardGroupHeader'/)
  assert.match(groupCard, /from '\.\/StoryboardCharacterPane'/)
  assert.match(groupCard, /<StoryboardGroupHeader/)
  assert.match(groupCard, /<StoryboardCharacterPane/)
  for (const delegatedHeaderToken of [
    'StoryboardVoicePicker',
    'PersonalSpaceTextPopover',
    'storyboard-header-actions',
    '导出分组配音资产',
    '导出分组关联角色资产',
  ]) {
    const token = new RegExp(delegatedHeaderToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    assert.doesNotMatch(groupCard, token)
    assert.match(header, token)
  }
  for (const delegatedCharacterToken of [
    'StoryboardCharacterAvatar',
    'storyboard-character-list',
    '导入的配音关联角色后会显示在这里',
  ]) {
    const token = new RegExp(delegatedCharacterToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    assert.doesNotMatch(groupCard, token)
    assert.match(characterPane, token)
  }
})
