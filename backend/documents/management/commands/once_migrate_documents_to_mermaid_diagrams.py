from django.core.management.base import BaseCommand

from documents.models import DiagramType, Document, MermaidDiagram
from kernel.diagrams.s3 import MermaidS3
from kernel.diagrams.utils import get_mermaid_image


class Command(BaseCommand):
    help = "Migrate mermaid diagrams from Document table to the separate table"

    def handle(self, *args, **options):
        documents = Document.objects.filter(mermaid_svg_diagram__isnull=False)
        created_count = 0
        for document in documents:
            try:
                diagram_as_png = get_mermaid_image(document.mermaid_code)
                diagram = MermaidDiagram.objects.create(
                    user=document.created_by,
                    document_ref=document,
                    diagram_type=DiagramType.FLOWCHART,
                    svg_diagram=document.mermaid_svg_diagram,
                    mermaid_code=document.mermaid_code,
                )
                MermaidS3().put_png(diagram.id, diagram_as_png)
                document.mermaid_diagram = diagram
                document.save()
                created_count += 1
            except Exception as exp:
                print(document.id, exp)  # noqa

        print(f"Created {created_count} entities in MermaidDiagram.")  # noqa
