import logging
from typing import Dict, Optional

from slugify import slugify

from ..clients.external import ExternalAPIClient, ListAPIKeysResponse, CreateAPIKeyResponse, RevokeAPIKeyResponse
from .supabase_client import get_supabase

logger = logging.getLogger(__name__)

\n+def cache_api_key(user_id: str, key_id: str, name: str) -> None:\n+    sb = get_supabase()\n+    try:\n+        sb.table(\"cached_api_keys\").upsert(\n+            {\"user_id\": user_id, \"key_id\": key_id, \"name\": name}, on_conflict=\"key_id\"\n+        ).execute()\n+        logger.info(\"api_keys.cached\", extra={\"user_id\": user_id, \"key_id\": key_id})\n+    except Exception as exc:\n+        logger.error(\"api_keys.cache_failed\", extra={\"error\": str(exc), \"user_id\": user_id, \"key_id\": key_id})\n+\n+\n+def list_cached_keys(user_id: str) -> list[Dict[str, str]]:\n+    sb = get_supabase()\n+    res = sb.table(\"cached_api_keys\").select(\"key_id,name\").eq(\"user_id\", user_id).execute()\n+    return res.data or []\n*** End Patch
