import os
import tempfile
import time
from datetime import datetime, timedelta, timezone

import pytest

from app.services import retention


def test_retention_deletes_old_when_no_credits(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        user_dir = os.path.join(tmpdir, "user1")
        os.makedirs(user_dir, exist_ok=True)
        file_path = os.path.join(user_dir, "old.txt")
        with open(file_path, "w") as f:
            f.write("data")
        old_ts = time.time() - (190 * 24 * 3600)
        os.utime(file_path, (old_ts, old_ts))

        monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
        monkeypatch.setenv("EMAIL_API_KEY", "key")
        monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
        monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
        monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
        monkeypatch.setenv("UPLOAD_RETENTION_DAYS", "180")
        monkeypatch.setenv("UPLOAD_RETENTION_WHEN_CREDITS", "non_zero")

        monkeypatch.setattr(retention, "_uploads_root", lambda: __import__("pathlib").Path(tmpdir))
        monkeypatch.setattr(retention, "fetch_credits", lambda user_id: 0)

        deleted = retention.purge_expired_uploads()
        assert deleted == [("user1", "old.txt")]
        assert not os.path.exists(file_path)


def test_retention_keeps_recent_when_has_credits(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        user_dir = os.path.join(tmpdir, "user1")
        os.makedirs(user_dir, exist_ok=True)
        file_path = os.path.join(user_dir, "recent.txt")
        with open(file_path, "w") as f:
            f.write("data")
        recent_ts = time.time()
        os.utime(file_path, (recent_ts, recent_ts))

        monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
        monkeypatch.setenv("EMAIL_API_KEY", "key")
        monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
        monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
        monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
        monkeypatch.setenv("UPLOAD_RETENTION_DAYS", "180")
        monkeypatch.setenv("UPLOAD_RETENTION_WHEN_CREDITS", "non_zero")

        monkeypatch.setattr(retention, "_uploads_root", lambda: __import__("pathlib").Path(tmpdir))
        monkeypatch.setattr(retention, "fetch_credits", lambda user_id: 10)

        deleted = retention.purge_expired_uploads()
        assert deleted == []
        assert os.path.exists(file_path)
