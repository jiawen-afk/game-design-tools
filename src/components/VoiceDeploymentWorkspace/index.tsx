import { useMemo, useState } from 'react'
import { Alert, Button, Input, Modal, Segmented, Tag } from 'antd'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import './voiceDeploymentWorkspace.css'
import {
  type DeployMode,
  buildDeployCommand,
  buildLocalServiceUsage,
  evaluateHardware,
  gpuCheckCommand,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'

const deploymentOptions: Array<{ label: string; value: DeployMode }> = [
  { label: 'Docker 部署', value: 'docker' },
  { label: '直接部署', value: 'direct' },
]

export default function VoiceDeploymentWorkspace() {
  const [gpuReportInput, setGpuReportInput] = useState('')
  const [modelPath, setModelPath] = useState('')
  const [deployMode, setDeployMode] = useState<DeployMode>('docker')
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const hardwareReport = useMemo(() => parseNvidiaSmiReport(gpuReportInput), [gpuReportInput])
  const hardware = useMemo(() => evaluateHardware(hardwareReport), [hardwareReport])
  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const deployCommand = useMemo(
    () => buildDeployCommand({ mode: deployMode, modelPath, port: 8808 }),
    [deployMode, modelPath],
  )
  const localUsage = useMemo(() => buildLocalServiceUsage(8808), [])
  const canDeploy = modelValidation.valid && hardware.status !== 'blocked'

  const copyText = async (target: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTarget(target)
    window.setTimeout(() => setCopiedTarget(null), 1600)
  }

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">游戏语音生成工作台</h2>
          <p>
            用 VoxCPM 在本机部署语音生成环境。部署完成后，按本地服务地址调用，避免把素材和模型请求发到外部服务器。
          </p>
        </div>
        <Button type="primary" onClick={() => setAssistantOpen(true)}>
          打开安装助手
        </Button>
      </div>

      <div className="voice-grid">
        <section className="voice-panel" aria-labelledby="service-title">
          <div className="panel-title">
            <ApiOutlined />
            <h3 id="service-title">本地服务调用方式</h3>
          </div>
          <p className="panel-copy">
            VoxCPM 部署完成后会作为本地 Gradio 服务运行。先用浏览器确认页面可访问，再用 Python 客户端按页面 API 面板提供的参数调用。
          </p>
          <div className="usage-list">
            <div>
              <span>访问地址</span>
              <code>{localUsage.browserUrl}</code>
            </div>
            <div>
              <span>健康检查</span>
              <code>{localUsage.healthCheck}</code>
            </div>
          </div>
          <Input.TextArea className="deploy-command" value={localUsage.pythonClient} rows={5} readOnly />
          <div className="deploy-actions">
            <Button
              icon={copiedTarget === 'usage' ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={() => copyText('usage', localUsage.pythonClient)}
            >
              复制 Python 调用示例
            </Button>
            <span>具体 `predict` 参数以本地 Gradio 页面的 API 面板为准。</span>
          </div>
        </section>

        <section className="voice-panel" aria-labelledby="assistant-summary-title">
          <div className="panel-title">
            <ThunderboltOutlined />
            <h3 id="assistant-summary-title">安装助手</h3>
          </div>
          <p className="panel-copy">
            助手会要求粘贴显卡检测结果、填写本地模型地址，并根据 Docker 或直接部署方式生成命令。
          </p>
          <div className="assistant-status">
            <Tag color={canDeploy ? 'green' : 'blue'}>
              {canDeploy ? '部署参数已就绪' : '等待检测与模型路径'}
            </Tag>
            <Button onClick={() => setAssistantOpen(true)}>打开弹窗</Button>
          </div>
        </section>
      </div>

      <Modal
        title="VoxCPM 本地安装助手"
        open={assistantOpen}
        onCancel={() => setAssistantOpen(false)}
        footer={null}
        width={960}
      >
        <div className="voice-grid modal-grid">
        <section className="voice-panel" aria-labelledby="hardware-title">
          <div className="panel-title">
            <DesktopOutlined />
            <h3 id="hardware-title">显卡与显存检测</h3>
          </div>
          <p className="panel-copy">
            浏览器不能直接读取本机显卡显存。请在本机终端执行检测命令，并把输出粘贴到这里。
          </p>
          <div className="command-row">
            <code>{gpuCheckCommand}</code>
            <Button
              icon={copiedTarget === 'gpu' ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={() => copyText('gpu', gpuCheckCommand)}
            >
              复制检测命令
            </Button>
          </div>
          <Input.TextArea
            value={gpuReportInput}
            onChange={(event) => setGpuReportInput(event.target.value)}
            placeholder="示例：NVIDIA GeForce RTX 3060, 12288"
            rows={5}
          />
          <Alert className="status-alert" type={hardware.status === 'blocked' ? 'error' : hardware.status === 'ready' ? 'success' : 'info'} message={hardware.title} description={hardware.detail} showIcon />
        </section>

        <section className="voice-panel" aria-labelledby="model-title">
          <div className="panel-title">
            <FolderOpenOutlined />
            <h3 id="model-title">本地模型地址</h3>
          </div>
          <p className="panel-copy">
            填写已经下载到本机的 VoxCPM 模型目录。部署命令会把它作为 `--model-id` 使用，方便后续固定调用。
          </p>
          <Input
            value={modelPath}
            onChange={(event) => setModelPath(event.target.value)}
            placeholder="D:\models\VoxCPM2"
            status={modelValidation.valid ? undefined : 'warning'}
          />
          <p className={modelValidation.valid ? 'field-note is-ready' : 'field-note'}>{modelValidation.message}</p>

          <div className="mode-block">
            <div className="panel-title compact">
              <ThunderboltOutlined />
              <h3>部署方式</h3>
            </div>
            <Segmented value={deployMode} options={deploymentOptions} onChange={(value) => setDeployMode(value as DeployMode)} />
          </div>
        </section>

        <section className="voice-panel voice-panel-wide" aria-labelledby="deploy-title">
          <div className="panel-title">
            <ApiOutlined />
            <h3 id="deploy-title">一键部署命令</h3>
          </div>
          <Alert
            type="warning"
            showIcon
            message="需要在本机终端执行"
            description="当前应用是纯前端页面，不能越过浏览器安全限制直接启动 Docker 或安装依赖。这里会生成一条可复制命令，由你在本机执行。"
          />
          <Input.TextArea className="deploy-command" value={deployCommand} rows={deployMode === 'docker' ? 5 : 4} readOnly />
          <div className="deploy-actions">
            <Button
              type="primary"
              icon={copiedTarget === 'deploy' ? <CheckCircleOutlined /> : <CopyOutlined />}
              disabled={!canDeploy}
              onClick={() => copyText('deploy', deployCommand)}
            >
              复制一键部署命令
            </Button>
            <span>部署完成后访问 http://127.0.0.1:8808，后续工具可按这个本地地址调用。</span>
          </div>
        </section>
        </div>
      </Modal>
    </section>
  )
}
