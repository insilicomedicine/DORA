from typing import Optional

from base.storage.blob import BlobStorage


class MermaidBlob(BlobStorage):
    """Azure Blob 版的 Mermaid 图存取封装，与原 MermaidS3 接口保持类似。"""

    png_template = "mermaid/png_{pk}.png"

    def put_png(self, mermaid_diagram_pk, content) -> None:
        return self.put_file(
            key=self.png_template.format(pk=mermaid_diagram_pk),
            content=content,
            overwrite=True,
        )

    def get_png(self, mermaid_diagram_pk) -> Optional[bytes]:
        key = self.png_template.format(pk=mermaid_diagram_pk)
        if self.key_exists(key):
            return self.get_file_contents(key)
        return None
