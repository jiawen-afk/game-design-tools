export function normalizeGuideLinePosition(position: number, max: number): number | null {
  if (!Number.isFinite(position)) return null
  const rounded = Math.round(position)
  if (rounded <= 0) return null
  return Math.min(Math.max(1, rounded), Math.max(1, Math.round(max)))
}

export function getGuideLineEdgeStartPosition(): number {
  return 1
}

export function shouldIgnoreInitialGuideDrag(position: number, max: number, hasEnteredCanvas: boolean): boolean {
  if (hasEnteredCanvas) return false
  if (!Number.isFinite(position)) return true
  return position <= 0 || position > max
}

export function getGuideRulerLabel(axis: 'x' | 'y'): string {
  return axis === 'x' ? 'X 轴' : 'Y 轴'
}

export function getGuideRulerDragAxis(rulerAxis: 'x' | 'y'): 'x' | 'y' {
  return rulerAxis === 'x' ? 'y' : 'x'
}

export function getGuideRulerCursor(rulerAxis: 'x' | 'y'): 'ns-resize' | 'ew-resize' {
  return rulerAxis === 'x' ? 'ns-resize' : 'ew-resize'
}

export function getGuideActionLabel(axis: 'x' | 'y'): string {
  return axis === 'x' ? '添加竖向辅助线' : '添加横向辅助线'
}

export function getGuideEmptyStateText(): string {
  return '从顶部或左侧标尺添加辅助线。请先上传图片开始调整。'
}
