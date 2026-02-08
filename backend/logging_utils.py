import json
import logging
from datetime import datetime


def _log(logger: logging.Logger, level: str, event: str, **fields):
    payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event": event,
        **fields,
    }
    message = json.dumps(payload, default=str)
    if level == "error":
        logger.error(message)
    else:
        logger.info(message)


def log_info(logger: logging.Logger, event: str, **fields):
    _log(logger, "info", event, **fields)


def log_error(logger: logging.Logger, event: str, **fields):
    _log(logger, "error", event, **fields)
