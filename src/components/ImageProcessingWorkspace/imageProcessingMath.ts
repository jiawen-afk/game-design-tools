export function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}
