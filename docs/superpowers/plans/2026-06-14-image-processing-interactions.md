# 图片处理交互增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为图片处理工作台增加滚轮缩放和点击取色。

**Architecture:** 交互换算放进 `imageProcessingModel.ts` 的纯函数，保证坐标和缩放逻辑可测试。`useImageProcessingWorkspace.ts` 继续负责工作流状态，两个面板分别只接入滚轮和点击事件。

**Tech Stack:** React, TypeScript, Ant Design, node:test

---

### Task 1: Add interaction model helpers

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingModel.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('image processing workspace zooms with the mouse wheel and stays clamped', () => {
  expect(applyWheelZoom(1, 120)).toBe(0.9)
  expect(applyWheelZoom(1, -120)).toBe(1.1)
  expect(applyWheelZoom(0.5, 120)).toBe(0.5)
  expect(applyWheelZoom(3, -120)).toBe(3)
})

test('image processing workspace maps preview clicks back to source pixels', () => {
  expect(mapPreviewPointToImagePixel(
    { x: 60, y: 40 },
    { x: 10, y: 20, width: 200, height: 100 },
    { width: 400, height: 200 }
  )).toEqual({ x: 100, y: 40 })
})

test('image processing workspace samples rgba from canvas pixels', () => {
  const pixel = sampleImagePixel({ data: new Uint8ClampedArray([12, 34, 56, 255]), width: 1, height: 1 }, { x: 0, y: 0 })
  expect(pixel).toEqual([12, 34, 56])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
Expected: FAIL because `applyWheelZoom`, `mapPreviewPointToImagePixel`, and `sampleImagePixel` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function applyWheelZoom(currentZoom: number, deltaY: number): number {
  const next = currentZoom + (deltaY > 0 ? -0.1 : 0.1)
  return Math.min(3, Math.max(0.5, Number(next.toFixed(2))))
}

export function mapPreviewPointToImagePixel(
  point: { x: number; y: number },
  previewRect: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number }
): { x: number; y: number } {
  const relativeX = (point.x - previewRect.x) / previewRect.width
  const relativeY = (point.y - previewRect.y) / previewRect.height
  const x = Math.min(imageSize.width - 1, Math.max(0, Math.round(relativeX * imageSize.width)))
  const y = Math.min(imageSize.height - 1, Math.max(0, Math.round(relativeY * imageSize.height)))
  return { x, y }
}

export function sampleImagePixel(
  imageData: { data: Uint8ClampedArray },
  point: { x: number; y: number }
): [number, number, number] {
  const index = (point.y * 1 + point.x) * 4
  return [imageData.data[index] ?? 0, imageData.data[index + 1] ?? 0, imageData.data[index + 2] ?? 0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
Expected: PASS.

### Task 2: Wire wheel zoom into crop preview

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- Modify: `src/components/ImageProcessingWorkspace/ImageCropPanel.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('image processing workspace updates preview zoom from wheel input', () => {
  const next = applyWheelZoom(1.2, 120)
  expect(next).toBe(1.1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
Expected: FAIL until the helper is wired into the panel.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div
  className="image-preview-well"
  onWheel={(event) => {
    event.preventDefault()
    workspace.setPreviewZoom((current) => applyWheelZoom(current, event.deltaY))
  }}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 3: Add click-to-pick color to matte preview

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- Modify: `src/components/ImageProcessingWorkspace/ImageMattePanel.tsx`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('image processing workspace samples a preview click into matte key color', () => {
  expect(sampleImagePixel({ data: new Uint8ClampedArray([80, 90, 100, 255]), width: 1, height: 1 }, { x: 0, y: 0 })).toEqual([80, 90, 100])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
Expected: FAIL until the click workflow is connected.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div
  className="image-preview-well"
  onClick={async (event) => {
    const target = event.currentTarget.querySelector('img')
    if (!target) return
    const rect = target.getBoundingClientRect()
    const point = mapPreviewPointToImagePixel(
      { x: event.clientX, y: event.clientY },
      rect,
      { width: workspace.processed!.width, height: workspace.processed!.height }
    )
    const color = await sampleProcessedPixel(workspace.processed!.url, point)
    workspace.updateMatte('keyColor', color)
  }}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 4: Verify browser behavior and push

**Files:**
- Modify: none

- [ ] **Step 1: Run the full gate**

Run: `npm test && npm run build && git diff --check && git status --short --branch`
Expected: tests and build pass, diff check clean, status reflects only intended edits.

- [ ] **Step 2: Verify in browser**

Open the image processing workspace, wheel over the crop preview, click a strong-colored pixel in the matte preview, and confirm the preview zoom and key color update visibly.

- [ ] **Step 3: Commit and push**

```bash
git add src/components/ImageProcessingWorkspace
git commit -m "feat: add image workspace interactions"
git push origin master
```

