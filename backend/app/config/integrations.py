import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class IntegrationDefinition:
    id: str
    label: str
    description: str
    icon: Optional[str] = None
    default_name: Optional[str] = None


def _default_integrations_path() -> Path:
    # Default to backend/config/integrations.json (one level above app/)
    return Path(__file__).resolve().parents[2] / "config" / "integrations.json"


def _load_integrations(path: Optional[Path] = None) -> List[IntegrationDefinition]:
    config_path = path or _default_integrations_path()
    try:
        with config_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        integrations: List[IntegrationDefinition] = []
        for item in data:
            integrations.append(
                IntegrationDefinition(
                    id=str(item.get("id") or "").strip(),
                    label=str(item.get("label") or "").strip() or str(item.get("id") or "").strip(),
                    description=str(item.get("description") or "").strip(),
                    icon=item.get("icon"),
                    default_name=item.get("default_name"),
                )
            )
        return [i for i in integrations if i.id]
    except Exception as exc:  # noqa: BLE001
        logger.error("integrations.load_failed", extra={"path": str(config_path), "error": str(exc)})
        return []


@lru_cache()
def get_integrations() -> List[IntegrationDefinition]:
    return _load_integrations()


def get_integration_ids() -> List[str]:
    return [integration.id for integration in get_integrations()]
