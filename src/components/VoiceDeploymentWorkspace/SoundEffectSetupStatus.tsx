import { Alert } from 'antd'

import type { DesktopCommandResult, DesktopStableAudioSetupResult } from '../../desktopApi'

interface SoundEffectSetupStatusProps {
  connected: boolean
  dependenciesReady: boolean
  desktopDependencyStatusResult: DesktopCommandResult | null
  desktopHfLoginError: string
  desktopHfLoginResult: DesktopStableAudioSetupResult | null
  desktopRuntime: boolean
  desktopServiceBusy: boolean
  desktopServiceResult: DesktopCommandResult | null
  desktopSetupError: string
  desktopSetupResult: DesktopStableAudioSetupResult | null
}

function renderCommandDescription(output: string) {
  if (!output) return '没有返回详细信息。'
  const parts = output.split(/(https?:\/\/[^\s]+)/g)
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, index) => (
        /^https?:\/\//.test(part)
          ? (
              <a key={`${part}:${index}`} href={part} target="_blank" rel="noreferrer">
                {part}
              </a>
            )
          : <span key={`${part}:${index}`}>{part}</span>
      ))}
    </span>
  )
}

function commandAlert(result: DesktopCommandResult | null, successTitle: string, warningTitle: string) {
  if (!result) return null
  return (
    <Alert
      type={result.ok ? 'success' : 'warning'}
      showIcon
      title={result.ok ? successTitle : warningTitle}
      description={renderCommandDescription(result.output)}
    />
  )
}

export function SoundEffectSetupStatus({
  connected,
  dependenciesReady,
  desktopDependencyStatusResult,
  desktopHfLoginError,
  desktopHfLoginResult,
  desktopRuntime,
  desktopServiceBusy,
  desktopServiceResult,
  desktopSetupError,
  desktopSetupResult,
}: SoundEffectSetupStatusProps) {
  return (
    <>
      {!desktopRuntime ? (
        <Alert type="warning" showIcon title="当前是 Web 运行环境" description="安装、检测模型和服务控制需要从 Windows 桌面应用启动。" />
      ) : null}
      {desktopSetupResult ? (
        <Alert type="success" showIcon title="安装终端已打开" description={`脚本路径：${desktopSetupResult.scriptPath}`} />
      ) : null}
      {desktopSetupError ? (
        <Alert type="error" showIcon title="安装依赖启动失败" description={desktopSetupError} />
      ) : null}
      {desktopHfLoginResult ? (
        <Alert type="success" showIcon title="HuggingFace 登录终端已打开" description={`脚本路径：${desktopHfLoginResult.scriptPath}`} />
      ) : null}
      {desktopHfLoginError ? (
        <Alert type="error" showIcon title="HuggingFace 登录终端启动失败" description={desktopHfLoginError} />
      ) : null}
      {!dependenciesReady ? commandAlert(desktopDependencyStatusResult, '依赖和模型检测完成', '依赖或模型尚未就绪') : null}
      {commandAlert(desktopServiceResult, desktopServiceBusy ? '服务启动中' : connected ? '服务已就绪' : '服务命令已执行', '服务未就绪')}
    </>
  )
}
