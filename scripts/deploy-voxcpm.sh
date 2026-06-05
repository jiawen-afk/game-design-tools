#!/usr/bin/env bash
# VoxCPM Gradio 一键部署脚本 (macOS / Linux)
# 用法: curl -fsSL <url> | bash -s -- '/data/models/VoxCPM2' 'VoxCPM2'
# 或本地执行: bash deploy-voxcpm.sh '/data/models/VoxCPM2' 'VoxCPM2'

set -euo pipefail

MODEL_PATH="${1:-/data/models/VoxCPM2}"
MODEL_VARIANT="${2:-VoxCPM2}"
SOURCE="${3:-auto}"
PORT=8808
PIP_MIRROR="https://mirrors.aliyun.com/pypi/simple/"
HF_MIRROR="https://hf-mirror.com"
# PyTorch CUDA wheel 官方源（cu128 兼容 20/30/40/50 系）。必须用官方源：
# 阿里云 pytorch-wheels 是扁平目录，不兼容 pip --index-url，且与 PyPI 混用会误选 CPU 版。
TORCH_CUDA_INDEX="https://download.pytorch.org/whl/cu128"
REPO_MIRROR="https://gitclone.com/github.com/OpenBMB/VoxCPM.git"

# 模型版本 -> HuggingFace 仓库 ID（小写 openbmb）
case "$MODEL_VARIANT" in
  "VoxCPM2")     HF_ID="openbmb/VoxCPM2" ;;
  "VoxCPM1.5")   HF_ID="openbmb/VoxCPM1.5" ;;
  "VoxCPM-0.5B") HF_ID="openbmb/VoxCPM-0.5B" ;;
  *)             HF_ID="openbmb/VoxCPM2"; MODEL_VARIANT="VoxCPM2" ;;
esac

# 模型版本 -> ModelScope 仓库 ID（大写 OpenBMB）
ms_id_for() {
  case "$1" in
    "VoxCPM2")     echo "OpenBMB/VoxCPM2" ;;
    "VoxCPM1.5")   echo "OpenBMB/VoxCPM1.5" ;;
    "VoxCPM-0.5B") echo "OpenBMB/VoxCPM-0.5B" ;;
    *)             echo "OpenBMB/VoxCPM2" ;;
  esac
}

# 对 url 发 3 次 HEAD 请求测延迟，取最小毫秒；失败计 99999 表示不可用
measure_latency() {
  local url="$1" best=99999 t ms
  for i in 1 2 3; do
    t=$(curl -o /dev/null -s -m 5 -w '%{time_total}' -I "$url" 2>/dev/null) || continue
    ms=$(awk "BEGIN{printf \"%d\", $t*1000}")
    if (( ms < best )); then best=$ms; fi
  done
  echo "$best"
}

step() { echo; echo "==> $1"; }
ok()   { echo "    OK: $1"; }
fail() { echo "    错误: $1" >&2; exit 1; }

install_gradio_cors_patch() {
  local repo_dir="$1"
  cat > "$repo_dir/sitecustomize.py" <<'PY'
"""Allow browser pages to call the local VoxCPM Gradio server.

Python imports sitecustomize.py automatically during startup when it is on
sys.path. The VoxCPM service is launched from this repository directory, so this
patch is applied before app.py imports Gradio.
"""

import os


def _allowed_origins():
    raw = os.environ.get("VOXCPM_ALLOWED_BROWSER_ORIGINS", "*")
    return {origin.strip() for origin in raw.split(",") if origin.strip()}


def _is_origin_allowed(origin):
    allowed = _allowed_origins()
    return "*" in allowed or origin in allowed


def _install_tools_cors_patch():
    try:
        from gradio.routes import CustomCORSMiddleware
    except Exception:
        return

    if getattr(CustomCORSMiddleware, "_tools_cors_patch_installed", False):
        return

    original_is_valid_origin = CustomCORSMiddleware.is_valid_origin
    original_preflight_response = CustomCORSMiddleware.preflight_response

    def is_valid_origin(self, request_headers):
        origin = request_headers.get("origin")
        if origin and _is_origin_allowed(origin):
            return True
        return original_is_valid_origin(self, request_headers)

    def preflight_response(self, request_headers):
        response = original_preflight_response(self, request_headers)
        origin = request_headers.get("origin")
        if (
            origin
            and _is_origin_allowed(origin)
            and request_headers.get("access-control-request-private-network") == "true"
        ):
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    CustomCORSMiddleware.is_valid_origin = is_valid_origin
    CustomCORSMiddleware.preflight_response = preflight_response
    CustomCORSMiddleware._tools_cors_patch_installed = True


_install_tools_cors_patch()
PY
}

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
HAS_NVIDIA=0
if command -v nvidia-smi &>/dev/null; then
  HAS_NVIDIA=1
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

