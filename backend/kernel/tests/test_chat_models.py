from django.test import TestCase
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from kernel.chat_models.mixins import gen_missing_tool_messages
from kernel.chat_models.models import AzureChatOpenAIWithBackup, ChatOpenAIWithBackup


class TestChatOpenAIWithBackup(TestCase):
    def test_reload_backup_configs_no_backup_model(self):
        model_name = "gpt-4o"
        chat_openai = ChatOpenAIWithBackup(
            model_name=model_name,
            openai_api_key="openai_key",
            openai_api_base="https://api.openai.com",
            request_timeout=30,
        )
        result = chat_openai.reload_backup_configs()
        self.assertFalse(result)
        self.assertEqual(chat_openai.model_name, model_name)

    def test_reload_backup_configs_with_backup_model(self):
        chat_openai = ChatOpenAIWithBackup(
            model_name="gpt-4o",
            openai_api_key="openai_key",
            openai_api_base="https://api.openai.com",
            request_timeout=30,
            backup_api_type="openai",
            backup_api_key="backup_key",
            backup_model_name="backup_model",
            backup_base_url="https://backup.api.openai.com",
        )
        result = chat_openai.reload_backup_configs()
        self.assertTrue(result)
        self.assertEqual(chat_openai.model_name, "backup_model")


class TestAzureChatOpenAIWithBackup(TestCase):
    def test_reload_backup_configs_no_backup_model(self):
        model_name = "gpt-4o"
        azure_chat_openai = AzureChatOpenAIWithBackup(
            model_name=model_name,
            azure_endpoint="https://api.openai.com",
            deployment_name="deployment",
            openai_api_version="v1",
            openai_api_key="openai_key",
            openai_api_type="azure",
            request_timeout=30,
        )
        result = azure_chat_openai.reload_backup_configs()
        self.assertFalse(result)
        self.assertEqual(azure_chat_openai.model_name, model_name)

    def test_reload_backup_configs_with_backup_model(self):
        azure_chat_openai = AzureChatOpenAIWithBackup(
            model_name="gpt-4o",
            azure_endpoint="https://api.openai.com",
            deployment_name="deployment",
            openai_api_version="v1",
            openai_api_key="openai_key",
            openai_api_type="azure",
            request_timeout=30,
            backup_api_type="azure",
            backup_api_key="backup_key",
            backup_model_name="backup_model",
            backup_base_url="https://backup.api.openai.com",
            backup_azure_deployment="backup_deployment",
            backup_api_version="v1",
        )
        result = azure_chat_openai.reload_backup_configs()
        self.assertTrue(result)
        self.assertEqual(azure_chat_openai.model_name, "backup_model")


class TestGenMissingToolMessages(TestCase):
    def test_no_messages(self):
        messages = []
        result = gen_missing_tool_messages(messages)
        self.assertEqual(result, [])

    def test_no_ai_message(self):
        messages = [HumanMessage(content="test")]
        result = gen_missing_tool_messages(messages)
        self.assertEqual(result, [])

    def test_no_tool_calls(self):
        messages = [AIMessage(content="test", additional_kwargs={})]
        result = gen_missing_tool_messages(messages)
        self.assertEqual(result, [])

    def test_all_tool_calls_responded(self):
        messages = [
            AIMessage(content="test", additional_kwargs={"tool_calls": [{"id": "1"}, {"id": "2"}]}),
            ToolMessage(content="response", tool_call_id="1"),
            ToolMessage(content="response", tool_call_id="2"),
        ]
        result = gen_missing_tool_messages(messages)
        self.assertEqual(result, [])

    def test_missing_tool_responses(self):
        messages = [
            AIMessage(content="test", additional_kwargs={"tool_calls": [{"id": "1"}, {"id": "2"}]}),
            ToolMessage(content="response", tool_call_id="1"),
        ]
        result = gen_missing_tool_messages(messages)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].tool_call_id, "2")
        self.assertEqual(result[0].content, "")

    def test_multiple_ai_messages(self):
        messages = [
            AIMessage(content="test1", additional_kwargs={"tool_calls": [{"id": "1"}]}),
            ToolMessage(content="response", tool_call_id="1"),
            AIMessage(content="test2", additional_kwargs={"tool_calls": [{"id": "2"}]}),
        ]
        result = gen_missing_tool_messages(messages)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].tool_call_id, "2")
        self.assertEqual(result[0].content, "")
