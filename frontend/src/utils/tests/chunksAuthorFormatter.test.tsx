import { chunksAuthorFormatter } from '../chunksAuthorFormatter';

describe('chunksAuthorFormatter', () => {
  it('should format file name correctly', () => {
    const metadata = { file_name: 'example_document.pdf' };
    expect(chunksAuthorFormatter(metadata, 'file')).toBe(
      'example_document.pdf'
    );

    const longFileName =
      'this_is_a_very_long_file_name_that_should_be_truncated.pdf';
    const longMetadata = { file_name: longFileName };
    expect(chunksAuthorFormatter(longMetadata, 'file')).toBe(
      'this_is_a_very_long_file_name_... .pdf'
    );
  });

  it('should format URL correctly', () => {
    const metadata = {
      url: 'https://pmc.example.com/article/PMC1234567',
      authors: []
    };
    expect(chunksAuthorFormatter(metadata, 'websearch')).toBe('PMCID1234567');

    const pubmedMetadata = {
      url: 'https://pubmed.example.com/article/12345678',
      authors: []
    };
    expect(chunksAuthorFormatter(pubmedMetadata, 'websearch')).toBe(
      'PMID12345678'
    );

    const longUrlMetadata = {
      url: 'https://www.example.com/very/long/path/to/resource',
      authors: []
    };
    expect(chunksAuthorFormatter(longUrlMetadata, 'websearch')).toBe(
      'example.com/very'
    );
  });

  it('should format metadata correctly', () => {
    const metadata = { authors: ['John Doe'], pub_year: 2021 };
    expect(chunksAuthorFormatter(metadata)).toBe('John Doe, 2021');

    const multipleAuthorsMetadata = {
      authors: ['John Doe', 'Jane Smith'],
      pub_year: 2021
    };
    expect(chunksAuthorFormatter(multipleAuthorsMetadata)).toBe(
      'John Doe & Jane Smith, 2021'
    );

    const manyAuthorsMetadata = {
      authors: ['John Doe', 'Jane Smith', 'Jim Brown'],
      pub_year: 2021
    };
    expect(chunksAuthorFormatter(manyAuthorsMetadata)).toBe(
      'John Doe et al., 2021'
    );

    const noAuthorsMetadata = { authors: [], pub_year: 2021 };
    expect(chunksAuthorFormatter(noAuthorsMetadata)).toBe(
      'Unknown authors, 2021'
    );
  });
});
