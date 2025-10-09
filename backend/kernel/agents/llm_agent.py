from langchain_core.output_parsers import StrOutputParser

from kernel.chat_models.utils import init_llm


class LLMAgent:
    def __init__(self) -> None:
        self.llm = init_llm()
        self.parser = StrOutputParser()
