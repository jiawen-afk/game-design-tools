# Image Processing Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the image processing workspace into a compact top toolbar, tabbed left parameters, stable right image stage, and compact bottom status row.

**Architecture:** Keep `index.tsx` as layout composition while preserving the existing hook/model/pipeline boundaries. Extract small presentational components for the top toolbar and bottom status row so the page entry does not absorb all markup. Reuse current matte/crop/export panels inside tabs with minimal internal changes.

**Tech Stack:** React 19, Ant Design 6, TypeScript, CSS modules by workspace stylesheet, Node test runner.

---

### Task 1: Add Layout Structure Guard

**Files:**
- Modify: `src/appStructure.test.ts`
- Test: `src/appStructure.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test near the existing image processing layout tests:

```ts
test('image processing workspace uses compact toolbar, tabbed controls, and stable result stage', () => {
  const source = readFileSync('src/components/ImageProcessingWorkspace/index.tsx', 'utf8')
  const toolbarSource = readFileSync('src/components/ImageProcessingWorkspace/ImageProcessingToolbar.tsx', 'utf8')
  const statusSource = readFileSync('src/components/ImageProcessingWorkspace/ImageProcessingStatusBar.tsx', 'utf8')
  const cssSource = readFileSync('src/components/ImageProcessingWorkspace/workspace.css', 'utf8')

  assert.match(source, /<ImageProcessingToolbar workspace=\{workspace\} \/>/)
  assert.match(source, /<Tabs[\s\S]*items=\{controlTabs\}/)
  assert.match(source, /key: 'matte'[\s\S]*<ImageMattePanel workspace=\{workspace\} \/>/)
  assert.match(source, /key: 'crop'[\s\S]*<ImageCropPanel workspace=\{workspace\} \/>/)
  assert.match(source, /key: 'export'[\s\S]*<ImageExportPanel workspace=\{workspace\} \/>/)
  assert.match(source, /<ImageProcessingStatusBar workspace=\{workspace\} \/>/)
  assert.doesNotMatch(source, /<ImageUploadPanel workspace=\{workspace\} \/>[\s\S]*<ImageMattePanel workspace=\{workspace\} \/>[\s\S]*<ImageCropPanel workspace=\{workspace\} \/>[\s\S]*<ImageExportPanel workspace=\{workspace\} \/>/)
  assert.match(toolbarSource, /className="image-processing-toolbar"/)
  assert.match(toolbarSource, /ImageUploadPanel/)
  assert.match(toolbarSource, /variant="compact"/)
  assert.match(statusSource, /className="image-processing-status"/)
  assert.match(statusSource, /源图/)
  assert.match(statusSource, /裁剪/)
  assert.match(statusSource, /导出/)
  assert.match(cssSource, /height:\s*calc\(100vh - 260px\)/)
  assert.match(cssSource, /min-height:\s*520px/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `ImageProcessingToolbar.tsx`, `ImageProcessingStatusBar.tsx`, and the new tabbed structure do not exist.

- [ ] **Step 3: Commit is skipped for red state**

Do not commit the failing test by itself.

### Task 2: Implement Compact Toolbar And Status Components

**Files:**
- Create: `src/components/ImageProcessingWorkspace/ImageProcessingToolbar.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageProcessingStatusBar.tsx`
- Modify: `src/components/ImageProcessingWorkspace/ImageUploadPanel.tsx`
- Modify: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`

- [ ] **Step 1: Add reset workspace method to the hook**

In `useImageProcessingWorkspace.ts`, add a `resetWorkspace` callback that revokes object URLs and returns image state to its initial shape:

```ts
  const resetWorkspace = useCallback(() => {
    setDraft((previous) => {
      if (previous) URL.revokeObjectURL(previous.sourceUrl)
      return null
    })
    setProcessed((previous) => {
      if (previous) URL.revokeObjectURL(previous.url)
      return null
    })
    setCropPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous.url)
      return null
    })
    setCrop(null)
    setCropDraftRect(null)
    setCropDrag(null)
    setExportScaleState(1)
    setPreviewTransform({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [])
```

Return `resetWorkspace` in the view model.

- [ ] **Step 2: Add compact upload variant**

Change `ImageUploadPanelProps` to include `variant?: 'card' | 'compact'`, default to `card`, and render compact markup without `Card` for the toolbar:

```tsx
export interface ImageUploadPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
  variant?: 'card' | 'compact'
}
```

The compact variant should render a small `Upload` button plus filename summary, while the card variant can keep the existing dragger for any future use.

- [ ] **Step 3: Create toolbar component**

Create `ImageProcessingToolbar.tsx`:

```tsx
import { Button, Space, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { ImageUploadPanel } from './ImageUploadPanel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text, Title } = Typography

export interface ImageProcessingToolbarProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageProcessingToolbar({ workspace }: ImageProcessingToolbarProps) {
  const imageLabel = workspace.draft
    ? `${workspace.draft.width} x ${workspace.draft.height}`
    : '等待上传'

  return (
    <div className="image-processing-toolbar">
      <div className="image-processing-heading">
        <Title level={4}>图片处理工作台</Title>
        <Text type="secondary">上传图片后在右侧取色、缩放、裁剪，并从左侧参数页导出。</Text>
      </div>
      <div className="image-processing-toolbar-actions">
        <Tag color={workspace.processing ? 'processing' : workspace.draft ? 'success' : 'default'}>
          {workspace.processing ? '处理中' : imageLabel}
        </Tag>
        <ImageUploadPanel workspace={workspace} variant="compact" />
        <Button
          icon={<ReloadOutlined />}
          disabled={!workspace.draft}
          onClick={workspace.resetWorkspace}
        >
          重置
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create status bar component**

Create `ImageProcessingStatusBar.tsx`:

```tsx
import { Typography } from 'antd'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageProcessingStatusBarProps {
  workspace: ImageProcessingWorkspaceViewModel
}

function sizeText(width?: number, height?: number) {
  if (!width || !height) return '-'
  return `${Math.round(width)} x ${Math.round(height)}`
}

export function ImageProcessingStatusBar({ workspace }: ImageProcessingStatusBarProps) {
  return (
    <div className="image-processing-status">
      <Text type="secondary">源图：{sizeText(workspace.draft?.width, workspace.draft?.height)}</Text>
      <Text type="secondary">处理后：{sizeText(workspace.processed?.width, workspace.processed?.height)}</Text>
      <Text type="secondary">裁剪：{sizeText(workspace.crop?.width, workspace.crop?.height)}</Text>
      <Text type="secondary">导出：{sizeText(workspace.exportSize.width, workspace.exportSize.height)}</Text>
      <Text type="secondary">{workspace.exporting ? '正在导出' : workspace.processing ? '正在处理' : '就绪'}</Text>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: still FAIL because `index.tsx` and CSS have not been updated yet.

### Task 3: Recompose Workspace With Tabs

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/index.tsx`
- Modify: `src/components/ImageProcessingWorkspace/workspace.css`

- [ ] **Step 1: Update `index.tsx` layout**

Replace the current vertical `Space` layout with:

```tsx
import { Tabs } from 'antd'

import { ImageCropPanel } from './ImageCropPanel'
import { ImageCropResultStage } from './ImageCropResultStage'
import { ImageExportPanel } from './ImageExportPanel'
import { ImageMattePanel } from './ImageMattePanel'
import { ImageProcessingStatusBar } from './ImageProcessingStatusBar'
import { ImageProcessingToolbar } from './ImageProcessingToolbar'
import { useImageProcessingWorkspace } from './useImageProcessingWorkspace'
import './workspace.css'

export default function ImageProcessingWorkspace() {
  const workspace = useImageProcessingWorkspace()
  const controlTabs = [
    { key: 'matte', label: '抠图', children: <ImageMattePanel workspace={workspace} /> },
    { key: 'crop', label: '裁剪', children: <ImageCropPanel workspace={workspace} /> },
    { key: 'export', label: '导出', children: <ImageExportPanel workspace={workspace} /> },
  ]

  return (
    <div className="image-processing-workspace">
      <ImageProcessingToolbar workspace={workspace} />
      <div className="image-processing-grid">
        <div className="image-processing-side">
          <Tabs className="image-processing-tabs" defaultActiveKey="matte" items={controlTabs} />
        </div>
        <div className="image-processing-main">
          <ImageCropResultStage workspace={workspace} />
        </div>
      </div>
      <ImageProcessingStatusBar workspace={workspace} />
    </div>
  )
}
```

- [ ] **Step 2: Update CSS**

Update `workspace.css` to support:

```css
.image-processing-workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: calc(100vh - 156px);
}

.image-processing-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-panel);
}

.image-processing-heading {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.image-processing-heading .ant-typography {
  margin: 0;
}

.image-processing-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.image-processing-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  min-height: 0;
}

.image-processing-tabs {
  height: 100%;
}

.image-processing-tabs .ant-tabs-content-holder,
.image-processing-tabs .ant-tabs-content,
.image-processing-tabs .ant-tabs-tabpane {
  min-height: 0;
}

.image-processing-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-panel);
}

.image-preview-stage-box {
  height: calc(100vh - 260px);
  min-height: 520px;
}
```

Keep existing detailed crop, upload, and preview styles unless replaced by the new layout.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: PASS for structure and model tests.

### Task 4: Final Verification And Build

**Files:**
- Verify all modified files

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Run diff check**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Inspect git status**

Run: `git status --short --branch`

Expected: modified source/test files plus the committed spec and new plan.

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add src/appStructure.test.ts src/components/ImageProcessingWorkspace docs/superpowers/plans/2026-06-15-image-processing-layout-redesign.md
git commit -m "feat: reorganize image processing workspace layout"
```

Expected: commit succeeds.
