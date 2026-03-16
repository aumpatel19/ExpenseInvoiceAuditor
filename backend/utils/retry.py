import asyncio
import functools
import logging
from typing import Callable, Type, Tuple

logger = logging.getLogger(__name__)


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry=None,
):
    """
    Async retry decorator with exponential backoff.
    Captures structured error info on each attempt.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            attempt = 0
            current_delay = delay
            last_exc = None

            while attempt < max_attempts:
                try:
                    return await func(*args, **kwargs)
                except exceptions as exc:
                    attempt += 1
                    last_exc = exc
                    logger.warning(
                        f"[Retry] {func.__name__} attempt {attempt}/{max_attempts} failed: {exc}"
                    )
                    if on_retry:
                        try:
                            on_retry(attempt, exc)
                        except Exception:
                            pass
                    if attempt < max_attempts:
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff

            raise last_exc

        return wrapper
    return decorator


def sync_retry(
    max_attempts: int = 3,
    delay: float = 0.5,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """Sync version for use in non-async contexts (e.g., OCR calls)."""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            import time
            attempt = 0
            current_delay = delay
            last_exc = None

            while attempt < max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    attempt += 1
                    last_exc = exc
                    logger.warning(
                        f"[SyncRetry] {func.__name__} attempt {attempt}/{max_attempts} failed: {exc}"
                    )
                    if attempt < max_attempts:
                        time.sleep(current_delay)
                        current_delay *= backoff

            raise last_exc

        return wrapper
    return decorator
