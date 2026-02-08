import logging
import sys
from logging.handlers import TimedRotatingFileHandler
from typing import Optional

logger = logging.getLogger(__name__)

_UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access")


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


def _logger_has_file_handler(logger_to_check: logging.Logger, handler: TimedRotatingFileHandler) -> bool:
    for existing in logger_to_check.handlers:
        if existing is handler:
            return True
        if isinstance(existing, TimedRotatingFileHandler):
            existing_path = getattr(existing, "baseFilename", None)
            handler_path = getattr(handler, "baseFilename", None)
            if existing_path and handler_path and existing_path == handler_path:
                return True
    return False


def _attach_file_handler_to_uvicorn(handler: TimedRotatingFileHandler) -> None:
    for logger_name in _UVICORN_LOGGERS:
        uvicorn_logger = logging.getLogger(logger_name)
        if _logger_has_file_handler(uvicorn_logger, handler):
            continue
        uvicorn_logger.addHandler(handler)


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
    root_logger = logging.getLogger()
    file_handler: Optional[TimedRotatingFileHandler] = None
    if log_file_path is not None or log_file_when is not None:
        if not log_file_path or not log_file_when:
            raise ValueError("LOG_FILE_PATH and LOG_FILE_WHEN are required together")
        interval = _normalize_interval(log_file_interval)
        backup_count = _normalize_backup_count(log_file_backup_count)
        if interval is None or backup_count is None:
            raise ValueError("LOG_FILE_INTERVAL and LOG_FILE_BACKUP_COUNT are required with file logging")
        file_handler = _build_file_handler(
            path=log_file_path,
            when=log_file_when,
            interval=interval,
            backup_count=backup_count,
            formatter=formatter,
        )
        handlers.append(file_handler)
        _attach_file_handler_to_uvicorn(file_handler)
    if root_logger.handlers:
        root_logger.setLevel(numeric_level)
        if file_handler and not _logger_has_file_handler(root_logger, file_handler):
            root_logger.addHandler(file_handler)
    else:
        logging.basicConfig(level=numeric_level, handlers=handlers)
    if file_handler:
        logger.info(
            "logging.file_enabled",
            extra={
                "file_path": log_file_path,
                "when": log_file_when,
                "interval": log_file_interval,
                "backup_count": log_file_backup_count,
            },
        )
