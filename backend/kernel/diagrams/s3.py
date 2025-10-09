from typing import Optional

from base.storage.s3 import S3Storage


class MermaidS3(S3Storage):
    png_template = "mermaid/png_{pk}.png"

    def put_png(self, mermaid_diagram_pk, content) -> None:
        return self.put_file(
            key=self.png_template.format(pk=mermaid_diagram_pk),
            content=content,
        )

    def get_png(self, mermaid_diagram_pk) -> Optional[bytes]:
        key = self.png_template.format(pk=mermaid_diagram_pk)
        if self.key_exists(key):
            return self.get_file_contents(key)
        return None
