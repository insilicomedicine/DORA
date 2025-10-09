import { PublicationsViewModel } from 'types/bibliography';

export const publicationsViewController = ({
  pubmed_id,
  doi,
  pmc_id,
  ...rest
}: PublicationsViewModel) => {
  const publication_sources_map:
    | {
        [key: string]: { id: string; link: string };
      }
    | undefined = {};
  if (pubmed_id) {
    publication_sources_map.pubmed = {
      id: pubmed_id,
      link: `http://www.ncbi.nlm.nih.gov/pubmed/${pubmed_id}`
    };
  }
  if (doi) {
    publication_sources_map.doi = {
      id: doi,
      link: `https://doi.org/${doi}`
    };
  }
  if (pmc_id) {
    publication_sources_map.pmc = {
      id: pmc_id,
      link: `https://pmc.ncbi.nlm.nih.gov/articles/${pmc_id}/`
    };
  }

  return {
    pubmed_id,
    publicationSourcesMap: publication_sources_map,
    ...rest
  };
};
