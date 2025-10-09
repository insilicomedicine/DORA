from typing import List, Optional

from dwh.requests.base_request import BaseDwhRequest


class ScientificPublicationMetadataRequest(BaseDwhRequest):
    endpoint = "/scientific_publication/metadata"

    def __init__(
        self,
        pubmed_ids: Optional[List[int]] = None,
        pmc_ids: Optional[List[str]] = None,
        doi_nums: Optional[List[str]] = None,
    ) -> None:
        super().__init__(
            pmc_ids=pmc_ids,
            doi_nums=doi_nums,
            pubmed_ids=pubmed_ids,
        )
