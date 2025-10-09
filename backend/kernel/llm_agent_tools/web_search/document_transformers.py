from typing import Any, Iterator, List, Tuple, Union, cast

from langchain_community.document_transformers import BeautifulSoupTransformer


def get_navigable_strings(element: Any, *, remove_comments: bool = False) -> Iterator[str]:
    from bs4 import Comment, NavigableString, Tag

    for child in cast(Tag, element).children:
        if isinstance(child, Comment) and remove_comments:
            continue
        if isinstance(child, Tag):
            yield from get_navigable_strings(child, remove_comments=remove_comments)
        elif isinstance(child, NavigableString):
            yield child.strip()


class CustomBeautifulSoupTransformer(BeautifulSoupTransformer):
    @staticmethod
    def extract_tags(
        html_content: str,
        tags: Union[List[str], Tuple[str, ...]],
        *,
        remove_comments: bool = False,
    ) -> str:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")
        text_parts: List[str] = []
        for element in soup.find_all():
            if element.name in tags:
                # Extract all navigable strings recursively from this element.
                text_parts += get_navigable_strings(element, remove_comments=remove_comments)

                # To avoid duplicate text, remove all descendants from the soup.
                element.decompose()

        return " ".join(text_parts)
