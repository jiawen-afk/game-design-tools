import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spriteWorkspaceStyleSources } from './appStructureTestHelpers.test'

test('sprite workspace upload entries support drag upload', () => {
  const spriteSheetPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/SpriteSheetUploadPanel.tsx', 'utf8')
  const videoPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoUploadPanel.tsx', 'utf8')
  const uploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const css = spriteWorkspaceStyleSources()

  assert.match(uploadPanel, /<Upload\.Dragger/)
  assert.match(uploadPanel, /拖拽或点击上传单个素材/)
  assert.match(spriteSheetPanel, /<Upload\.Dragger/)
  assert.match(spriteSheetPanel, /拖拽精灵图到这里/)
  assert.match(videoPanel, /<Upload\.Dragger/)
  assert.match(videoPanel, /拖拽视频到这里/)
  assert.doesNotMatch(uploadPanel, /拖拽多张图片到这里/)
  assert.match(mattePanel, /<Upload\.Dragger/)
  assert.match(mattePanel, /拖拽多张图片到这里/)
  assert.match(css, /\.sprite-upload-dragger/)
})

test('sprite workspace upload defaults to one asset and switches processing mode by file type', () => {
  const uploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const css = spriteWorkspaceStyleSources()

  assert.match(uploadPanel, /singleUploadAccept/)
  assert.match(uploadPanel, /className="sprite-single-upload-drop"/)
  assert.match(uploadPanel, /maxCount=\{1\}/)
  assert.match(uploadPanel, /handleSingleUpload/)
  assert.match(uploadPanel, /videoAccept\.includes\(file\.type\)|isVideoFile/)
  assert.match(uploadPanel, /imageAccept\.includes\(file\.type\)|isImageFile/)
  assert.match(uploadPanel, /video\.videoDraft\s*\?/)
  assert.match(uploadPanel, /upload\.spriteSheetDraft\s*\?/)
  assert.match(uploadPanel, /更换素材/)
  assert.doesNotMatch(uploadPanel, /<Tabs/)
  assert.doesNotMatch(uploadPanel, /<Divider/)

  assert.match(css, /\.sprite-single-upload-drop/)
  assert.match(css, /\.sprite-active-upload-panel/)
})

test('sprite batch image upload is launched from matte workspace title actions', () => {
  const workspaceSource = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const uploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')

  assert.doesNotMatch(uploadPanel, /batch-image-upload-area/)
  assert.doesNotMatch(uploadPanel, /批量添加图片/)
  assert.match(workspaceSource, /imageAccept=\{IMAGE_ACCEPT\}/)
  assert.match(workspaceSource, /uploadFileList=\{workspace\.upload\.uploadFileList\}/)
  assert.match(workspaceSource, /onBatchUploadChange=\{workspace\.upload\.handleUploadChange\}/)
  assert.match(mattePanel, /批量添加图片/)
  assert.match(mattePanel, /batchUploadOpen/)
  assert.match(mattePanel, /<Modal/)
  assert.match(mattePanel, /className="batch-image-upload-area"/)
})
