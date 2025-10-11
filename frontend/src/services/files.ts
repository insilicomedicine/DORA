import { HttpService as axios } from './HttpService';
import { showErrorMessage } from './messages';
import type { BibliographyFilesResType } from 'types/bibliography';
/**
 * Upload a custom bibliography file (BibTeX, RIS, etc.) to the server
 * Creates file record, uploads content to storage, and marks as uploaded
 * @param {string} name - Display name for the bibliography file
 * @param {Blob | File | { arrayBuffer: () => Promise<ArrayBuffer>; type?: string }} currentFile - File object or blob with bibliography data
 * @param {(fileId: string) => void} ok_cb - Success callback function called with the created file ID
 * @param {() => void} err_cb - Error callback function called on upload failure
 * @returns {Promise<void>}
 */
const postBibliographyFileName = async (
  name: string,
  currentFile: any,
  ok_cb: (fileId: string) => void,
  err_cb: () => void
): Promise<void> => {
  const reader = new FileReader();

  const readFileAsArrayBuffer = (
    file: Blob | File
  ): Promise<ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer | null);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  try {
    const res = await axios.post('/bibliographies/custom_file/', { name });
    const uploadUrl = res.data.upload_url;
    const uploadHeaders = res.data.upload_headers || {};
    const fileId = res.data.pk;

    let fileContents: ArrayBuffer | string | null | undefined;
    if (currentFile instanceof Blob || currentFile instanceof File) {
      fileContents = await readFileAsArrayBuffer(currentFile);
    } else if (currentFile.arrayBuffer) {
      fileContents = await currentFile.arrayBuffer();
    } else {
      console.error('Invalid file object provided to postBibliographyFileName');
      err_cb();
      return;
    }

    await axios.put(uploadUrl, fileContents, {
      headers: {
        'Content-Type': currentFile.type || 'application/octet-stream',
        ...uploadHeaders
      }
    });

    ok_cb(fileId);
    await axios.patch(`/bibliographies/custom_file/${fileId}/`, {
      status: 'uploaded'
    });
  } catch (error) {
    console.error('Error:', error);
    err_cb();
  }
};

/**
 * Fetch user's uploaded bibliography files with pagination and filtering options
 * @param {Object} pageParams - Optional query parameters for pagination and filtering
 * @param {number} pageParams.pageSize - Number of files per page
 * @param {string} pageParams.cursor - Pagination cursor for next/previous page
 * @param {string} pageParams.ordering - Sort order for results
 * @param {string} pageParams.status - Filter by file processing status
 * @returns {Promise<{ data: BibliographyFilesResType } | null>} Paginated files response on success, null on error
 */
const getBibliographyFiles = async (pageParams?: {
  pageSize?: number;
  cursor?: string | null;
  ordering?: string;
  status?: string;
}): Promise<{ data: BibliographyFilesResType } | null> => {
  // Only include params with defined values and map to API param names
  const paramMapping = {
    pageSize: 'page_size',
    cursor: 'cursor',
    ordering: 'ordering',
    status: 'status'
  };

  const params = Object.entries(pageParams || {})
    .filter(([_, value]) => value)
    .reduce<Record<string, string | number>>((acc, [key, value]) => {
      const apiKey = paramMapping[key] || key;
      acc[apiKey] = value as any;
      return acc;
    }, {});

  return axios
    .get(
      '/bibliographies/custom_file/',
      Object.keys(params).length ? { params } : {}
    )
    .catch((error) => {
      showErrorMessage(error);
      return null;
    });
};

/**
 * Fetch details of a specific bibliography file by ID
 * @param {string} id - Unique file identifier (primary key)
 * @returns {Promise<any>} File data response on success, undefined on error
 */
const getBibliographyFile = async (id: string): Promise<any> => {
  return await axios
    .get(`/bibliographies/custom_file/${id}/`)
    .then((res) => {
      return res;
    })
    .catch((err) => {
      showErrorMessage(err);
    });
};

/**
 * Permanently delete a bibliography file by ID
 * @param {string} id - Unique file identifier
 * @returns {Promise<any>} Deletion confirmation response on success, undefined on error
 */
const deleteBibliographyFile = async (id: string): Promise<any> => {
  return await axios
    .delete(`/bibliographies/custom_file/${id}/`)
    .then((res) => {
      return res;
    })
    .catch((err) => {
      showErrorMessage(err);
    });
};

/**
 * Update bibliography file metadata (currently only display name)
 * @param {string} id - Unique file identifier
 * @param {Partial<{ name: string }>} data - File properties to update
 * @returns {Promise<any>} Updated file response on success, undefined on error
 */
const updateBibliography = async (
  id: string,
  data: Partial<{ name: string }>
): Promise<any> => {
  return await axios
    .patch(`/bibliographies/custom_file/${id}/`, data)
    .then((res) => {
      return res;
    })
    .catch((err) => {
      showErrorMessage(err);
    });
};

/**
 * Preview bibliography file in browser or download it to local device
 * @param {string} id - Unique file identifier
 * @param {boolean} newTab - True to open file preview in new tab (default), false to trigger file download
 * @returns {Promise<void>}
 */
const openFilePreview = async (id: string, newTab = true): Promise<void> => {
  if (!id) return;

  const res = await getBibliographyFile(id);
  if (!res) return;

  const downloadUrl = res.data?.download_url;
  if (!downloadUrl) return;

  if (newTab) {
    window.open(downloadUrl, '_blank');
  } else {
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = id;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(blobUrl);
  }
};

export {
  updateBibliography,
  postBibliographyFileName,
  getBibliographyFiles,
  deleteBibliographyFile,
  getBibliographyFile,
  openFilePreview
};
