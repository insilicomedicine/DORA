DEFAULT_DOCUMENT_TITLE = "Untitled Document"


class SearchResourceType:
    PUBMED = "pubmed"
    PMC = "pmc"
    WEBSEARCH = "websearch"

    @classmethod
    def get_choices(cls):
        return [
            (cls.PUBMED, "PubMed"),
            (cls.PMC, "PMC"),
            (cls.WEBSEARCH, "Web Search"),
        ]