# 先确定该装哪种 PyTorch：有 N 卡 -> CUDA(cu128) 版；否则 -> CPU 版（voxcpm 自带）。
# N 卡时先检测现有 torch：已是 CUDA 版则跳过；是 CPU 版/版本不符则卸载，再装 cu128。
if [[ "${HAS_NVIDIA:-0}" == "1" ]]; then
  step "检测 PyTorch 版本（目标：GPU/cu128）"
  if python3 -c "import torch,sys; sys.exit(0 if torch.version.cuda else 1)" 2>/dev/null; then
    ok "已安装 CUDA 版 PyTorch，跳过"
  else
    if python3 -c "import torch" 2>/dev/null; then
      echo "    检测到非 CUDA 版 PyTorch，正在卸载..."
      python3 -m pip uninstall -y torch torchaudio || true
    fi
    step "安装 GPU 版 PyTorch（cu128，约 2.5GB，请耐心等待）"
    python3 -m pip install torch torchaudio --index-url "$TORCH_CUDA_INDEX" || fail "GPU 版 PyTorch 安装失败"
    ok "GPU 版 PyTorch 安装完成"
  fi
fi

python3 -m pip install voxcpm -i "$PIP_MIRROR" || fail "voxcpm 安装失败"
if [[ -f "$REPO_DIR/requirements.txt" ]]; then
  python3 -m pip install -r "$REPO_DIR/requirements.txt" -i "$PIP_MIRROR" || fail "依赖安装失败"
fi
ok "依赖安装完成"

# ── 6b. 校验 PyTorch GPU 支持（确认 cuda 可用；万一被覆盖成 CPU 版则重装） ────
if [[ "${HAS_NVIDIA:-0}" == "1" ]]; then
  step "校验 PyTorch GPU 支持"
  if python3 -c "import torch,sys; sys.exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
    ok "PyTorch 已启用 GPU (CUDA)"
  else
    echo "    PyTorch 不可用 GPU，重装 cu128 版..."
    python3 -m pip uninstall -y torch torchaudio || true
    python3 -m pip install torch torchaudio --index-url "$TORCH_CUDA_INDEX" || fail "GPU 版 PyTorch 安装失败"
    if python3 -c "import torch,sys; sys.exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
      ok "GPU 版 PyTorch 安装完成，已启用 CUDA"
    else
      echo "    警告: 仍未检测到 CUDA，将以 CPU 模式运行（请检查显卡驱动）"
    fi
  fi
fi

# ── 7. 选择下载源（测速 / 手动） ─────────────────────────────────────────
CHOSEN="$SOURCE"
if [[ "$SOURCE" == "auto" ]]; then
  step "测速选择下载源（基于连接延迟，不代表下载速度）"
  HF_MS=$(measure_latency "https://hf-mirror.com")
  MS_MS=$(measure_latency "https://modelscope.cn")
  hf_str=$([[ "$HF_MS" -ge 99999 ]] && echo "超时" || echo "${HF_MS}ms")
  ms_str=$([[ "$MS_MS" -ge 99999 ]] && echo "超时" || echo "${MS_MS}ms")
  echo "    hf-mirror.com: $hf_str    modelscope.cn: $ms_str"
  if [[ "$HF_MS" -ge 99999 && "$MS_MS" -ge 99999 ]]; then
    echo "    两个源均不可达，回退 HF 镜像"
    CHOSEN="hf"
  elif (( MS_MS < HF_MS )); then CHOSEN="ms"; else CHOSEN="hf"; fi
  ok "已选择下载源：$CHOSEN"
fi

# ── 8. 准备模型（按下载源分两条路径） ─────────────────────────────────────
if [[ "$CHOSEN" == "ms" ]]; then
  MS_ID=$(ms_id_for "$MODEL_VARIANT")
  LOCAL_DIR="$MODEL_PATH/pretrained_models/$MODEL_VARIANT"
  step "通过 ModelScope 下载 $MS_ID 到 $LOCAL_DIR"
  python3 -m pip install modelscope -i "$PIP_MIRROR" || fail "modelscope 安装失败"
  python3 -c "from modelscope import snapshot_download; snapshot_download('$MS_ID', local_dir='$LOCAL_DIR')" || fail "ModelScope 下载失败"
  ok "模型已下载到本地"
  LAUNCH_ID="$LOCAL_DIR"
else
  export HF_ENDPOINT="$HF_MIRROR"
  LAUNCH_ID="$HF_ID"
fi

# ── 9. 启动 Gradio 服务 ────────────────────────────────────────────────────
step "启动 Gradio 服务（端口 $PORT，模型 $MODEL_VARIANT，来源 $CHOSEN）"
if [[ "$CHOSEN" == "ms" ]]; then
  echo "    使用本地模型: $LAUNCH_ID"
else
  echo "    模型 $LAUNCH_ID 在首次启动时通过 hf-mirror.com 自动下载"
fi
echo "    服务地址: http://127.0.0.1:$PORT"
echo "    按 Ctrl+C 停止服务"
echo
cd "$REPO_DIR"
install_gradio_cors_patch "$REPO_DIR"
export VOXCPM_ALLOWED_BROWSER_ORIGINS="${VOXCPM_ALLOWED_BROWSER_ORIGINS:-*}"
export PYTHONPATH="$REPO_DIR${PYTHONPATH:+:$PYTHONPATH}"
exec python3 app.py --port "$PORT" --model-id "$LAUNCH_ID"
