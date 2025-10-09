from pydantic.v1 import BaseModel, Field


class QueryInputModel(BaseModel):
    query: str = Field(description="should be a scientific question")


class Precious3GPTReverseAgingInputModel(BaseModel):
    """Inputs for precious3gpt_reverse_aging"""

    tissue: str = Field(description="A tissue name - should be a string")
    gender: str = Field(description="A gender abbreviation name - should be 'm' or 'f', nothing else")


class DiseaseNameInputModel(BaseModel):
    disease_name: str = Field(description="disease name")


class GeneDiseaseNamesInputModel(BaseModel):
    gene_name: str = Field(description="gene name")
    disease_name: str = Field(description="disease name")


class GeneNameInputModel(BaseModel):
    gene_name: str = Field(description="gene name")
