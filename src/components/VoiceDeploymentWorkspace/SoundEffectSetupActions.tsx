import { Button } from 'antd'
import {
  LoginOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import type { StableAudioConnectionStatus, StableAudioModelId } from './soundEffectModel'

export type StableAudioServiceAction = 'start' | 'stop' | 'restart' | 'status'

interface SoundEffectSetupActionsProps {
  connected: boolean
  connectionStatus: StableAudioConnectionStatus
  desktopDependencyStatusBusy: boolean
  desktopHfLoginBusy: boolean
  desktopRuntime: boolean
  desktopServiceBusy: boolean
  desktopSetupBusy: boolean
  variant: 'title' | 'compact'
  onControlDesktopService: (action: StableAudioServiceAction) => void
  onQueryDesktopDependencyStatus: () => void
  onRunCheck: () => void
  onRunDesktopHfLogin: () => void
  onRunDesktopSetup: (model?: StableAudioModelId) => void
  onStartDesktopService: () => void
}

export function SoundEffectSetupActions({
  connected,
  connectionStatus,
  desktopDependencyStatusBusy,
  desktopHfLoginBusy,
  desktopRuntime,
  desktopServiceBusy,
  desktopSetupBusy,
  variant,
  onControlDesktopService,
  onQueryDesktopDependencyStatus,
  onRunCheck,
  onRunDesktopHfLogin,
  onRunDesktopSetup,
  onStartDesktopService,
}: SoundEffectSetupActionsProps) {
  const serviceButtons = (
    <>
      <Button
        icon={<PlayCircleOutlined />}
        loading={desktopServiceBusy}
        disabled={!desktopRuntime || desktopServiceBusy || connected || connectionStatus === 'checking'}
        onClick={onStartDesktopService}
      >
        启动服务
      </Button>
      <Button
        icon={<ReloadOutlined />}
        loading={desktopServiceBusy}
        disabled={!desktopRuntime || desktopServiceBusy}
        onClick={() => onControlDesktopService('restart')}
      >
        重启服务
      </Button>
      <Button
        danger
        icon={<PoweroffOutlined />}
        loading={desktopServiceBusy}
        disabled={!desktopRuntime || desktopServiceBusy || !connected || connectionStatus === 'checking'}
        onClick={() => onControlDesktopService('stop')}
      >
        停止服务
      </Button>
    </>
  )

  if (variant === 'compact') {
    return <div className="compact-service-controls">{serviceButtons}</div>
  }

  return (
    <>
      <span className="sound-setup-title-actions-label">
        <ThunderboltOutlined />
        <span>安装与服务</span>
      </span>
      <div className="desktop-boost-actions">
        <Button icon={<SearchOutlined />} onClick={onRunCheck} disabled={connectionStatus === 'checking'}>
          检测服务
        </Button>
        <Button
          icon={<SearchOutlined />}
          loading={desktopDependencyStatusBusy}
          disabled={!desktopRuntime || desktopDependencyStatusBusy}
          onClick={onQueryDesktopDependencyStatus}
        >
          检测依赖和模型
        </Button>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={desktopSetupBusy}
          disabled={!desktopRuntime || desktopSetupBusy}
          onClick={() => onRunDesktopSetup()}
        >
          安装依赖
        </Button>
        <Button
          icon={<LoginOutlined />}
          loading={desktopHfLoginBusy}
          disabled={!desktopRuntime || desktopHfLoginBusy}
          onClick={onRunDesktopHfLogin}
        >
          登录 HuggingFace
        </Button>
        {serviceButtons}
      </div>
    </>
  )
}
