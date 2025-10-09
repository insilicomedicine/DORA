import { LogsData } from 'types/document';
import { HttpService as axios } from './HttpService';
import { showErrorMessage } from './messages';

/**
 * Fetch transparency audit logs showing AI generation history for a document
 * @param {string} id - Unique document identifier
 * @param {AbortController | { signal?: AbortSignal }} abortController - Optional controller to cancel request
 * @returns {Promise<LogsData | null>} Document generation logs on success, null on error or if canceled
 */
const getDocumentLogs = async (
  id: string,
  abortController?: AbortController | { signal?: AbortSignal }
): Promise<LogsData | null> => {
  return await axios
    .get(`/documents/transparency/${id}/`, {
      signal: abortController?.signal
    })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return null;
      }
      showErrorMessage(err);
      return null;
    });
};

export { getDocumentLogs };
