from types import SimpleNamespace

from app.services import supabase_client


def test_get_storage_returns_property(monkeypatch):
    fake_storage = SimpleNamespace(marker="storage-client")

    class FakeClient:
        def __init__(self):
            self.storage = fake_storage

    monkeypatch.setattr(
        supabase_client,
        "create_client",
        lambda url, key: FakeClient(),
    )
    monkeypatch.setattr(
        supabase_client,
        "get_settings",
        lambda: SimpleNamespace(supabase_url="http://example.com", supabase_service_role_key="service-key"),
    )
    supabase_client.get_supabase.cache_clear()
    try:
        storage = supabase_client.get_storage()
        assert storage is fake_storage
    finally:
        supabase_client.get_supabase.cache_clear()
