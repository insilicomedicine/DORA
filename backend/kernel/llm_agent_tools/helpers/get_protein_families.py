import logging
from typing import Dict, List

from kernel.services.pandaomics_client import call_pandaomics_api

logger = logging.getLogger(__name__)


def get_protein_families() -> Dict[str, int]:
    """Get protein families data from PandaOmics API.

    Returns:
        Dictionary mapping protein family names to their IDs

    Raises:
        requests.exceptions.RequestException: If API request fails
        json.JSONDecodeError: If API response is not valid JSON
    """
    try:
        response = call_pandaomics_api(
            http_method="GET", api_endpoint="/api/v1/definitions/protein_families/"
        )

        # Parse response
        target_families = response.json()
        name_id_dict = extract_name_id_pairs(target_families)

        logger.info(f"Retrieved {len(name_id_dict)} protein families")
        return name_id_dict

    except Exception as e:
        logger.error(f"Failed to get protein families: {str(e)}")
        raise


def extract_name_id_pairs(data: List[Dict]) -> Dict[str, int]:
    """Extract name-ID pairs from the protein families data structure.

    Args:
        data: List of dictionaries containing protein family data

    Returns:
        Dictionary mapping protein family names to their IDs
    """
    result = {}

    def recurse(items: List[Dict]) -> None:
        """Recursively extract name-id pairs from nested structure.

        Args:
            items: List of dictionaries to process
        """
        for item in items:
            name = item.get("name")
            item_id = item.get("id")
            if name and item_id:
                result[name] = item_id

            children = item.get("children")
            if children:
                recurse(children)

    recurse(data)
    return result
