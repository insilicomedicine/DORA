import json
import re
from enum import Enum
from typing import Optional


def is_json(data: str) -> bool:
    if data is None:
        return False
    try:
        json.loads(data)
    except (TypeError, ValueError):
        return False
    return True


class ExtendedEnum(Enum):
    @classmethod
    def list(cls):
        return list(map(lambda c: c.value, cls))


def escape_braces(string: str) -> str:
    return string.replace("{", "{{").replace("}", "}}")


def safe_format(str_template: str, **kwargs) -> str:
    placeholders = re.findall(r"\{(.*?)\}", str_template)

    for placeholder in placeholders:
        if placeholder not in kwargs:
            str_template = str_template.replace(f"{{{placeholder}}}", f"{{{{{placeholder}}}}}")

    result = str_template.format(**kwargs)

    return result


def clean_markdown_format(text):
    # Remove headers with space after #
    text = re.sub(r"^(#{1,6})\s+", "", text, flags=re.MULTILINE)

    # Remove bold and italic
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)

    return text


def fix_markdown_bullet_points_spacing(text: str) -> str:
    """
    Ensures proper spacing after Markdown bullet point markers (-, *, +).

    Example:
        >>> fix_markdown_bullet_points_spacing("- item\n-another")
        "- item\n- another"
    """
    pattern = r"(\n\s*)(-)(?=\S)"
    result = re.sub(pattern, r"\1\2 ", text)
    return result


def normalize_bibliography_reference(text: str) -> str:
    format_pattern = re.compile(r"BIB_ID:\s*([\w-]+),\s*CHUNK_ID:\s*([\w-]+)")

    def format_replacer(match):
        id = match.group(1)
        chunk_id = match.group(2)
        return f"BIB_ID:{id}, CHUNK_ID:{chunk_id}"

    formatted_text = re.sub(format_pattern, format_replacer, text)

    parentheses_pattern = re.compile(r"(BIB_ID:[\w-]+, CHUNK_ID:[\w-]+(?:; BIB_ID:[\w-]+, CHUNK_ID:[\w-]+)*)")

    def parentheses_replacer(match):
        matched_text = match.group(0)
        start_index = match.start()
        end_index = match.end()

        if (start_index > 0 and formatted_text[start_index - 1] == "(") and (
            end_index < len(formatted_text) and formatted_text[end_index] == ")"
        ):
            return matched_text
        return f"({matched_text})"

    result = parentheses_pattern.sub(parentheses_replacer, formatted_text)
    return result


def find_first_unmatched_parenthesis(
    string: str, open_paren: str = "{", close_paren: str = "}"
) -> Optional[str]:
    stack = []

    for char in string:
        if char == open_paren:
            stack.append(char)
        elif char == close_paren:
            if stack:
                stack.pop()
            else:
                return close_paren

    if stack:
        unmatched_open = stack.pop()
        return unmatched_open

    return None


def format_serializer_errors(serializer_errors: dict) -> str:
    """
    Converts Django REST Framework serializer errors into a readable string format.

    Args:
        serializer_errors (dict): The errors dictionary from serializer.errors

    Returns:
        str: A formatted string containing all error messages
    """
    error_messages = []

    def _process_error(error_dict, prefix=""):
        for field, errors in error_dict.items():
            if isinstance(errors, dict):
                _process_error(errors, f"{prefix}{field}.")
            else:
                if isinstance(errors, list):
                    for error in errors:
                        if isinstance(error, dict):
                            _process_error(error, f"{prefix}{field}.")
                        else:
                            error_messages.append(f"{prefix}{field}: {error}")
                else:
                    error_messages.append(f"{prefix}{field}: {errors}")

    _process_error(serializer_errors)
    return "; ".join(error_messages)
