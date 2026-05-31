import { coerceLayoutDefaults, type LayoutDefaults } from './model'
import { coerceMatteDefaults, type MatteDefaults } from './matteModel'

const MATTE_DEFAULTS_STORAGE_KEY = 'gameDesignTools.multiFrameSprite.matteDefaults.v1'
const LAYOUT_DEFAULTS_STORAGE_KEY = 'gameDesignTools.multiFrameSprite.layoutDefaults.v1'

export function readStoredMatteDefaults(): MatteDefaults {
  try {
    const raw = localStorage.getItem(MATTE_DEFAULTS_STORAGE_KEY)
    if (!raw) return coerceMatteDefaults({})
    return coerceMatteDefaults(JSON.parse(raw) as Partial<MatteDefaults>)
  } catch {
    return coerceMatteDefaults({})
  }
}

export function readStoredLayoutDefaults(): LayoutDefaults {
  try {
    const raw = localStorage.getItem(LAYOUT_DEFAULTS_STORAGE_KEY)
    if (!raw) return coerceLayoutDefaults({})
    return coerceLayoutDefaults(JSON.parse(raw) as Partial<LayoutDefaults>)
  } catch {
    return coerceLayoutDefaults({})
  }
}

export function writeStoredMatteDefaults(defaults: MatteDefaults) {
  localStorage.setItem(MATTE_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults))
}

export function writeStoredLayoutDefaults(defaults: LayoutDefaults) {
  localStorage.setItem(LAYOUT_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults))
}
