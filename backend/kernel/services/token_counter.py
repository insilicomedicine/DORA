import tiktoken


class TokenCounter:
    """A utility class for consistent token counting across the application."""

    def __init__(self, model_name: str):
        self.encoding = tiktoken.encoding_for_model(model_name)

    def count_tokens(self, text: str, disallowed_special: tuple = ()) -> int:
        """
        Count tokens in a text string.

        Args:
            text: The text to count tokens for
            disallowed_special: Special tokens to disallow (default: empty tuple for maximum compatibility)

        Returns:
            Number of tokens
        """
        return len(self.encoding.encode(text, disallowed_special=disallowed_special))
