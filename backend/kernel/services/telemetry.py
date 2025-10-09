from contextlib import ExitStack, nullcontext
from typing import Optional

from django.conf import settings

from documents.models import Document, Section

if settings.USE_PHOENIX:
    from openinference.instrumentation import using_metadata, using_session, using_user
    from openinference.instrumentation.langchain import LangChainInstrumentor
    from phoenix.otel import register
    from phoenix.trace import using_project


def instrument_telemetry():
    if settings.USE_PHOENIX:
        tracer_provider = register()
        LangChainInstrumentor().instrument(tracer_provider=tracer_provider)


def telemetry(document: Document, section: Optional[Section], task: str):
    if settings.USE_PHOENIX:
        phoenix_attributes = using_metadata(
            {
                "user": document.created_by.username,
                "template": document.template_name,
                "section": section.title if section else None,
                "document_id": str(document.id),
                "section_id": str(section.id) if section else None,
                "task": task,
            }
        )
        phoenix_session = using_session(str(document.id))
        phoenix_user = using_user(document.created_by.username)
        phoenix_project = using_project(document.template_name)
    else:
        phoenix_attributes = nullcontext()
        phoenix_session = nullcontext()
        phoenix_user = nullcontext()
        phoenix_project = nullcontext()

    with ExitStack() as stack:
        stack.enter_context(phoenix_attributes)
        stack.enter_context(phoenix_project)
        stack.enter_context(phoenix_session)
        stack.enter_context(phoenix_user)
        return stack.pop_all()
