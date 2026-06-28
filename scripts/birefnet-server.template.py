import argparse
import base64
import io
from contextlib import nullcontext
from threading import Condition, Lock, Thread

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

MODEL_ID = "__MODEL_ID__"
REQUESTED_DEVICE = "__DEVICE__"


def normalize_requested_device(value):
    normalized = str(value or "auto").strip().lower()
    if normalized in ("auto", "cuda", "cpu"):
        return normalized
    return "auto"


def resolve_device(requested_device):
    normalized = normalize_requested_device(requested_device)
    if normalized == "cpu":
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = resolve_device(REQUESTED_DEVICE)

app = FastAPI(title="Game Design Tools BiRefNet Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
model = None
model_loading = False
model_error = ""
model_condition = Condition()
inference_lock = Lock()

transform_image = transforms.Compose([
    transforms.Resize((1024, 1024)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class MatteRequest(BaseModel):
    name: str = "image.png"
    image_base64: str


def build_model():
    torch.set_float32_matmul_precision("high")
    loaded = AutoModelForImageSegmentation.from_pretrained(MODEL_ID, trust_remote_code=True)
    loaded.to(DEVICE)
    if DEVICE == "cpu":
        loaded.float()
    loaded.eval()
    return loaded


def store_model_result(loaded=None, error=None):
    global model, model_loading, model_error
    with model_condition:
        if loaded is not None:
            model = loaded
            model_error = ""
        elif error is not None:
            model_error = str(error)
        model_loading = False
        model_condition.notify_all()


def load_claimed_model():
    try:
        loaded = build_model()
    except Exception as exc:
        store_model_result(error=exc)
        raise
    store_model_result(loaded=loaded)
    return loaded


def get_model():
    global model_loading, model_error
    with model_condition:
        if model is not None:
            return model
        if model_loading:
            while model_loading:
                model_condition.wait(timeout=1)
            if model is not None:
                return model
            if model_error:
                raise RuntimeError(model_error)
        model_loading = True
        model_error = ""
    return load_claimed_model()


def get_model_dtype(loaded_model):
    try:
        return next(loaded_model.parameters()).dtype
    except StopIteration:
        return torch.float32


def inference_context():
    if DEVICE == "cpu":
        return inference_lock
    return nullcontext()


def load_model_background():
    try:
        load_claimed_model()
    except Exception:
        pass


def start_model_load():
    global model_loading, model_error
    with model_condition:
        if model is not None or model_loading:
            return
        model_loading = True
        model_error = ""
    Thread(target=load_model_background, daemon=True).start()


def model_status():
    with model_condition:
        return {
            "ok": model is not None,
            "ready": model is not None,
            "loading": model_loading,
            "error": model_error,
            "requested_device": REQUESTED_DEVICE,
            "device": DEVICE,
            "cuda_available": torch.cuda.is_available(),
            "model": MODEL_ID,
        }


@app.get("/health")
def health():
    status = model_status()
    status["ok"] = True
    return status


@app.get("/ready")
def ready():
    start_model_load()
    return model_status()


@app.post("/matte")
def matte(req: MatteRequest):
    try:
        raw = base64.b64decode(req.image_base64)
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"图片读取失败: {exc}") from exc

    try:
        with inference_context():
            active_model = get_model()
            input_tensor = transform_image(image).unsqueeze(0)
            input_tensor = input_tensor.to(device=DEVICE, dtype=get_model_dtype(active_model))
            with torch.no_grad():
                pred = active_model(input_tensor)[-1].sigmoid().to(torch.float32).cpu()[0].squeeze()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BiRefNet 推理失败: {exc}") from exc

    mask = transforms.ToPILImage()(pred).resize(image.size)
    output = image.copy()
    output.putalpha(mask)
    buffer = io.BytesIO()
    output.save(buffer, format="PNG")
    return {
        "name": req.name,
        "width": image.width,
        "height": image.height,
        "image_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=17860)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default=REQUESTED_DEVICE)
    args = parser.parse_args()
    REQUESTED_DEVICE = normalize_requested_device(args.device)
    DEVICE = resolve_device(REQUESTED_DEVICE)
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=args.port)
