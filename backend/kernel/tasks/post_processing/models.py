from typing import Dict, List, Union

from pydantic import BaseModel, Field


class SubSection(BaseModel):
    """Model representing a subsection of a paper."""

    title: str = Field(description="Title of the subsection")
    results: str = Field(description="Content/data of the subsection")


class Section(BaseModel):
    """Model representing a section of a paper."""

    title: str = Field(description="Title of the section")
    results: str = Field(description="Content/data of the section")
    sub_sections: Union[Dict[str, SubSection], List] = Field(
        description="Dictionary of subsections or empty list if no subsections exist"
    )


class Paper(BaseModel):
    """Model representing the entire paper structure."""

    sections: Dict[str, Section] = Field(
        description=(
            "Dictionary of sections with keys in format 'NUMBER',"
            " with 'NUMBER' representing the order number of each section or subsection"
        )
    )

    class Config:
        json_schema_extra = {
            "example": {
                "sections": {
                    "0": {"title": "Introduction", "results": "Introduction content...", "sub_sections": []},
                    "1": {
                        "title": "Methods",
                        "results": "Methods content...",
                        "sub_sections": {
                            "2": {"title": "Data Analysis", "results": "Data analysis methods..."},
                            "3": {"title": "Tissue Processing", "results": "Tissues were collected..."},
                        },
                    },
                    "4": {"title": "Results", "results": "Results content...", "sub_sections": []},
                }
            }
        }
