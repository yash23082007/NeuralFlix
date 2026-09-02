"""
Movie Intelligence Platform — Rate Limiter

Singleton rate limiter instance. Separated from main.py to break the
circular import chain (main → auth router → main.limiter).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
