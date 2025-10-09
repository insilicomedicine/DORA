from typing import Any, Dict, List

from dwh.requests.base_request import make_dwh_api_request


def make_dwh_chunks_or_metadata_request(
    endpoint: str,
    params: Dict[str, Any],
) -> List[Dict[str, Any]]:
    response = make_dwh_api_request(endpoint=endpoint, params=params)

    if response is None:
        raise ValueError(f"Failed to retrieve page of data from DWH: endpoint={endpoint}, params={params}")

    try:
        response_data = response["data"]
    except KeyError:
        raise ValueError(f"Wrong format of response from {endpoint}: {response}")

    return response_data
