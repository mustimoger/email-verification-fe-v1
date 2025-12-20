import logging
import sys
from logging.handlers import TimedRotatingFileHandler
from typing import Optional


def _build_file_handler(
    *,
    path: str,
    when: str,
    interval: int,
    backup_count: int,
    formatter: logging.Formatter,
) -> TimedRotatingFileHandler:
    handler = TimedRotatingFileHandler(
        path,
        when=when,
        interval=interval,
        backupCount=backup_count,
        encoding="utf-8",
        delay=True,
        utc=True,
    )
    handler.setFormatter(formatter)
    return handler


def _normalize_backup_count(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    if value <= 0:
        raise ValueError("LOG_FILE_BACKUP_COUNT must be greater than zero")
    return value


def _normalize_interval(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    if value <= 0:
        raise ValueError("LOG_FILE_INTERVAL must be greater than zero")
    return value


def configure_logging(
    level: str = "info",
    *,
    log_file_path: Optional[str] = None,
    log_file_when: Optional[str] = None,
    log_file_interval: Optional[int] = None,
    log_file_backup_count: Optional[int] = None,
) -> None:
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    handlers = [stream_handler]
    if log_file_path is not None or log_file_when is not None:
        if not log_file_path or not log_file_when:
            raise ValueError("LOG_FILE_PATH and LOG_FILE_WHEN are required together")
        interval = _normalize_interval(log_file_interval)
        backup_count = _normalize_backup_count(log_file_backup_count)
        if interval is None or backup_count is None:
            raise ValueError("LOG_FILE_INTERVAL and LOG_FILE_BACKUP_COUNT are required with file logging")
        handlers.append(
            _build_file_handler(
                path=log_file_path,
                when=log_file_when,
                interval=interval,
                backup_count=backup_count,
                formatter=formatter,
            )
        )
    logging.basicConfig(level=numeric_level, handlers=handlers)
