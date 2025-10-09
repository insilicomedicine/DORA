import { HttpService as axios } from './HttpService';
import type { AxiosRequestConfig } from 'axios';
import { showErrorMessage } from './messages';
import { PaginatedResponse } from 'types/constants';
import type {
  DocumentData,
  DocumentItem,
  Section,
  Bibliography,
  MermaidDiagramData,
  Chunk
} from 'types/document';

/**
 * Fetch user's documents list with pagination support
 * @param {string} cursor - Pagination cursor for next/previous page (empty string for first page)
 * @param {number} pageSize - Number of documents per page (default: 20)
 * @returns {Promise<PaginatedResponse<DocumentItem> | null>} Paginated documents response with next/previous cursors, null on error
 */
const getDocuments = async (
  cursor: string = '',
  pageSize: number = 20
): Promise<PaginatedResponse<DocumentItem> | null> => {
  return await axios
    .get(
      `/documents/?${cursor ? `cursor=${cursor}&` : ''}page_size=${pageSize}`
    )
    .then((res) => {
      return res.data;
    })
    .catch(() => {
      return null;
    });
};

/**
 * Fetch a single document's complete data by ID
 * @param {string} id - Unique document identifier
 * @param {AbortController} abortController - Optional controller to cancel the request
 * @returns {Promise<DocumentData | null>} Complete document data on success, {status: 'failed'} for client errors, null on server error
 */
const getDocument = async (
  id: string,
  abortController?: AbortController
): Promise<DocumentData | null> => {
  return await axios
    .get(`/documents/${id}/`, { signal: abortController?.signal })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        return {
          status: 'failed'
        };
      }

      return null;
    });
};

/**
 * Update specific fields of an existing document (partial update)
 * @param {string} id - Unique document identifier
 * @param {Partial<DocumentData>} params - Document fields to update (title, content, settings, etc.)
 * @param {AbortController} abortController - Optional controller to cancel the request
 * @returns {Promise<Partial<DocumentData> | null | {}>} Updated document data on success, null if request canceled, empty object on error
 */
const updateDocument = async (
  id: string,
  params: Partial<DocumentData>,
  abortController?: AbortController
): Promise<Partial<DocumentData> | null | {}> => {
  return await axios
    .patch(`/documents/${id}/`, params, { signal: abortController?.signal })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return null;
      }
      showErrorMessage(err);
      return {};
    });
};

/**
 * Permanently delete a document by ID
 * @param {string} id - Unique document identifier
 * @returns {Promise<boolean>} True if document deleted successfully, false on error
 */
const deleteDocument = async (id: string): Promise<boolean> => {
  return await axios
    .delete(`/documents/${id}/`)
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Generate a new document using AI with specified parameters
 * @param {Record<string, any>} params - Document generation settings (template, topic, length, style, etc.)
 * @param {AbortController} abortController - Optional controller to cancel the generation process
 * @returns {Promise<DocumentData | null>} Newly created document data on success, null on error or if canceled
 */
const generateDocuments = async (
  params: Record<string, any>,
  abortController?: AbortController
): Promise<DocumentData | null> => {
  return await axios
    .post(`/documents/`, params, { signal: abortController?.signal })
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

/**
 * Trigger AI generation/regeneration for an existing document
 * @param {string} id - Unique document identifier
 * @returns {Promise<DocumentData | false>} Updated document data with generated content on success, false on error
 */
const generateDocument = async (id: string): Promise<DocumentData | false> => {
  return await axios
    .post(`/documents/${id}/generate/`)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Create a new sub-section within a document
 * @param {Partial<Section>} params - Section data (title, parent_id, content, order, etc.)
 * @returns {Promise<Section | {}>} Created section data on success, empty object on error
 */
const createSubSection = async (
  params: Partial<Section>
): Promise<Section | {}> => {
  return await axios
    .post(`/documents/sections/`, params)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return {};
    });
};

/**
 * Export a document to downloadable file format (PDF or DOCX)
 * @param {Object} params - Export configuration with document_id and format ('pdf' | 'docx')
 * @returns {Promise<Blob | false>} File blob for download on success, false on error
 */
const exportDocument = async (params: {
  document_id: string;
  format: 'pdf' | 'docx';
}): Promise<Blob | false> => {
  return await axios
    .post(`/documents/export/`, params, { responseType: 'blob' })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Generate AI content for a specific document section
 * @param {string} id - Unique section identifier
 * @returns {Promise<Section | {}>} Updated section with generated content on success, empty object on error
 */
const generateSection = async (id: string): Promise<Section | {}> => {
  return await axios
    .post(`/documents/sections/${id}/generate/`)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return {};
    });
};

