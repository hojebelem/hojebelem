"""
Downloader de imagens de eventos da Sympla.

Baixa a imagem de capa (tamanho 'lg') e salva localmente no diretorio de
uploads. O site hojebelem serve arquivos estaticos de public/uploads/.
"""
import os
import re
from urllib.parse import urlparse

import requests

try:
    from shared import CHUNK_BYTES, HTTP_TIMEOUT, MAX_RESPONSE_BYTES
except ImportError:
    from .shared import CHUNK_BYTES, HTTP_TIMEOUT, MAX_RESPONSE_BYTES

ALLOWED_HOST = "images.sympla.com.br"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._-]")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/126.0.0.0 Safari/537.36"
}


def download_image(url: str, dest_dir: str) -> str:
    """Baixa uma imagem da Sympla e salva no diretorio de destino.

    Args:
        url: URL https de images.sympla.com.br (ex: ...-lg.jpg)
        dest_dir: diretorio onde salvar (deve existir)

    Returns:
        caminho absoluto do arquivo salvo, ou string vazia se falhar
    """
    if not url:
        return ""

    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST:
        return ""

    raw_name = os.path.basename(parsed.path)
    filename = SAFE_FILENAME_RE.sub("_", raw_name).lstrip(".")
    if not filename:
        return ""

    base_dir = os.path.realpath(dest_dir)
    dest = os.path.realpath(os.path.join(base_dir, filename))
    if not dest.startswith(base_dir + os.sep):
        return ""

    try:
        with requests.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT, stream=True) as resp:
            resp.raise_for_status()
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if content_type and content_type not in ALLOWED_CONTENT_TYPES:
                return ""

            body = bytearray()
            for chunk in resp.iter_content(chunk_size=CHUNK_BYTES):
                body.extend(chunk)
                if len(body) > MAX_RESPONSE_BYTES:
                    return ""
    except requests.RequestException:
        return ""

    with open(dest, "wb") as f:
        f.write(body)
    return dest
