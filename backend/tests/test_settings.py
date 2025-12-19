import os

import pytest
from pydantic import ValidationError

from app.core.settings import Settings, get_settings


def test_settings_missing_env_raises(monkeypatch):
    monkeypatch.delenv("EMAIL_API_BASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.delenv("SUPABASE_AUTH_COOKIE_NAME", raising=False)
    with pytest.raises(ValidationError):
        Settings()


def test_settings_loads_with_minimum_env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("UPLOAD_MAX_EMAILS_PER_TASK", "10000")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "25")
    settings = get_settings()
    assert settings.email_api_base_url == "https://api.test"
    assert settings.supabase_auth_cookie_name == "cookie_name"
