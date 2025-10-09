from langchain_openai import AzureChatOpenAI, ChatOpenAI

from kernel.chat_models.mixins import BackupInvokeMixin


class ChatOpenAIWithBackup(BackupInvokeMixin, ChatOpenAI):
    pass


class AzureChatOpenAIWithBackup(BackupInvokeMixin, AzureChatOpenAI):
    pass
