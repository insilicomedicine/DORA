import base64
import json
import logging
import zlib
from typing import Optional, Tuple

import requests

from app import settings

logger = logging.getLogger(__name__)


def encode_mermaid_graph(graph: str):
    graphbytes = graph.encode("utf-8")
    base64_bytes = base64.b64encode(graphbytes)
    base64_string = base64_bytes.decode("utf-8")
    return base64_string


def convert_mermaid_graph_to_svg(mermaid_graph: str) -> Tuple[Optional[str], Optional[str]]:
    base64_string = encode_mermaid_graph(mermaid_graph)
    result, error_message = None, None
    try:
        response = requests.get(
            url=f"{settings.MERMAID_SERVER_URL}/svg/{base64_string}",
            timeout=settings.EXTERNAL_API_MAX_REQUEST_TIMEOUT,
        )
    except Exception as exp:
        logger.error(f"Error fetching mermaid image: {exp}. {mermaid_graph=}")
        return result, str(exp)

    if response.status_code == 200:
        result = response.text
    else:
        error_message = response.text

    return result, error_message


def get_mermaid_image(mermaid_graph: str) -> bytes:
    base64_string = encode_mermaid_graph(mermaid_graph)

    try:
        response = requests.get(
            url=f"{settings.MERMAID_SERVER_URL}/img/{base64_string}?type=png",
            timeout=settings.EXTERNAL_API_MAX_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.content
    except requests.RequestException as e:
        logger.error(f"Error fetching mermaid image: {e}")
        return b""


class MermaidGenerationNotSuccessfulError(Exception):
    pass


def pako_deflate(data: bytes) -> bytes:
    compress = zlib.compressobj(9, zlib.DEFLATED, 15, 8, zlib.Z_DEFAULT_STRATEGY)
    compressed_data = compress.compress(data)
    compressed_data += compress.flush()
    return compressed_data


def gen_pako_link(graph_markdown: str) -> str:
    j_graph = {"code": graph_markdown, "mermaid": {"theme": "default"}}
    byte_data = json.dumps(j_graph).encode("utf-8")
    deflated = pako_deflate(byte_data)
    encoded = base64.b64encode(deflated).decode("ascii")
    return f"http://mermaid.live/edit#pako:{encoded}"
