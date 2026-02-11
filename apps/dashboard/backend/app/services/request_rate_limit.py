from collections import defaultdict, deque
from threading import Lock
from time import monotonic

_RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_RATE_LIMIT_LOCK = Lock()


def allow_request(*, bucket_key: str, max_requests: int, window_seconds: int) -> bool:
    if max_requests <= 0 or window_seconds <= 0:
        raise ValueError("max_requests and window_seconds must be greater than zero")

    now = monotonic()
    cutoff = now - window_seconds

    with _RATE_LIMIT_LOCK:
        bucket = _RATE_LIMIT_BUCKETS[bucket_key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= max_requests:
            return False

        bucket.append(now)
        return True


def clear_rate_limit_state() -> None:
    with _RATE_LIMIT_LOCK:
        _RATE_LIMIT_BUCKETS.clear()
