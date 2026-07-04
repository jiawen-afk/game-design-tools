from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()
MODEL_ID = os.environ.get("STABLE_AUDIO_MODEL", "small-sfx")
OUTPUT_DIR = Path(os.environ.get("STABLE_AUDIO_OUTPUT_DIR", "outputs"))
REPO_DIR = Path(os.environ.get("STABLE_AUDIO_REPO_DIR", "."))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class GenerateRequest(BaseModel):
    prompt: str
    durationSeconds: float
    seed: int | None = None
    outputName: str = "sound-effect"


@app.get("/health")
def health():
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
    subprocess.run(command, cwd=str(REPO_DIR), check=True)
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
