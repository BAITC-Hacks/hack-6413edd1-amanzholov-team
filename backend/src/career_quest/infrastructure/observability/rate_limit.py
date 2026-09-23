from collections import deque
from time import monotonic

from career_quest.shared.domain.core import BusinessError


class RateLimiter:
    """Per-process sliding window; deploy one API worker for this MVP."""

    def __init__(self) -> None:
        self.buckets: dict[str, deque[float]] = {}

    def check(self, key: str, limit: int, period: float = 60) -> None:
        now = monotonic()
        if len(self.buckets) >= 10000:
            self.buckets = {
                k: v
                for k, v in self.buckets.items()
                if v and v[-1] > now - period
            }
            if len(self.buckets) >= 10000 and key not in self.buckets:
                raise BusinessError("rate_limited", 429)
        bucket = self.buckets.setdefault(key, deque())
        while bucket and bucket[0] <= now - period:
            bucket.popleft()
        if len(bucket) >= limit:
            raise BusinessError("rate_limited", 429)
        bucket.append(now)
