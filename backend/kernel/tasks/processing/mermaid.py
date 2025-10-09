import functools
import logging
from typing import List, Optional

import sentry_sdk

from documents.models import DiagramType, Document, MermaidDiagram, Section
from kernel.diagrams.mermaid import generate_mermaid_diagrams
from kernel.diagrams.s3 import MermaidS3
from kernel.diagrams.utils import get_mermaid_image
from kernel.services.telemetry import telemetry
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def generate_mermaid(document: Document, diagram_type: DiagramType) -> Optional[MermaidDiagram]:
    ordered_sections: List[Section] = document.generation_ordered_sections()
    try:
        token_record_callback = functools.partial(
            record_token_usage,
            user=document.created_by,
            model_instance=document,
            usage_type=AITokenUsageType.GEN_MERMAID_DIAGRAM,
        )
        document_content = [section.result.get("data", "") for section in ordered_sections if section.result]
        with telemetry(document=document, section=None, task="generate_mermaid_diagrams"):
            diagram_as_svg, mermaid_code = generate_mermaid_diagrams(
                text="\n".join(document_content),
                diagram_type=diagram_type,
                token_record_callback=token_record_callback,
            )
    except Exception as exp:
        logger.error(f"Error generating mermaid diagram SVG for document ID {document.id}: {exp}")
        sentry_sdk.capture_exception(exp)
        return None

    try:
        diagram = MermaidDiagram.objects.create(
            user=document.created_by,
            document_ref=document,
            diagram_type=diagram_type,
            svg_diagram=diagram_as_svg,
            mermaid_code=mermaid_code,
        )
        document.update_fields({"mermaid_diagram": diagram})
    except Exception as exp:
        sentry_sdk.capture_exception(exp)
        return None

    try:
        diagram_as_png = get_mermaid_image(mermaid_code)
        MermaidS3().put_png(diagram.id, diagram_as_png)
    except Exception as exp:
        logger.error(f"Error generating mermaid diagram PNG for document ID {document.id}: {exp}")
        sentry_sdk.capture_exception(exp)
        return None

    return diagram
