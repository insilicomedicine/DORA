import { HttpService as axios } from './HttpService';
import { Metadata } from 'types/document';
import { showErrorMessage } from './messages';

/**
 * Fetch enriched metadata for scientific publications from data warehouse
 * @param {Object} params - Query parameters with search_resource_type, pubmed_ids array, and optional ordering
 * @param {AbortController} abortController - Optional controller to cancel the metadata fetch request
 * @returns {Promise<Metadata[] | null>} Array of publication metadata entries on success, null on error
 */
const generateMetaData = async (
  params: {
    search_resource_type: string;
    pubmed_ids: string[];
    order_by?: string;
  },
  abortController?: AbortController
): Promise<Metadata[] | null> => {
  return await axios
    .post(`/dwh/scientific_publication/metadata/`, params, {
      signal: abortController?.signal
    })
    .then((res) => {
      return res.data?.data;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return null;
      }
      showErrorMessage(err);
      return null;
    });
};

export { generateMetaData };