/**
 * Update specific fields of a document section (partial update)
 * @param {string} id - Unique section identifier
 * @param {Partial<Section>} params - Section fields to update (title, content, order, etc.)
 * @param {AxiosRequestConfig} config - Optional axios configuration for request cancelation or headers
 * @returns {Promise<Section | 'abort' | {}>} Updated section data on success, 'abort' if request canceled, empty object on error
 */
const updateSection = async (
  id: string,
  params: Partial<Section>,
  config?: AxiosRequestConfig
): Promise<Section | 'abort' | {}> => {
  return await axios
    .patch(`/documents/sections/${id}/`, params, config)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return 'abort';
      }
      showErrorMessage(err);
      return {};
    });
};

/**
 * Permanently delete a document section by ID
 * @param {string} id - Unique section identifier
 * @returns {Promise<boolean>} True if section deleted successfully, false on error
 */
const deleteSection = async (id: string): Promise<boolean> => {
  return await axios
    .delete(`/documents/sections/${id}/`)
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Search for research references relevant to a document
 * @param {string} id - Unique document identifier
 * @param {Object} query - Search parameters with query string and resource type filter
 * @param {AbortController} abortController - Optional controller to cancel the search request
 * @returns {Promise<Chunk[]>} Array of relevant reference chunks on success, empty array on error, void if canceled
 */
const findReferences = async (
  id: string,
  query: { query: string; search_resource_type: string },
  abortController?: AbortController
): Promise<Chunk[]> => {
  return await axios
    .post(
      `documents/${id}/find_references/`,
      { ...query },
      { signal: abortController?.signal }
    )
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

/**
 * Search for academic citations relevant to a document
 * @param {string} id - Unique document identifier
 * @param {Object} query - Search parameters with query string and resource type filter
 * @param {AbortController} abortController - Optional controller to cancel the search request
 * @returns {Promise<Chunk[]>} Array of relevant citation chunks on success, null on error
 */
const findCitations = async (
  id: string,
  query: { query: string; search_resource_type: string },
  abortController?: AbortController
): Promise<Chunk[]> => {
  return await axios
    .post(
      `documents/${id}/find_citations/`,
      { ...query },
      { signal: abortController?.signal }
    )
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

/**
 * Execute AI-powered actions on document content (summarize, rewrite, etc.)
 * @param {Object} query - AI action configuration with document_id, action_type, target text, context, and metadata
 * @param {AbortController} abortController - Optional controller to cancel the AI processing
 * @returns {Promise<string>} AI-processed text result on success, empty string if canceled or on error
 */
const aiActions = async (
  query: {
    document_id: string;
    action_type?: string;
    text?: string;
    text_context?: string;
    metadata?: Record<string, any>;
    custom_prompt?: string;
  },
  abortController?: AbortController
): Promise<string> => {
  return await axios
    .post(
      `/documents/ai_actions/`,
      { ...query },
      { signal: abortController?.signal }
    )
    .then((res) => {
      return res.data?.result;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return '';
      }
      showErrorMessage(err);
      return '';
    });
};

/**
 * Trigger AI polishing/refinement for entire document content
 * @param {string} id - Unique document identifier
 * @param {AbortController} abortController - Optional controller to cancel the polishing process
 * @returns {Promise<boolean | void>} True if polishing completed successfully, false on error, void if canceled
 */
const polish = async (
  id: string,
  abortController?: AbortController
): Promise<boolean | void> => {
  return await axios
    .post(`/documents/${id}/polish/`, {
      signal: abortController?.signal
    })
    .then(() => {
      return true;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return;
      }
      showErrorMessage(err);
      return false;
    });
};

/**
 * Apply or reject AI-refined content for a document section
 * @param {string} id - Unique section identifier
 * @param {Object} params - Refinement action choice: 'keep_original' or 'apply_refined'
 * @returns {Promise<boolean | void>} True if action applied successfully, false on error, void if canceled
 */
const applyRefined = async (
  id: string,
  params: { action: 'keep_original' | 'apply_refined' }
): Promise<boolean | void> => {
  return await axios
    .post(`/documents/sections/${id}/apply_refinement/`, params)
    .then(() => {
      return true;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return;
      }
      showErrorMessage(err);
      return false;
    });
};

