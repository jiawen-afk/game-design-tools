import type { Dispatch, SetStateAction } from 'react'
import { Button, Input, Tag } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import type { ConnectionStatus } from './voiceDeploymentModel'

type DesktopServiceAction = 'start' | 'stop' | 'restart' | 'status'

interface VoiceWorkspaceHeaderProps {
  port: number
  portInput: string
  setPortInput: Dispatch<SetStateAction<string>>
  serviceUrl: string
  connectionStatus: ConnectionStatus
  connected: boolean
  desktopRuntime: boolean
  desktopServiceBusy: boolean
  runCheck: (port: number) => Promise<void>
  applyPort: () => void
  startDesktopService: () => Promise<void>
  controlDesktopService: (action: DesktopServiceAction) => Promise<void>
}

export function VoiceWorkspaceHeader({
  port,
  portInput,
  setPortInput,
  serviceUrl,
  connectionStatus,
  connected,
  desktopRuntime,
  desktopServiceBusy,
  runCheck,
  applyPort,
  startDesktopService,
  controlDesktopService,
}: VoiceWorkspaceHeaderProps) {
  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

  return (
    <>
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">配音工作台</h2>
          <p>通过 VoxCPM 在本机运行语音生成服务，工作台直接调用本地接口完成语音生成，无需把素材发送到外部服务器。</p>
        </div>
        <div className="hero-status">
          {connectionTag}
          <Button.Group className="voice-service-actions">
            <Button
              icon={connectionStatus === 'checking' ? <LoadingOutlined /> : <ReloadOutlined />}
              disabled={connectionStatus === 'checking'}
              onClick={() => runCheck(port)}
            >
              重新检测
            </Button>
            {connected ? (
              <Button
                icon={<ReloadOutlined />}
                loading={desktopServiceBusy}
                disabled={!desktopRuntime || desktopServiceBusy}
                onClick={() => void controlDesktopService('restart').then(() => runCheck(port))}
              >
                重启服务
              </Button>
            ) : (
              <Button
                icon={<PlayCircleOutlined />}
                loading={desktopServiceBusy}
                disabled={!desktopRuntime || desktopServiceBusy}
                onClick={() => void startDesktopService()}
              >
                启动服务
              </Button>
            )}
            <Button
              danger
              icon={<PoweroffOutlined />}
              loading={desktopServiceBusy}
              disabled={!desktopRuntime || desktopServiceBusy}
              onClick={() => void controlDesktopService('stop').then(() => runCheck(port))}
            >
              停止服务
            </Button>
          </Button.Group>
        </div>
      </div>

      <div className="voice-panel port-row">
        <span className="port-label">服务地址</span>
        <code>{serviceUrl}</code>
        <Input
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          onPressEnter={applyPort}
          onBlur={applyPort}
          addonBefore="端口"
          style={{ width: 160 }}
        />
      </div>
    </>
  )
}
