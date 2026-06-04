#!/usr/bin/env bash
# VoxCPM Gradio 一键部署脚本 (macOS / Linux)
# 用法: curl -fsSL <url> | bash -s -- '/data/models/VoxCPM2' 'VoxCPM2'
# 或本地执行: bash deploy-voxcpm.sh '/data/models/VoxCPM2' 'VoxCPM2'

set -euo pipefail

MODEL_PATH="${1:-/data/models/VoxCPM2}"
MODEL_VARIANT="${2:-VoxCPM2}"
PORT=8808
PIP_MIRROR="https://mirrors.aliyun.com/pypi/simple/"
HF_MIRROR="https://hf-mirror.com"
REPO_MIRROR="https://gitclone.com/github.com/OpenBMB/VoxCPM.git"

# 模型版本 -> HuggingFace 仓库 ID
case "$MODEL_VARIANT" in
  "VoxCPM2")     HF_ID="openbmb/VoxCPM2" ;;
  "VoxCPM1.5")   HF_ID="openbmb/VoxCPM1.5" ;;
  "VoxCPM-0.5B") HF_ID="openbmb/VoxCPM-0.5B" ;;
  *)             HF_ID="openbmb/VoxCPM2"; MODEL_VARIANT="VoxCPM2" ;;
esac

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

# ── 4. 检测 git ────────────────────────────────────────────────────────────
step "检测 git"
command -v git &>/dev/null || fail "未找到 git，请先安装 git"
ok "git 可用"

# ── 5. 克隆仓库 ────────────────────────────────────────────────────────────
REPO_DIR="$MODEL_PATH/VoxCPM"
step "准备 VoxCPM 仓库到 $REPO_DIR"
mkdir -p "$MODEL_PATH"
if [[ -d "$REPO_DIR/.git" ]]; then
  ok "仓库已存在，跳过克隆"
else
  git clone --depth 1 "$REPO_MIRROR" "$REPO_DIR" || fail "克隆失败，请检查网络或 git 配置"
  ok "克隆完成"
fi

# ── 6. 安装依赖（使用阿里云镜像） ─────────────────────────────────────────
step "安装 Python 依赖"
python3 -m pip install --upgrade pip -i "$PIP_MIRROR" || fail "pip 升级失败"
python3 -m pip install voxcpm -i "$PIP_MIRROR" || fail "voxcpm 安装失败"
if [[ -f "$REPO_DIR/requirements.txt" ]]; then
  python3 -m pip install -r "$REPO_DIR/requirements.txt" -i "$PIP_MIRROR" || fail "依赖安装失败"
fi
ok "依赖安装完成"

# ── 7. 启动 Gradio 服务 ────────────────────────────────────────────────────
step "启动 Gradio 服务（端口 $PORT，模型 $MODEL_VARIANT）"
echo "    模型 $HF_ID 在首次启动时通过 hf-mirror.com 自动下载"
echo "    服务地址: http://127.0.0.1:$PORT"
echo "    按 Ctrl+C 停止服务"
echo
export HF_ENDPOINT="$HF_MIRROR"
cd "$REPO_DIR"
exec python3 app.py --port "$PORT" --device auto
