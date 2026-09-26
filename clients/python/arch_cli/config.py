import json
import os
from pathlib import Path

PATH = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "arch" / "credentials"


def load():
    if not PATH.exists():
        return {}
    if PATH.stat().st_mode & 0o077:
        raise ValueError(f"Insecure permissions on {PATH}; run chmod 600 {PATH}")
    return json.loads(PATH.read_text())


def save(config):
    PATH.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(config, stream)
    PATH.chmod(0o600)
