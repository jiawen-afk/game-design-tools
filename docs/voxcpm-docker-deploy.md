# VoxCPM Docker 部署文档（国内镜像源）

本文面向 [OpenBMB/VoxCPM](https://github.com/OpenBMB/VoxCPM) 的 Web Demo 私有部署。官方仓库说明中，VoxCPM 需要 Python 3.10 到 3.12、PyTorch 2.5 及以上，CUDA 环境建议 12.0 及以上；Web Demo 通过 `python app.py --port 8808` 启动，可选 `--model-id` 指定模型（本地路径或 HuggingFace 仓库 ID，默认 `openbmb/VoxCPM2`）。设备由 app.py 启动时自动选择（检测到 CUDA 用 GPU，否则回退 CPU）。

## 目标

- 使用 Docker 构建 VoxCPM Web Demo。
- 使用国内 apt、pip、Hugging Face 镜像源，减少下载失败。
- 暴露 `8808` 端口，便于在本机或私有局域网直接访问。
- 挂载模型缓存目录，避免每次重建或重启重复下载模型。

## 前置条件

GPU 部署建议使用 NVIDIA 显卡，并安装：

- NVIDIA 驱动
- Docker Engine
- Docker Compose V2
- NVIDIA Container Toolkit

验证 GPU 容器能力：

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

如果只做 CPU 测试，可以把 compose 中的 GPU 配置删掉。app.py 检测不到 CUDA 时会自动回退 CPU。CPU 推理会很慢，不建议作为长期私用方案。

## 建议目录结构

先克隆 VoxCPM：

```bash
git clone https://github.com/OpenBMB/VoxCPM.git
cd VoxCPM
```

在 VoxCPM 仓库根目录新增：

```text
VoxCPM/
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Dockerfile

```dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app

ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}
ENV PIP_NO_CACHE_DIR=1
ENV HF_ENDPOINT=https://hf-mirror.com
ENV HF_HOME=/root/.cache/huggingface
ENV MODELSCOPE_CACHE=/root/.cache/modelscope
ENV TOKENIZERS_PARALLELISM=false
ENV PYTHONUNBUFFERED=1

# 使用清华 Ubuntu 镜像源，并安装音频处理依赖。
RUN sed -i 's@http://archive.ubuntu.com/ubuntu@https://mirrors.tuna.tsinghua.edu.cn/ubuntu@g' /etc/apt/sources.list \
    && sed -i 's@http://security.ubuntu.com/ubuntu@https://mirrors.tuna.tsinghua.edu.cn/ubuntu@g' /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ffmpeg \
        git \
        libsndfile1 \
        sox \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# 如果构建上下文没有 .git，给 setuptools_scm 一个固定版本兜底。
ENV SETUPTOOLS_SCM_PRETEND_VERSION=0.0.0

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -e .

EXPOSE 8808

CMD ["python", "app.py", "--port", "8808"]
```

## docker-compose.yml

局域网私用时，使用 `8808:8808` 暴露端口，访问地址为 `http://服务器IP:8808`。

```yaml
services:
  voxcpm:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        PIP_INDEX_URL: https://pypi.tuna.tsinghua.edu.cn/simple
        PIP_TRUSTED_HOST: pypi.tuna.tsinghua.edu.cn
    image: voxcpm:web-demo
    container_name: voxcpm-web-demo
    restart: unless-stopped
    ports:
      - "8808:8808"
    environment:
      HF_ENDPOINT: https://hf-mirror.com
      HF_HOME: /root/.cache/huggingface
      MODELSCOPE_CACHE: /root/.cache/modelscope
      TOKENIZERS_PARALLELISM: "false"
    volumes:
      - ./cache/huggingface:/root/.cache/huggingface
      - ./cache/modelscope:/root/.cache/modelscope
      - ./outputs:/app/outputs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

如果只允许本机访问，不希望局域网其他机器直接访问，把端口改成：

```yaml
ports:
  - "127.0.0.1:8808:8808"
```

## .dockerignore

```dockerignore
.git
.github
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
cache
outputs
pretrained_models
```

## 构建和启动

```bash
docker compose build
docker compose up -d
```

查看日志：

```bash
docker compose logs -f voxcpm
```

首次启动会下载 `openbmb/VoxCPM2` 以及 ASR 相关模型，耗时取决于网络和磁盘速度。缓存会保存在：

```text
./cache/huggingface
./cache/modelscope
```

## 访问

本机访问：

```text
http://127.0.0.1:8808
```

私有局域网访问：

```text
http://服务器IP:8808
```

如果是云服务器，记得在安全组或防火墙中只放行可信 IP。Gradio Demo 默认没有登录鉴权，不建议直接暴露到公网。

## 常用运维命令

停止：

```bash
docker compose down
```

重启：

```bash
docker compose restart voxcpm
```

更新 VoxCPM 后重新构建：

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

进入容器：

```bash
docker compose exec voxcpm bash
```

## 国内镜像源说明

本方案使用了以下国内或国内友好的加速点：

- apt：`https://mirrors.tuna.tsinghua.edu.cn/ubuntu`
- pip：`https://pypi.tuna.tsinghua.edu.cn/simple`
- Hugging Face：`https://hf-mirror.com`
- ModelScope：通过 `MODELSCOPE_CACHE` 持久化缓存

如果 Docker Hub 拉取 `pytorch/pytorch` 很慢，可以在宿主机配置 Docker Registry Mirror。示例：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
```

Linux 上通常保存到：

```text
/etc/docker/daemon.json
```

修改后重启 Docker：

```bash
sudo systemctl restart docker
```

## 验证

容器启动后验证首页：

```bash
curl -I http://127.0.0.1:8808
```

预期看到：

```text
HTTP/1.1 200 OK
```

验证 GPU 是否被容器识别：

```bash
docker compose exec voxcpm python - <<'PY'
import torch
print("cuda_available:", torch.cuda.is_available())
print("cuda_device_count:", torch.cuda.device_count())
if torch.cuda.is_available():
    print("device_name:", torch.cuda.get_device_name(0))
PY
```

## 排错

如果容器启动后模型下载失败：

- 确认 `HF_ENDPOINT=https://hf-mirror.com` 已传入容器。
- 删除损坏缓存后重启：`rm -rf cache/huggingface cache/modelscope && docker compose up -d`。
- 如果仍失败，可先在宿主机手动下载模型，再挂载到容器并用 `--model-id /app/pretrained_models/VoxCPM2` 启动。

如果提示没有 GPU：

- 先在宿主机运行 `nvidia-smi`。
- 再运行 `docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`。
- 确认安装了 NVIDIA Container Toolkit。

如果端口无法访问：

- 确认 `docker compose ps` 中 `0.0.0.0:8808->8808/tcp` 已显示。
- 确认服务器防火墙或云安全组放行 `8808`。
- 如果只绑定了 `127.0.0.1:8808:8808`，局域网机器无法访问，这是预期行为。
