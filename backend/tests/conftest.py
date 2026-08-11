import os
import pytest

# Disable DEMO_MODE/LITE_MODE so tests hit the real PostgreSQL and Redis (with timeouts)
os.environ.pop("NEURALFLIX_DEMO_MODE", None)
os.environ.pop("LITE_MODE", None)
os.environ["ENABLE_EXPERIMENTAL_ML"] = "false"
                                        