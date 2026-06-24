export interface ProjectSpaceWarningMessageApi {
  warning(content: string): unknown
}

function formatUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function formatCurrentProjectSpaceSyncWarning(error: unknown) {
  return `已保存到本地项目缓存，但同步项目存储失败：${formatUnknownError(error)}`
}

export function showCurrentProjectSpaceSyncWarning(
  messageApi: ProjectSpaceWarningMessageApi,
  error: unknown,
) {
  return messageApi.warning(formatCurrentProjectSpaceSyncWarning(error))
}
