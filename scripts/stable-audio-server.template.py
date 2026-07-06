from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from huggingface_hub import hf_hub_download
from pydantic import BaseModel

app = FastAPI()
MODEL_ID = os.environ.get("STABLE_AUDIO_MODEL", "small-sfx")
OUTPUT_DIR = Path(os.environ.get("STABLE_AUDIO_OUTPUT_DIR", "outputs"))
REPO_DIR = Path(os.environ.get("STABLE_AUDIO_REPO_DIR", "."))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_REPOS = {
    "small-sfx": "stabilityai/stable-audio-3-small-sfx",
    "small-music": "stabilityai/stable-audio-3-small-music",
    "medium": "stabilityai/stable-audio-3-medium",
}
MODEL_CONFIG_FILE = "model_config.json"
MODEL_ACCESS_PROBE_TTL_SECONDS = 15
MODEL_ACCESS_READY = set()
LAST_MODEL_ACCESS_PROBE = {}
LAST_MODEL_ACCESS_ERROR = {}


class GenerateRequest(BaseModel):
    model: str | None = None
    prompt: str
    durationSeconds: float
    seed: int | None = None
    outputName: str = "sound-effect"


def stable_audio_error_message(error: object, model_id: str = MODEL_ID) -> str:
    text = str(error)
    lowered = text.lower()
    repo_id = MODEL_REPOS.get(model_id, model_id)
    model_url = f"https://huggingface.co/{repo_id}"
    if (
        "gatedrepoerror" in lowered
        or "401 unauthorized" in lowered
        or "cannot access gated repo" in lowered
        or "access to model" in lowered
        or "please log in" in lowered
    ):
        return (
            f"Stable Audio 3 模型 {model_id} 需要 HuggingFace 授权后才能下载：{repo_id}\n"
            f"访问链接：{model_url}\n"
            "操作步骤：\n"
            "1. 登录 HuggingFace。\n"
            "2. 打开上面的访问链接，申请或同意模型访问许可。\n"
            "3. 在 Stable Audio 3 安装目录运行：uv run hf auth login\n"
            "4. 回到本工具重新点击“检测依赖和模型”。"
        )
    return f"Stable Audio 3 模型访问检测失败：{text}"


def resolve_request_model(model_id: str | None = None) -> str:
    requested_model = (model_id or MODEL_ID).strip()
    if requested_model not in MODEL_REPOS:
        raise HTTPException(status_code=400, detail=f"Stable Audio 3 不支持的模型：{requested_model}")
    return requested_model


def probe_model_access(model_id: str = MODEL_ID, force: bool = False) -> tuple[bool, str]:
    if model_id in MODEL_ACCESS_READY:
        return True, ""

    now = time.time()
    last_error = LAST_MODEL_ACCESS_ERROR.get(model_id, "")
    last_probe = LAST_MODEL_ACCESS_PROBE.get(model_id, 0.0)
    if (
        not force
        and last_error
        and now - last_probe < MODEL_ACCESS_PROBE_TTL_SECONDS
    ):
        return False, last_error

    repo_id = MODEL_REPOS.get(model_id)
    if not repo_id:
        message = f"Stable Audio 3 不支持的模型：{model_id}"
        LAST_MODEL_ACCESS_PROBE[model_id] = now
        LAST_MODEL_ACCESS_ERROR[model_id] = message
        return False, message

    try:
        hf_hub_download(repo_id=repo_id, filename=MODEL_CONFIG_FILE, etag_timeout=10)
        MODEL_ACCESS_READY.add(model_id)
        LAST_MODEL_ACCESS_ERROR[model_id] = ""
        LAST_MODEL_ACCESS_PROBE[model_id] = now
        return True, ""
    except Exception as exc:
        message = stable_audio_error_message(exc, model_id)
        LAST_MODEL_ACCESS_PROBE[model_id] = now
        LAST_MODEL_ACCESS_ERROR[model_id] = message
        return False, message


@app.get("/health")
def health():
    ready, message = probe_model_access()
    if not ready:
        raise HTTPException(status_code=503, detail=message)
    return {"ok": True, "model": MODEL_ID, "ready": True}


@app.post("/generate")
def generate(request: GenerateRequest):
    request_model = resolve_request_model(request.model)
    file_id = f"sound-{int(time.time() * 1000)}"
    output_path = OUTPUT_DIR / f"{file_id}.wav"
    seconds = max(1.0, min(float(request.durationSeconds), 380.0))
    command = [
        "uv",
        "run",
        "stable-audio",
        "--model",
        request_model,
        "-p",
        request.prompt,
        "--duration",
        str(seconds),
        "-o",
        str(output_path),
    ]
    if request.seed is not None:
        command.extend(["--seed", str(request.seed)])
    ready, message = probe_model_access(request_model, force=True)
    if not ready:
        raise HTTPException(status_code=503, detail=message)

    completed = subprocess.run(command, cwd=str(REPO_DIR), capture_output=True, text=True)
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    if completed.returncode != 0:
        command_output = "\n".join(part for part in [completed.stdout, completed.stderr] if part).strip()
        raise HTTPException(
            status_code=500,
            detail=stable_audio_error_message(
                command_output or f"stable-audio exited with {completed.returncode}",
                request_model,
            ),
        )
    return {
        "id": file_id,
        "name": request.outputName or file_id,
        "audioUrl": f"/outputs/{output_path.name}",
        "audioPath": str(output_path),
        "prompt": request.prompt,
        "durationSeconds": seconds,
        "seed": request.seed,
        "model": request_model,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/outputs/{file_name}")
def output_file(file_name: str):
    return FileResponse(OUTPUT_DIR / file_name, media_type="audio/wav")
