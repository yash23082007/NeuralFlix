import sys
import subprocess
import os
import logging

logger = logging.getLogger("WSL_RESOLVER")

def resolve_wsl_url(url: str) -> str:
    if not url:
        return url
    if sys.platform == "win32" and ("localhost" in url or "127.0.0.1" in url):
        try:
            # Execute command to get WSL IP address
            wsl_ip = subprocess.check_output('wsl hostname -I', shell=True, text=True).strip().split()[0]
            if wsl_ip:
                resolved = url.replace("localhost", wsl_ip).replace("127.0.0.1", wsl_ip)
                logger.info(f"Resolved WSL URL: {url} -> {resolved}")
                return resolved
        except Exception as e:
            logger.warning(f"Failed to resolve WSL IP: {e}")
    return url
