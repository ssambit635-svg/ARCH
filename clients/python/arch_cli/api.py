import httpx
from .config import load


class ApiError(Exception):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


def request(method, path, *, params=None, body=None):
    config = load()
    token = config.get("token")
    if not token:
        raise ApiError("UNAUTHORIZED", "Run arch login first")
    url = config.get("url", "https://arch.example.com").rstrip("/") + "/api/v1/" + path.lstrip("/")
    params = dict(params or {})
    if config.get("organization_id"):
        params["organizationId"] = config["organization_id"]
    try:
        response = httpx.request(method, url, params=params, json=body,
                                 headers={"Authorization": f"Bearer {token}"}, timeout=30)
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ApiError("SERVICE_UNAVAILABLE", str(exc)) from exc
    if response.is_error:
        error = payload.get("error", {})
        raise ApiError(error.get("code", "INTERNAL"), error.get("message", response.reason_phrase))
    return payload["data"]
