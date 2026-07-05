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
MODEL_ACCESS_READY = False
LAST_MODEL_ACCESS_PROBE = 0.0
LAST_MODEL_ACCESS_ERROR = ""


class GenerateRequest(BaseModel):
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


def probe_model_access(force: bool = False) -> tuple[bool, str]:
    global LAST_MODEL_ACCESS_ERROR, LAST_MODEL_ACCESS_PROBE, MODEL_ACCESS_READY
    if MODEL_ACCESS_READY:
        return True, ""

    now = time.time()
    if (
        not force
        and LAST_MODEL_ACCESS_ERROR
        and now - LAST_MODEL_ACCESS_PROBE < MODEL_ACCESS_PROBE_TTL_SECONDS
    ):
        return False, LAST_MODEL_ACCESS_ERROR

    repo_id = MODEL_REPOS.get(MODEL_ID)
    if not repo_id:
        LAST_MODEL_ACCESS_PROBE = now
        LAST_MODEL_ACCESS_ERROR = f"Stable Audio 3 不支持的模型：{MODEL_ID}"
        return False, LAST_MODEL_ACCESS_ERROR

    try:
        hf_hub_download(repo_id=repo_id, filename=MODEL_CONFIG_FILE, etag_timeout=10)
        MODEL_ACCESS_READY = True
        LAST_MODEL_ACCESS_ERROR = ""
        LAST_MODEL_ACCESS_PROBE = now
        return True, ""
    except Exception as exc:
        LAST_MODEL_ACCESS_PROBE = now
        LAST_MODEL_ACCESS_ERROR = stable_audio_error_message(exc)
        return False, LAST_MODEL_ACCESS_ERROR


@app.get("/health")
def health():
    ready, message = probe_model_access()
    if not ready:
        raise HTTPException(status_code=503, detail=message)
    return {"ok": True, "model": MODEL_ID, "ready": True}


@app.post("/generate")
def generate(request: GenerateRequest):
    file_id = f"sound-{int(time.time() * 1000)}"
    output_path = OUTPUT_DIR / f"{file_id}.wav"
    seconds = max(1.0, min(float(request.durationSeconds), 380.0))
    command = [
        "uv",
        "run",
        "stable-audio",
        "--model",
        MODEL_ID,
        "-p",
        request.prompt,
        "--duration",
        str(seconds),
        "-o",
        str(output_path),
    ]
    if request.seed is not None:
        command.extend(["--seed", str(request.seed)])
    ready, message = probe_model_access(force=True)
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
            detail=stable_audio_error_message(command_output or f"stable-audio exited with {completed.returncode}"),
        )
    return {
        "id": file_id,
        "name": request.outputName or file_id,
        "audioUrl": f"/outputs/{output_path.name}",
        "audioPath": str(output_path),
        "prompt": request.prompt,
        "durationSeconds": seconds,
        "seed": request.seed,
        "model": MODEL_ID,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/outputs/{file_name}")
def output_file(file_name: str):
    return FileResponse(OUTPUT_DIR / file_name, media_type="audio/wav")
