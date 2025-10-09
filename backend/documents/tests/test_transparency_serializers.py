from django.test import TestCase

from documents.serializers import AgentLogsSectionSerializer
from documents.transparency.defs import ToolStatus


class TestAgentLogsSectionSerializer(TestCase):
    def test_update_agents_result(self):
        section_data = {
            "generation_log": {
                "agents_result": [
                    {"hashid": "abc123", "name": "Agent A", "status": ToolStatus.IN_PROGRESS},
                    {"hashid": "def456", "name": "Agent B", "status": ToolStatus.IN_PROGRESS},
                    {"hashid": "def456", "name": "Agent B", "status": ToolStatus.COMPLETED},
                    {"hashid": "abc123", "name": "Agent A", "status": ToolStatus.COMPLETED},
                ]
            }
        }

        expected_data = {
            "generation_log": {
                "agents_result": [
                    {"hashid": "abc123", "name": "Agent A", "status": ToolStatus.COMPLETED},
                    {"hashid": "def456", "name": "Agent B", "status": ToolStatus.COMPLETED},
                ]
            }
        }

        AgentLogsSectionSerializer._update_agents_result(section_data)
        self.assertEqual(section_data, expected_data)

    def test_update_agents_result_no_duplicates(self):
        section_data = {
            "generation_log": {
                "agents_result": [
                    {"hashid": "abc123", "name": "Agent A"},
                    {"hashid": "def456", "name": "Agent B"},
                ]
            }
        }

        expected_data = section_data.copy()
        AgentLogsSectionSerializer._update_agents_result(section_data)
        self.assertEqual(section_data, expected_data)

    def test_update_agents_result_no_agents_result(self):
        section_data = {"generation_log": {}}
        expected_data = section_data.copy()
        AgentLogsSectionSerializer._update_agents_result(section_data)
        self.assertEqual(section_data, expected_data)

    def test_update_agents_result_empty_agents_result(self):
        section_data = {"generation_log": {"agents_result": []}}
        expected_data = section_data.copy()
        AgentLogsSectionSerializer._update_agents_result(section_data)
        self.assertEqual(section_data, expected_data)
