from collections import namedtuple


class CustomBibliographyFileFormat:
    UNSUPPORTED = "unsupported"
    PDF = "pdf"

    FORMATS = (PDF, UNSUPPORTED)
    FORMAT_CHOICES = tuple(zip(FORMATS, FORMATS))


CustomBibliographyFileS3Template = "bibliography/custom/file_{pk}.pdf"


class CustomBibliographyFileStatus:
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSED = "processed"
    FAILED = "failed"

    STATUSES = (UPLOADED, UPLOADING, PROCESSED, FAILED)
    STATUS_CHOICES = tuple(zip(STATUSES, STATUSES))

    POSSIBLE_MANUAL_STATUS_CHANGES = (
        (UPLOADING, UPLOADED),
        (UPLOADING, FAILED),
    )


UUID_REGEX = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

NON_CHUNK_ID = "00000000-0000-0000-0000-000000000000"

PublicationType = namedtuple("PublicationType", ["name", "inline_ref_prefix"])


class PublicationTypes:
    PUBMED = PublicationType("pubmed", "PMID")
    PMC = PublicationType("pmc", "PMCID")
    DOI = PublicationType("doi", "DOI")
