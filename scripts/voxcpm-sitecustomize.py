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
