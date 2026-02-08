import logging
from logging.handlers import TimedRotatingFileHandler

from app.core.logging import configure_logging


def test_configure_logging_writes_file(tmp_path):
    log_path = tmp_path / "backend.log"
    root_logger = logging.getLogger()
    uvicorn_loggers = {
        name: logging.getLogger(name) for name in ("uvicorn", "uvicorn.error", "uvicorn.access")
    }
    existing_handlers = list(root_logger.handlers)
    uvicorn_state = {
        name: {
            "handlers": list(logger.handlers),
            "level": logger.level,
            "propagate": logger.propagate,
        }
        for name, logger in uvicorn_loggers.items()
    }
    try:
        for handler in existing_handlers:
            root_logger.removeHandler(handler)
        configure_logging(
            "info",
            log_file_path=str(log_path),
            log_file_when="S",
            log_file_interval=1,
            log_file_backup_count=1,
        )
        logger = logging.getLogger("logging.test")
        logger.info("file logging test")
        for handler in logging.getLogger().handlers:
            flush = getattr(handler, "flush", None)
            if callable(flush):
                flush()
        contents = log_path.read_text(encoding="utf-8")
        assert "file logging test" in contents
        assert any(isinstance(handler, TimedRotatingFileHandler) for handler in logging.getLogger().handlers)
        for logger in uvicorn_loggers.values():
            assert any(isinstance(handler, TimedRotatingFileHandler) for handler in logger.handlers)
    finally:
        for handler in list(root_logger.handlers):
            root_logger.removeHandler(handler)
            close = getattr(handler, "close", None)
            if callable(close):
                close()
        for handler in existing_handlers:
            root_logger.addHandler(handler)
        for name, logger in uvicorn_loggers.items():
            for handler in list(logger.handlers):
                logger.removeHandler(handler)
                close = getattr(handler, "close", None)
                if callable(close):
                    close()
            state = uvicorn_state[name]
            logger.setLevel(state["level"])
            logger.propagate = state["propagate"]
            for handler in state["handlers"]:
                logger.addHandler(handler)
