import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("external_api_test_config.json")
TOKEN_PATH = ROOT_DIR / "key-value-pair.txt"
ENV_PATH = ROOT_DIR / "backend" / ".env"


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_key_value_pairs(path: Path) -> Dict[str, str]:
    pairs: Dict[str, str] = {}
    if not path.exists():
        return pairs
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if key:
            pairs[key] = value
    return pairs


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Config file not found at {CONFIG_PATH}")
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    required = [
        "authorization_formats",
        "allow_mutating",
        "verify_email",
        "task_emails",
        "upload_file_path",
        "api_key_name",
        "api_key_purpose",
    ]
    missing = []
    for key in required:
        value = data.get(key)
        if value is None or value == "" or (key == "task_emails" and not value):
            missing.append(key)
    if missing:
        raise ValueError(f"Missing required config fields: {', '.join(missing)}")
    if not isinstance(data.get("authorization_formats"), list) or not data["authorization_formats"]:
        raise ValueError("authorization_formats must be a non-empty list")
    return data


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if not path.is_absolute():
        return ROOT_DIR / path
    return path


SENSITIVE_KEYS = {"authorization", "token", "key", "api_key", "apikey"}


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned: Dict[str, Any] = {}
        for key, item in value.items():
            key_lower = str(key).lower()
            if key_lower in SENSITIVE_KEYS:
                cleaned[key] = "REDACTED"
            else:
                cleaned[key] = redact(item)
        return cleaned
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def build_auth_header(token: str, mode: str) -> str:
    if mode == "bearer":
        return f"Bearer {token}"
    if mode == "raw":
        return token
    raise ValueError(f"Unsupported authorization format: {mode}")


def parse_response(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text


def log_response(logger: logging.Logger, label: str, resp: httpx.Response, body: Any) -> None:
    logger.info("external_api.response", extra={"label": label, "status": resp.status_code, "ok": resp.is_success})
    redacted = redact(body)
    if isinstance(redacted, str):
        snippet = redacted[:400]
    else:
        snippet = json.dumps(redacted, ensure_ascii=False)[:400]
    logger.debug("external_api.response_body", extra={"label": label, "snippet": snippet})


def request(
    client: httpx.Client,
    label: str,
    method: str,
    path: str,
    json_body: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    resp = client.request(method, path, json=json_body, files=files, data=data)
    body = parse_response(resp)
    log_response(logging.getLogger("external_api_test"), label, resp, body)
    return {"status": resp.status_code, "ok": resp.is_success, "body": body}


def probe_authorization_format(base_url: str, token: str, formats: List[str], timeout: float) -> str:
    logger = logging.getLogger("external_api_test")
    results: Dict[str, int] = {}
    for mode in formats:
        header_value = build_auth_header(token, mode)
        with httpx.Client(base_url=base_url, headers={"Authorization": header_value}, timeout=timeout) as client:
            resp = client.get("/tasks")
        results[mode] = resp.status_code
        logger.info("external_api.auth_probe", extra={"mode": mode, "status": resp.status_code})
    for mode in formats:
        if results.get(mode, 0) < 400:
            return mode
    raise RuntimeError(f"No authorization format succeeded. Results: {results}")


def main() -> int:
    load_env_file(ENV_PATH)
    configure_logging(os.environ.get("EXTERNAL_API_TEST_LOG_LEVEL", "INFO"))
    logger = logging.getLogger("external_api_test")

    config = load_config()
    pairs = load_key_value_pairs(TOKEN_PATH)
    token = pairs.get("value")
    if not token:
        logger.error("missing_user_token", extra={"path": str(TOKEN_PATH)})
        return 1

    base_url = os.environ.get("EMAIL_API_BASE_URL")
    if not base_url:
        logger.error("missing_email_api_base_url", extra={"env": "EMAIL_API_BASE_URL"})
        return 1
    base_url = base_url.rstrip("/")

    timeout = float(config.get("timeout_seconds", 60))
    allow_mutating = bool(config.get("allow_mutating"))
    verify_email = config.get("verify_email")
    task_emails = config.get("task_emails")
    upload_file_path = resolve_path(config.get("upload_file_path"))
    api_key_name = config.get("api_key_name")
    api_key_purpose = config.get("api_key_purpose")

    if not upload_file_path.exists():
        logger.error("upload_file_missing", extra={"path": str(upload_file_path)})
        return 1

    auth_mode = probe_authorization_format(base_url, token, config["authorization_formats"], timeout)
    auth_header = build_auth_header(token, auth_mode)
    logger.info("external_api.auth_selected", extra={"mode": auth_mode})

    results: Dict[str, Dict[str, Any]] = {}

    with httpx.Client(base_url=base_url, headers={"Authorization": auth_header}, timeout=timeout) as client:
        results["tasks.list"] = request(client, "tasks.list", "GET", "/tasks")
        results["api_keys.list"] = request(client, "api_keys.list", "GET", "/api-keys")

        if allow_mutating:
            results["verify.post"] = request(
                client,
                "verify.post",
                "POST",
                "/verify",
                json_body={"email": verify_email},
            )

            results["tasks.create"] = request(
                client,
                "tasks.create",
                "POST",
                "/tasks",
                json_body={"emails": task_emails},
            )

            task_id = None
            created_body = results["tasks.create"].get("body")
            if isinstance(created_body, dict):
                task_id = created_body.get("id") or created_body.get("task_id")

            if task_id:
                results["tasks.detail"] = request(client, "tasks.detail", "GET", f"/tasks/{task_id}")
            else:
                logger.warning("tasks.detail.skipped", extra={"reason": "missing_task_id"})

            upload_name = upload_file_path.name
            upload_bytes = upload_file_path.read_bytes()
            files = {"file": (upload_name, upload_bytes, "text/csv")}
            results["tasks.batch_upload"] = request(
                client,
                "tasks.batch_upload",
                "POST",
                "/tasks/batch/upload",
                files=files,
            )

            results["api_keys.create"] = request(
                client,
                "api_keys.create",
                "POST",
                "/api-keys",
                json_body={"name": api_key_name, "purpose": api_key_purpose},
            )

            api_key_id = None
            created_key_body = results["api_keys.create"].get("body")
            if isinstance(created_key_body, dict):
                api_key_id = created_key_body.get("id") or created_key_body.get("key_id")

            if api_key_id:
                results["api_keys.delete"] = request(
                    client,
                    "api_keys.delete",
                    "DELETE",
                    f"/api-keys/{api_key_id}",
                )
            else:
                logger.warning("api_keys.delete.skipped", extra={"reason": "missing_api_key_id"})
        else:
            logger.info("mutating_endpoints_skipped", extra={"allow_mutating": allow_mutating})

    failed = [name for name, result in results.items() if not result.get("ok")]
    if failed:
        logger.error("external_api.tests_failed", extra={"failed": failed})
        return 1
    logger.info("external_api.tests_ok", extra={"count": len(results)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
