import os
import pytest

# Force DEMO_MODE and LITE_MODE during test runs so pytest never blocks on remote PostgreSQL/Redis timeouts
os.environ["NEURALFLIX_DEMO_MODE"] = "true"
os.environ["LITE_MODE"] = "true"
os.environ["ENABLE_EXPERIMENTAL_ML"] = "false"
