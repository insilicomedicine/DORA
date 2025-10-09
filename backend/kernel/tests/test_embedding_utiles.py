from unittest.mock import Mock, patch

from django.test import TestCase

from kernel.embeddings.embedding_utils import (
    RoundRobinConfigSelector,
    init_embedding_model,
    validate_embedding_openai_api_configs,
)


class TestValidateEmbeddingOpenaiApiConfigs(TestCase):
    def test_validate_embedding_openai_api_configs_with_valid_config(self) -> None:
        configs = [
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "version": "v2",
                "deployment_name": "deployment_1",
                "api_key": "key_1",
            }
        ]
        validate_embedding_openai_api_configs(configs, True)

        configs = [
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "api_key": "key_1",
            }
        ]
        validate_embedding_openai_api_configs(configs, False)

    def test_validate_embedding_openai_api_configs_with_invalid_config(self) -> None:
        configs = None
        with self.assertRaises(ValueError):
            validate_embedding_openai_api_configs(configs, True)

        configs = [
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "version": "v2",
                "deployment_name": "deployment_1",
                "api_key": "key_1",
            },
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "api_key": "key_1",
            },
        ]
        with self.assertRaises(ValueError):
            validate_embedding_openai_api_configs(configs, True)


class TestRoundRobinConfigSelector(TestCase):
    @patch("kernel.embeddings.embedding_utils.cache")
    def test_get_next_index(self, mock_cache: Mock) -> None:
        mock_cache.get.return_value = None
        mock_cache.incr.return_value = 1

        config_list = ["config1", "config2", "config3"]
        selector = RoundRobinConfigSelector(key="test_key", config_list=config_list)

        index = selector.get_next_index()
        self.assertEqual(index, 0)

    @patch("kernel.embeddings.embedding_utils.cache")
    def test_get_next_config(self, mock_cache: Mock) -> None:
        mock_cache.get.return_value = 5
        mock_cache.incr.return_value = 6

        config_list = ["config1", "config2", "config3"]
        selector = RoundRobinConfigSelector(key="test_key", config_list=config_list)

        config = selector.get_next_config()
        self.assertEqual(config, "config3")


class TestInitEmbeddingModel(TestCase):
    @patch("kernel.embeddings.embedding_utils.settings")
    @patch("kernel.embeddings.embedding_utils.cache")
    def test_init_embedding_model_azure(self, mock_cache: Mock, mock_settings: Mock) -> None:
        mock_settings.OPENAI_API_TYPE = "azure"
        mock_settings.EMBEDDING_OPENAI_API_CONFIGS = [
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "version": "v2",
                "deployment_name": "deployment_1",
                "api_key": "key_1",
            }
        ]
        mock_cache.get.return_value = None
        mock_cache.incr.return_value = 1

        with patch("kernel.embeddings.embedding_utils.AzureOpenAIEmbeddings") as mock_azure_embeddings:
            init_embedding_model()
            mock_azure_embeddings.assert_called_once_with(
                model="model_1",
                azure_endpoint="https://api.openai.com/v2",
                openai_api_version="v2",
                deployment="deployment_1",
                openai_api_key="key_1",
            )

    @patch("kernel.embeddings.embedding_utils.settings")
    @patch("kernel.embeddings.embedding_utils.cache")
    def test_init_embedding_model_openai(self, mock_cache: Mock, mock_settings: Mock) -> None:
        mock_settings.OPENAI_API_TYPE = "openai"
        mock_settings.EMBEDDING_OPENAI_API_CONFIGS = [
            {
                "model": "model_1",
                "base_url": "https://api.openai.com/v2",
                "version": "v2",
                "deployment_name": "deployment_1",
                "api_key": "key_1",
            }
        ]
        mock_cache.get.return_value = None
        mock_cache.incr.return_value = 1

        with patch("kernel.embeddings.embedding_utils.OpenAIEmbeddings") as mock_openai_embeddings:
            init_embedding_model()
            mock_openai_embeddings.assert_called_once_with(
                model="model_1",
                api_key="key_1",
                base_url="https://api.openai.com/v2",
            )
