export function createProjectId() {
  return createProjectStorageId()
}

export function createResourceId() {
  return createProjectStorageId()
}

export function createProjectStorageId() {
  const random = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}_${random}`
}
