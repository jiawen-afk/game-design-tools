export interface ProjectDeviceBinding {
  databaseProfileId: string
  storageProfileId: string
}

const projectDeviceBindingsStorageKey = 'game-design-tools.project-space.device-bindings.v1'

export interface ProjectDeviceBindingPersistence {
  list(): Promise<Record<string, ProjectDeviceBinding>>
  write(projectId: string, binding: ProjectDeviceBinding): Promise<void>
  clear(projectId: string): Promise<void>
}

function readBindings(storage: Storage): Record<string, ProjectDeviceBinding> {
  try {
    const raw = storage.getItem(projectDeviceBindingsStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isValidBinding(value: ProjectDeviceBinding | undefined): value is ProjectDeviceBinding {
  return Boolean(value?.databaseProfileId?.trim() && value?.storageProfileId?.trim())
}

function normalizeBinding(binding: ProjectDeviceBinding) {
  return {
    databaseProfileId: binding.databaseProfileId.trim(),
    storageProfileId: binding.storageProfileId.trim(),
  }
}

function validBindings(bindings: Record<string, ProjectDeviceBinding>) {
  return Object.fromEntries(
    Object.entries(bindings)
      .filter(([, binding]) => isValidBinding(binding))
      .map(([projectId, binding]) => [projectId, normalizeBinding(binding)]),
  )
}

function writeBindings(storage: Storage, bindings: Record<string, ProjectDeviceBinding>) {
  storage.setItem(projectDeviceBindingsStorageKey, JSON.stringify(validBindings(bindings)))
}

export function createDesktopProjectDeviceBindingPersistence(): ProjectDeviceBindingPersistence | null {
  const desktopApi = typeof window === 'undefined' ? undefined : window.gameDesignToolsDesktop
  if (!desktopApi) return null
  return {
    async list() {
      return desktopApi.listProjectDeviceBindings()
    },
    async write(projectId, binding) {
      await desktopApi.writeProjectDeviceBinding(projectId, binding)
    },
    async clear(projectId) {
      await desktopApi.clearProjectDeviceBinding(projectId)
    },
  }
}

export function readProjectDeviceBinding(projectId: string, storage: Storage = localStorage) {
  const binding = readBindings(storage)[projectId]
  return isValidBinding(binding) ? { ...binding } : null
}

export function writeProjectDeviceBinding(
  projectId: string,
  binding: ProjectDeviceBinding,
  storage: Storage = localStorage,
) {
  if (!projectId || !isValidBinding(binding)) return
  const bindings = readBindings(storage)
  bindings[projectId] = normalizeBinding(binding)
  writeBindings(storage, bindings)
}

export function clearProjectDeviceBinding(projectId: string, storage: Storage = localStorage) {
  const bindings = readBindings(storage)
  delete bindings[projectId]
  writeBindings(storage, bindings)
}

export async function hydrateProjectDeviceBindingsFromLocalPersistence({
  storage = localStorage,
  persistence = createDesktopProjectDeviceBindingPersistence(),
}: {
  storage?: Storage
  persistence?: ProjectDeviceBindingPersistence | null
} = {}) {
  if (!persistence) return
  const legacyBindings = validBindings(readBindings(storage))
  const persistedBindings = validBindings(await persistence.list())
  const mergedBindings = {
    ...legacyBindings,
    ...persistedBindings,
  }
  writeBindings(storage, mergedBindings)
  await Promise.all(
    Object.entries(legacyBindings)
      .filter(([projectId]) => !(projectId in persistedBindings))
      .map(([projectId, binding]) => persistence.write(projectId, binding)),
  )
}

export async function writeProjectDeviceBindingToLocalPersistence(
  projectId: string,
  binding: ProjectDeviceBinding,
  {
    storage = localStorage,
    persistence = createDesktopProjectDeviceBindingPersistence(),
  }: {
    storage?: Storage
    persistence?: ProjectDeviceBindingPersistence | null
  } = {},
) {
  writeProjectDeviceBinding(projectId, binding, storage)
  if (projectId && isValidBinding(binding)) await persistence?.write(projectId, normalizeBinding(binding))
}

export async function clearProjectDeviceBindingFromLocalPersistence(
  projectId: string,
  {
    storage = localStorage,
    persistence = createDesktopProjectDeviceBindingPersistence(),
  }: {
    storage?: Storage
    persistence?: ProjectDeviceBindingPersistence | null
  } = {},
) {
  clearProjectDeviceBinding(projectId, storage)
  if (projectId) await persistence?.clear(projectId)
}
