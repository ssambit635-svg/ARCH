"""Credential storage. Browser/device exchange is not supported by the server yet."""
from .config import load, save


def store_token(token, url):
    data = load()
    data.update(token=token, url=url)
    save(data)
