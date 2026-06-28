import { getDesktopApi, type GameDesignToolsDesktopApi } from '../../desktopApi'

export interface RemoteProfileActionMessageApi {
  warning: (content: string) => void
}

interface RemoteProfileActionGuardInput {
  messageApi: RemoteProfileActionMessageApi
  validationErrors?: string[]
  draftTested?: boolean
  untestedMessage?: string
  runtimeUnavailableMessage: string
}

export function getDesktopApiForRemoteProfileAction(
  input: RemoteProfileActionGuardInput,
): GameDesignToolsDesktopApi | null {
  const validationError = input.validationErrors?.[0]
  if (validationError) {
    void input.messageApi.warning(validationError)
    return null
  }
  if (input.draftTested === false) {
    void input.messageApi.warning(input.untestedMessage ?? '请先验证远程连接配置')
    return null
  }
  const desktopApi = getDesktopApi()
  if (!desktopApi) {
    void input.messageApi.warning(input.runtimeUnavailableMessage)
    return null
  }
  return desktopApi
}
