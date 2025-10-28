"""
Mermaid diagram storage factory.
"""

from typing import Optional

from base.storage.factory import get_storage


class MermaidStorage:
    """
    Unified Mermaid storage interface that works with both S3 and Azure Blob Storage.
    """

    png_template = "mermaid/png_{pk}.png"

    def __init__(self):
        self.storage = get_storage()

    def put_png(self, mermaid_diagram_pk, content):
        self.storage.put_file(
            key=self.png_template.format(pk=mermaid_diagram_pk),
            content=content,
            overwrite=True,
        )

    def get_png(self, mermaid_diagram_pk) -> Optional[bytes]:
        key = self.png_template.format(pk=mermaid_diagram_pk)
        if self.storage.key_exists(key):
            return self.storage.get_file_contents(key)
        return None
