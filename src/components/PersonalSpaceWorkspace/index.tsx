import { message } from 'antd'

import { PersonalSpaceWorkbench } from './PersonalSpaceWorkbench'
import { ProjectManagementSurface } from './ProjectManagementSurface'
import { usePersonalSpaceWorkspace } from './usePersonalSpaceWorkspace'

import '../VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css'
import './personalSpace.css'

export default function PersonalSpaceWorkspace() {
  const [messageApi, contextHolder] = message.useMessage()
  const workspace = usePersonalSpaceWorkspace(messageApi)

  if (workspace.workspacePage === 'management') {
    return <ProjectManagementSurface workspace={workspace} contextHolder={contextHolder} />
  }

  return <PersonalSpaceWorkbench workspace={workspace} contextHolder={contextHolder} />
}
