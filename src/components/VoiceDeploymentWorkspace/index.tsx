import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Segmented, Tag } from 'antd'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DesktopOutlined,
  LoadingOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import './voiceDeploymentWorkspace.css'
import {
  type ConnectionStatus,
  type DeviceType,
  type HardwareReport,
  type Platform,
  buildOneClickCommand,
  buildServiceUrl,
  buildVllmApiCall,
  defaultPort,
  evaluateHardware,
  gpuCheckCommand,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'

const platformOptions: Array<{ label: string; value: Platform }> = [
  { label: 'Windows', value: 'windows' },
  { label: 'macOS / Linux', value: 'mac' },
]

const deviceOptions: Array<{ label: string; value: DeviceType }> = [
  { label: 'NVIDIA GPU', value: 'nvidia' },
  { label: 'Apple Silicon', value: 'apple' },
  { label: 'CPU', value: 'cpu' },
]

async function checkConnection(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export default function VoiceDeploymentWorkspace() {
  const [port, setPort] = useState(defaultPort)
  const [portInput, setPortInput] = useState(String(defaultPort))
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [deviceType, setDeviceType] = useState<DeviceType>('nvidia')
  const [gpuInput, setGpuInput] = useState('')
  const [modelPath, setModelPath] = useState('')
  const [platform, setPlatform] = useState<Platform>('windows')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const checkRef = useRef(0)

  // Build hardware report depending on device type
  const hardwareReport = useMemo<HardwareReport | null>(() => {
    if (deviceType === 'apple') return { gpuName: 'Apple Silicon', vramGb: 0, device: 'apple' }
    if (deviceType === 'cpu')   return { gpuName: 'CPU', vramGb: 0, device: 'cpu' }
    return parseNvidiaSmiReport(gpuInput)
  }, [deviceType, gpuInput])

  const hardware = useMemo(() => evaluateHardware(hardwareReport), [hardwareReport])
  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const oneClickCommand = useMemo(() => buildOneClickCommand(platform, modelPath), [platform, modelPath])
  const apiCallExample = useMemo(() => buildVllmApiCall({ port, text: '你好，这是一段测试语音。' }), [port])
  const serviceUrl = buildServiceUrl(port)
  const connected = connectionStatus === 'connected'

  const runCheck = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [])

  useEffect(() => { runCheck(defaultPort) }, [runCheck])

  const applyPort = () => {
    const n = parseInt(portInput, 10)
    if (n > 0 && n < 65536) { setPort(n); runCheck(n) }
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1600)
  }

  const connectionTag = {
    idle:         <Tag>未检测</Tag>,
    checking:     <Tag icon={<LoadingOutlined />} color="blue">检测中…</Tag>,
    connected:    <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

  const alertType = hardware.status === 'blocked' ? 'error'
    : hardware.status === 'ready' ? 'success'
    : hardware.status === 'warning' ? 'warning'
    : 'info'

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">游戏角色语音工作台</h2>
          <p>通过 VoxCPM 在本机运行语音生成服务，工作台直接调用本地接口完成语音生成，无需把素材发送到外部服务器。</p>
        </div>
        <div className="hero-status">
          {connectionTag}
          <Button
            icon={connectionStatus === 'checking' ? <LoadingOutlined /> : <ReloadOutlined />}
            disabled={connectionStatus === 'checking'}
            onClick={() => runCheck(port)}
          >
            重新检测
          </Button>
        </div>
      </div>

      <div className="voice-panel port-row">
        <span className="port-label">服务地址</span>
        <code>{serviceUrl}/v1/audio/speech</code>
        <Input
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          onPressEnter={applyPort}
          onBlur={applyPort}
          addonBefore="端口"
          style={{ width: 160 }}
        />
      </div>

      {connected ? (
        <div className="voice-grid">
          <section className="voice-panel voice-panel-wide" aria-labelledby="api-title">
            <div className="panel-title">
              <ApiOutlined />
              <h3 id="api-title">调用本地语音接口</h3>
            </div>
            <p className="panel-copy">服务已就绪。通过 <code>POST /v1/audio/speech</code> 生成语音，返回 WAV 音频文件。</p>
            <Input.TextArea className="deploy-command" value={apiCallExample} rows={5} readOnly />
            <div className="deploy-actions">
              <Button
                type="primary"
                icon={copiedKey === 'api' ? <CheckCircleOutlined /> : <CopyOutlined />}
                onClick={() => copy('api', apiCallExample)}
              >
                复制调用示例
              </Button>
              <span>将 <code>input</code> 替换为目标文本，<code>voice</code> 可选角色音色名称。</span>
            </div>
          </section>
        </div>
      ) : (
        <div className="voice-grid">
          {/* 环境检测 */}
          <section className="voice-panel" aria-labelledby="hw-title">
            <div className="panel-title">
              <DesktopOutlined />
              <h3 id="hw-title">环境检测</h3>
            </div>
            <p className="panel-copy">
              选择当前设备类型。VoxCPM 支持 NVIDIA GPU（CUDA ≥12.0，PyTorch ≥2.5.0）、Apple Silicon（MPS）和 CPU 三种模式。
            </p>

            <Segmented
              value={deviceType}
              options={deviceOptions}
              onChange={(v) => setDeviceType(v as DeviceType)}
            />

            {deviceType === 'nvidia' && (
              <>
                <p className="panel-copy">
                  在本机终端执行检测命令，将输出粘贴到下方：
                </p>
                <div className="command-row">
                  <code>{gpuCheckCommand}</code>
                  <Button
                    icon={copiedKey === 'gpu' ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={() => copy('gpu', gpuCheckCommand)}
                  >
                    复制
                  </Button>
                </div>
                <Input.TextArea
                  value={gpuInput}
                  onChange={(e) => setGpuInput(e.target.value)}
                  placeholder="NVIDIA GeForce RTX 3060, 12288"
                  rows={3}
                />
              </>
            )}

            <Alert
              className="status-alert"
              type={alertType}
              title={hardware.title}
              description={
                <>
                  {hardware.detail}
                  {hardware.recommendedModel && (
                    <span className="recommended-model"> 推荐版本：<strong>{hardware.recommendedModel}</strong></span>
                  )}
                </>
              }
              showIcon
            />
          </section>

          {/* 一键部署 */}
          <section className="voice-panel" aria-labelledby="deploy-title">
            <div className="panel-title">
              <ThunderboltOutlined />
              <h3 id="deploy-title">一键部署</h3>
            </div>
            <p className="panel-copy">
              选择系统，复制命令到终端执行。脚本会自动检测环境、使用国内镜像源安装依赖并启动服务。
            </p>

            <Segmented
              value={platform}
              options={platformOptions}
              onChange={(v) => setPlatform(v as Platform)}
            />

            <Input
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              placeholder={platform === 'windows' ? 'D:\\models\\VoxCPM2（留空则自动下载）' : '/data/models/VoxCPM2（留空则自动下载）'}
              status={modelPath && !modelValidation.valid ? 'warning' : undefined}
            />

            <div className="command-row">
              <code className="one-click-cmd">{oneClickCommand}</code>
              <Button
                type="primary"
                icon={copiedKey === 'deploy' ? <CheckCircleOutlined /> : <CopyOutlined />}
                onClick={() => copy('deploy', oneClickCommand)}
              >
                复制
              </Button>
            </div>

            <Alert
              type="info"
              showIcon
              title={platform === 'windows' ? '在 PowerShell 中以管理员身份运行' : '在 Terminal 中运行'}
              description="脚本使用清华/阿里云镜像源安装 Python 依赖和模型，完成后服务自动在端口 8000 启动。"
            />
          </section>
        </div>
      )}
    </section>
  )
}
