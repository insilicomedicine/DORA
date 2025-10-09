import functools
import logging
from functools import partial
from typing import Dict, List, Optional, Sequence, Tuple

from django.conf import settings
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_community.callbacks.manager import get_openai_callback
from langchain_core.agents import AgentAction as LCAgentAction
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.base import RunnableSequence
from langchain_core.tools import BaseTool
from openai import APITimeoutError

from base.decorators import retry
from base.utils import escape_braces, safe_format
from documents.models import Section
from documents.transparency.transparency_callbacks import TransparencyCallbackHandler
from documents.transparency.utils import update_generation_log
from general.defs import ConfigKeyType
from general.models import Config
from kernel.agents.langchain.callbacks import LogCallbackHandler
from kernel.agents.llm_agent import LLMAgent
from kernel.defs import SYSTEM_PROMPT_FOR_PLAN_GENRATION, AgentAction, AgentResponse, AIMessageDict
from kernel.llm_agent_tools.defs import ToolNames
from kernel.llm_agent_tools.utils import get_tool_instance
from kernel.models import ToolPromptInstructionGroup
from kernel.utils import is_available_tool
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)

log_callback_handler = LogCallbackHandler(logger)


class SectionAgent(LLMAgent):
    def __init__(self, section: Section, chat_history: Optional[List[AIMessageDict]] = None) -> None:
        super().__init__()

        self.section = section
        self.chat_history = self._initialize_chat_history(chat_history)
        self.doc_settings = section.document.settings
        self.user_inputs = self._render_user_inputs_placeholders(self.doc_settings.get("user_inputs", {}))
        self.custom_data = self._get_custom_data(self.doc_settings.get("custom_data", {}))
        self.template_json = section.document.template_json
        self.section_json = section.document.sections_map.get(section.slug) if section.slug else {}
        self.available_tools = self._get_available_tools()

    @retry(times=settings.GENERATION_RETRY_TIMES, exceptions=(APITimeoutError,))
    def generate_plan(self) -> AgentResponse:
        plan_system_message = self._get_plan_generation_system_message()
        plan_prompt = self._format_plan_prompt()
        return self._execute(plan_system_message, plan_prompt)

    @retry(times=settings.GENERATION_RETRY_TIMES, exceptions=(APITimeoutError,))
    def generate_content(self, dependencies: Optional[Dict[str, str]] = None) -> AgentResponse:
        system_message = self._format_system_message()
        placeholders = self._resolve_placeholders(dependencies)
        section_prompt = self._format_section_prompt(placeholders)

        if self.available_tools:
            result = self._execute_with_tools(system_message, section_prompt)
        else:
            result = self._execute(system_message, section_prompt)
        return result

    @retry(times=settings.GENERATION_RETRY_TIMES, exceptions=(APITimeoutError,))
    def polish(self, prior_sections_text: str) -> AgentResponse:
        system_message, human_message = self._get_polish_prompts(prior_sections_text)
        return self._execute(system_message, human_message)

    def _initialize_chat_history(self, chat_history: Optional[List[AIMessageDict]]) -> List[BaseMessage]:
        if chat_history:
            return [
                message
                for messages in chat_history
                for message in (
                    HumanMessage(content=messages["user_message"]),
                    AIMessage(content=messages["ai_message"]),
                )
            ]
        return []

    def _get_prompt_template(self, system_message: str = "", with_tools: bool = False) -> ChatPromptTemplate:
        messages = []
        if system_message:
            messages.append(("system", system_message))
        if self.chat_history:
            messages.append(MessagesPlaceholder("chat_history"))
        messages.append(("user", "{input}"))
        if with_tools:
            messages.append(("placeholder", "{agent_scratchpad}"))
        return ChatPromptTemplate.from_messages(messages)

    def _resolve_placeholders(self, dependencies: Optional[Dict[str, str]]) -> Dict[str, str]:
        resolved_placeholders = dependencies or {}
        if self.section.requires_plan:
            resolved_placeholders["plan"] = self.section.plan
        if self.user_inputs:
            resolved_placeholders.update(**self.user_inputs)

        resolved_placeholders["expected_output_instructions"] = self.section_json.get(
            "expected_output_instructions", ""
        )

        if not self.section.is_title:
            tool_placeholders = self._get_tool_placeholders()
            if tool_placeholders:
                resolved_placeholders.update(tool_placeholders)

        return resolved_placeholders

    def _format_section_prompt(self, placeholders: Dict[str, str]) -> str:
        section_prompt = self.section.prompt.format(**placeholders)

        if self.custom_data and self.template_json.get("custom_data_prefix_in_prompt"):
            custom_data_section_prompt = self.template_json["custom_data_prefix_in_prompt"] + self.custom_data
            section_prompt = custom_data_section_prompt + section_prompt

        section_prompt = escape_braces(section_prompt)

        return section_prompt

    def _execute(self, system_message: str, prompt: str) -> AgentResponse:
        prompt_template = self._get_prompt_template(system_message)
        chain = prompt_template | self.llm | self.parser
        return self._invoke_chain(chain, prompt)

    def _execute_with_tools(self, system_message: str, section_prompt: str) -> AgentResponse:
        tools = self._get_tools()
        prompt_template = self._get_prompt_template(system_message, with_tools=True)
        agent = create_tool_calling_agent(self.llm, tools, prompt_template)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            max_iterations=settings.AGENT_EXECUTOR_MAX_ITERATIONS,
            verbose=True,
            stream_runnable=False,
            return_intermediate_steps=True,
        )
        return self._invoke_chain(agent_executor, section_prompt)

    def _invoke_chain(self, chain: RunnableSequence | AgentExecutor, prompt: str) -> AgentResponse:
        transparency_callback_handler = TransparencyCallbackHandler(
            callback_writer=(partial(update_generation_log, self.section))
        )
        with get_openai_callback() as cb:
            input = {"input": prompt}
            if self.chat_history:
                input["chat_history"] = self.chat_history
            response = chain.invoke(
                input, {"callbacks": [transparency_callback_handler, log_callback_handler]}
            )
            result = response if isinstance(chain, RunnableSequence) else response["output"]
            if isinstance(chain, AgentExecutor):
                intermediate_steps: List[Tuple[LCAgentAction, str]] = response.get("intermediate_steps", [])
                agent_actions = [
                    AgentAction(
                        tool=agent_action.tool,
                        tool_input=agent_action.tool_input,
                        tool_output=observation,
                    )
                    for agent_action, observation in intermediate_steps
                ]
            else:
                agent_actions = []

            return AgentResponse(
                content=result,
                token_usage=TokenUsage(
                    prompt_tokens=cb.prompt_tokens,
                    completion_tokens=cb.completion_tokens,
                    total_tokens=cb.total_tokens,
                ),
                agent_actions=agent_actions,
            )

    def _get_tools(self) -> Sequence[BaseTool]:
        tool_names = self.available_tools
        tools = []
        for tool_name in tool_names:
            tool = get_tool_instance(tool_name)
            if not tool:
                continue

            if tool.name == ToolNames.PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL:
                for param, value in self.section.document.publication_settings_to_params().items():
                    setattr(tool, param, value)

                if custom_bibliography_file_pks := self.doc_settings.get("custom_bibliography_file_pks"):
                    tool.custom_bibliography_file_pks = custom_bibliography_file_pks

                selected_agents = self.doc_settings.get("agents", {})
                resources = selected_agents.get(ToolNames.PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL, {}).get(
                    "resources", []
                )
                tool.resources = resources
            elif tool.name == ToolNames.WEB_SEARCH_TOOL:
                tool.token_record_callback = functools.partial(
                    record_token_usage,
                    user=self.section.document.created_by,
                    model_instance=self.section,
                    usage_type=AITokenUsageType.WEBSEARCH_EMBEDDING,
                    ai_model=settings.EMBEDDING_OPENAI_API_CONFIGS[0].get("model"),
                )

                selected_agents = self.doc_settings.get("agents", {})
                resources = selected_agents.get(ToolNames.WEB_SEARCH_TOOL, {}).get("resources", [])
                tool.sources = resources

            tools.append(tool)

        return tools

    def _render_user_inputs_placeholders(self, user_inputs: Dict[str, str]) -> Dict[str, str]:
        for key, value in user_inputs.items():
            if isinstance(value, str):
                try:
                    user_inputs[key] = safe_format(value, **user_inputs)
                except KeyError:
                    logger.error(f"Error rendering user input placeholder: {key}")
        return user_inputs

    def _get_plan_generation_system_message(self) -> str:
        return SYSTEM_PROMPT_FOR_PLAN_GENRATION

    def _format_plan_prompt(self) -> str:
        prompt = self.section.plan_prompt
        # Fill in user inputs
        if self.user_inputs:
            prompt = prompt.format(**self.user_inputs)
        # Append custom data
        if self.custom_data and self.template_json.get("custom_data_prefix_in_plan_prompt"):
            custom_data_plan_prompt = (
                "\n\n" + self.template_json["custom_data_prefix_in_plan_prompt"] + self.custom_data
            )
            prompt += custom_data_plan_prompt
        return escape_braces(prompt)

    def _format_system_message(self) -> str:
        system_message = self.template_json.get("system_message", "")
        return system_message.format(**self.user_inputs) if self.user_inputs else system_message

    def _get_polish_prompts(self, prior_sections_text: str) -> Tuple[str, str]:
        polish_prompts_config = Config.get(ConfigKeyType.POLISH_PROMPTS, {})
        system_message, human_message_tpl = (
            polish_prompts_config.get("system_message"),
            polish_prompts_config.get("human_message"),
        )
        human_message = human_message_tpl.format(
            title=self.section.title,
            customized_section_results=self.section.result.get("data"),
            expected_output_instructions=self.section_json.get("expected_output_instructions", ""),
            prior_sections_info=f"\n{prior_sections_text}" if prior_sections_text else "",
        )
        return system_message, human_message

    def _get_tool_placeholders(self) -> Dict[str, str]:
        tool_placeholders = {}

        tool_groups = ToolPromptInstructionGroup.objects.prefetch_related("tool_instructions").all()

        for tool_group in tool_groups:
            names_placeholders = []
            instructions_placeholders = []

            for tool in tool_group.tool_instructions.all():
                if str(tool.name) in self.available_tools:
                    names_placeholders.append(str(tool.name))
                    instructions_placeholders.append(str(tool.instruction))

            tool_placeholders[tool_group.names_placeholder] = ", ".join(names_placeholders)
            tool_placeholders[tool_group.instructions_placeholder] = ", ".join(instructions_placeholders)

        return tool_placeholders

    def _get_available_tools(self) -> List[str]:
        section_tools = self.section.tools or []
        checked_agents = self.doc_settings.get("agents", {})
        available_tools = []
        for tool in section_tools:
            if is_available_tool(tool, checked_agents):
                available_tools.append(tool)
        return available_tools

    def _get_output_format(self) -> Optional[str]:
        output_formats = Config.get(ConfigKeyType.OUTPUT_FORMATS, [])
        selected_output_format = self.doc_settings.get("output_format", "")

        output_format_map = {
            output_format["value"]: output_format["prompt"]
            if not output_format["requires_custom_input"]
            else self.doc_settings.get("output_format_content", "")
            for output_format in output_formats
        }

        return output_format_map.get(selected_output_format)

    def _get_custom_data(self, section_custom_data_map: Dict[str, str]) -> Optional[str]:
        return section_custom_data_map.get(self.section.slug)
