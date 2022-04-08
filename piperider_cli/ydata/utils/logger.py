"Data Quality logger functions"
import logging
import os
import sys
from logging import _nameToLevel
from typing import TextIO

# Default vars for the logger
NAME = os.getenv('DQ_LOGGER_NAME', 'DQ_Logger')


def get_logger(name, stream: TextIO = sys.stdout, level: str = logging.INFO):
    "Returns a logger instance. Will not create another if one with the same name already exists."
    acceptable_levels = [None] + list(_nameToLevel.keys())
    assert level in acceptable_levels, f"Valid levels for warning severity are {acceptable_levels}. \
      Defaults to info level."
    if not level:
        level = logging.INFO  # Default threshold

    handler = logging.StreamHandler(stream)
    handler.setFormatter(
        logging.Formatter("%(levelname)s | %(message)s")
    )

    logger = logging.getLogger(name)
    logger.setLevel(level)

    if len(logger.handlers) == 0:
        logger.addHandler(handler)

    logger.propagate = False

    return logger
