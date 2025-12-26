import os
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.core.settings import get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache(monkeypatch):
    # Ensure each test sees fresh env for settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def set_required_limits_env(monkeypatch):
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "25")
    monkeypatch.setenv("LATEST_UPLOADS_LIMIT", "6")
    yield
