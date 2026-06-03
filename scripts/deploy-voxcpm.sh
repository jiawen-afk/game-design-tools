#!/usr/bin/env bash
# VoxCPM 一键部署脚本 (macOS / Linux)
# 用法: curl -fsSL <url> | bash -s -- '/data/models/VoxCPM2'
# 或本地执行: bash deploy-voxcpm.sh '/data/models/VoxCPM2'

set -euo pipefail

MODEL_PATH="${1:-}"
PORT=8000
PIP_MIRROR="https://mirrors.aliyun.com/pypi/simple/"
HF_MIRROR="https://hf-mirror.com"

step() { echo; echo "==> $1"; }
ok()   { echo "    OK: $1"; }
fail() { echo "    错误: $1" >&2; exit 1; }

# ── 1. Python ──────────────────────────────────────────────────────────────
step "检测 Python 版本"
if ! command -v python3 &>/dev/null; then
  fail "未找到 python3，请先安装 Python 3.10-3.12"
fi
PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
case "$PYVER" in
  3.10|3.11|3.12) ok "Python $PYVER" ;;
  *) fail "需要 Python 3.10-3.12，当前：$PYVER" ;;
esac

# ── 2. 磁盘空间（至少 30GB） ────────────────────────────────────────────────
step "检测磁盘空间"
if [[ "$OSTYPE" == "darwin"* ]]; then
  FREE_KB=$(df -k . | awk 'NR==2 {print $4}')
else
  FREE_KB=$(df -k . | awk 'NR==2 {print $4}')
fi
FREE_GB=$((FREE_KB / 1024 / 1024))
if (( FREE_GB < 30 )); then
  fail "可用空间不足（${FREE_GB}GB），至少需要 30GB"
fi
ok "${FREE_GB}GB 可用"

# ── 3. GPU 检测 ────────────────────────────────────────────────────────────
step "检测 GPU"
if command -v nvidia-smi &>/dev/null; then
  ok "$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -1)"
else
  echo "    警告: 未检测到 nvidia-smi，将使用 CPU 模式（速度较慢）"
fi

# ── 4. 安装依赖（使用阿里云镜像） ─────────────────────────────────────────
step "安装 Python 依赖"
python3 -m pip install -q --upgrade pip -i "$PIP_MIRROR"
python3 -m pip install -q voxcpm nano-vllm-voxcpm -i "$PIP_MIRROR"
ok "依赖安装完成"

# ── 5. 下载模型 ────────────────────────────────────────────────────────────
if [[ -z "$MODEL_PATH" ]]; then
  step "下载模型（使用 hf-mirror.com）"
  export HF_ENDPOINT="$HF_MIRROR"
  MODEL_PATH=$(python3 -c "from huggingface_hub import snapshot_download; print(snapshot_download('openbmb/VoxCPM2'))")
  ok "模型下载完成: $MODEL_PATH"
else
  step "使用本地模型: $MODEL_PATH"
  [[ -d "$MODEL_PATH" ]] || fail "路径不存在: $MODEL_PATH"
fi

# ── 6. 启动服务 ────────────────────────────────────────────────────────────
step "启动 vLLM 服务（端口 $PORT）"
echo "    服务地址: http://127.0.0.1:$PORT"
echo "    按 Ctrl+C 停止服务"
echo
vllm serve "$MODEL_PATH" --omni --port "$PORT"
