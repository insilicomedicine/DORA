function formatUrl(urlString = '', metadata) {
  const MAX_URL_LENGTH = 30;
  try {
    // Create a new URL object from the input string
    const url = new URL(urlString);
    // Extract the hostname and pathname from the URL
    let hostname = url.hostname;
    const pathname = url.pathname;

    if (metadata?.authors?.length) {
      return defaultFormat(metadata);
    }

    // PMC
    if (
      hostname.startsWith('pmc.') ||
      (hostname.includes('www.ncbi.nlm.nih.gov') && pathname.includes('/pmc/'))
    ) {
      const pmcId = pathname.split('/').find((item) => /^(PMC)\d+$/.test(item));
      if (pmcId) {
        return pmcId.replace('PMC', 'PMCID');
      }
    }
    // pubmed
    if (
      hostname.startsWith('pubmed.') ||
      (hostname.includes('www.ncbi.nlm.nih.gov') &&
        pathname.includes('/pubmed/'))
    ) {
      const pubmedId = pathname.split('/').find((item) => /^\d+$/.test(item));
      if (pubmedId) {
        return 'PMID' + pubmedId;
      }
    }

    // Remove 'www' subdomain if it exists
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Extract the first path segment
    const pathSegment = pathname.split('/')[1] || '';
    // Combine hostname and the first path segment
    const formattedUrl = `${hostname}/${pathSegment}`;
    // If url lenght is less than 30 characters, return it as is
    return `${formattedUrl.substring(0, MAX_URL_LENGTH)}`;
  } catch (_e) {
    return `${urlString.substring(0, MAX_URL_LENGTH)}...`;
  }
}

function defaultFormat(metadata) {
  const { authors = [], pub_year: year } = metadata;
  if (authors?.length === 0) {
    return `Unknown authors, ${year}`;
  } else if (authors.length === 1) {
    return `${authors[0]}, ${year}`;
  } else if (authors.length === 2) {
    return `${authors[0]} & ${authors[1]}, ${year}`;
  } else {
    return `${authors[0]} et al., ${year}`;
  }
}

export const chunksAuthorFormatter = (metadata, type = ''): string => {
  const MAX_FILE_NAME_LENGTH = 34;
  const MAX_URL_LENGTH = 30;
  switch (type) {
    case 'file':
      const { file_name = '' } = metadata;
      // If file_name lenght is less than 30 characters, return it as is
      // Otherwise, return the first 30 characters followed by '...' keeping the original file type (.pdf, .docx, etc.)
      if (file_name.length > MAX_FILE_NAME_LENGTH) {
        const extension = file_name.split('.').pop();
        return `${file_name.substr(0, MAX_URL_LENGTH)}... .${extension}`;
      }
      return file_name;
    case 'websearch':
      const { url = '' } = metadata;
      return formatUrl(url, metadata);
    default:
      return defaultFormat(metadata);
  }
};