/**
 * Submit user feedback (like/dislike) for document generation
 * @param {Object} params - Feedback data with document_id and like boolean
 * @returns {Promise<boolean>} True if feedback submitted successfully, false on error
 */
const feedback = async (params: {
  document_id: string;
  like: boolean;
}): Promise<boolean> => {
  return await axios
    .post(`documents/feedback/`, params)
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Update bibliography entries by fetching latest data from PubMed
 * @param {Object} params - Update request with array of bibliography entries to refresh
 * @returns {Promise<Bibliography[] | false>} Updated bibliography entries on success, false on error
 */
const updateBibliographies = async (params: {
  bibliographies: Bibliography[];
}): Promise<Bibliography[] | false> => {
  return await axios
    .post(`/bibliographies/`, params)
    .then((res) => {
      return res.data?.bibliographies;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Generate a Mermaid diagram visualization for document content
 * @param {string} id - Unique document identifier
 * @param {Object} params - Diagram configuration with diagram_type (flowchart, sequence, etc.)
 * @returns {Promise<MermaidDiagramData>} Generated diagram data and code on success, empty object on error
 */
const generateMermaidDiagram = async (
  id: string,
  params: {
    diagram_type: string;
  }
): Promise<MermaidDiagramData> => {
  return await axios
    .post(`/documents/${id}/generate_mermaid_diagram/`, params)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return {};
    });
};

/**
 * Request comprehensive AI review and analysis for a document
 * @param {string} documentId - Unique document identifier
 * @returns {Promise<boolean>} True if review request submitted successfully, false on error
 */
const generateDocumentReview = async (documentId: string): Promise<boolean> => {
  return await axios
    .post('ai_review/document_reviews/', { document_id: documentId })
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Remove/unlink a Mermaid diagram from a document
 * @param {string} id - Unique document identifier
 * @returns {Promise<boolean>} True if diagram unlinked successfully, false on error
 */
const removeDiagramFromDocument = async (id: string): Promise<boolean> => {
  return await axios
    .post(`/documents/${id}/unlink_mermaid_diagram/`)
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

/**
 * Fetch AI-generated review data and status for a document
 * @param {string} documentId - Unique document identifier
 * @returns {Promise<{ data: Record<string, any>; status: string }>} Review analysis data and processing status
 */
const getDocumentReview = async (
  documentId: string
): Promise<{ data: Record<string, any>; status: string }> => {
  return await axios
    .get(`ai_review/document_reviews/?document_id=${documentId}`)
    .then((res) => {
      return {
        data:
          res.data?.predefined_review !== null
            ? res.data?.predefined_review
            : {},
        status: res.data?.review_status
      };
    })
    .catch(() => {
      return { data: {}, status: '' };
    });
};

/**
 * Generate an AI-powered structured plan/outline for a document
 * @param {string} id - Unique document identifier
 * @param {AbortController} abortController - Optional controller to cancel the plan generation
 * @returns {Promise<Record<string, string>>} Generated plan data on success, {canceled: true} if canceled, false on error
 */
const generatePlan = async (
  id: string,
  abortController?: AbortController
): Promise<Record<string, string>> => {
  return await axios
    .post(
      `/documents/${id}/generate_plan/`,
      {},
      {
        signal: abortController?.signal
      }
    )
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err?.code === 'ERR_CANCELED') {
        return { canceled: true };
      }
      showErrorMessage(err);
      return false;
    });
};

export {
  getDocuments,
  generateDocuments,
  getDocument,
  generateDocument,
  generateSection,
  createSubSection,
  updateSection,
  deleteSection,
  findReferences,
  findCitations,
  deleteDocument,
  updateDocument,
  aiActions,
  exportDocument,
  polish,
  feedback,
  applyRefined,
  updateBibliographies,
  generateMermaidDiagram,
  generateDocumentReview,
  getDocumentReview,
  removeDiagramFromDocument,
  generatePlan
};
