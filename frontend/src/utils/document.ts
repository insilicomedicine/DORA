import { chunksAuthorFormatter } from './chunksAuthorFormatter';
import { Bibliography, DocumentData, Metadata, Section } from 'types/document';
import MarkdownIt from 'markdown-it';
import { generateJSON, JSONContent } from '@tiptap/core';
import { generateLinkContent } from './editor';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import CustomSpan from 'pages/Home/components/EditorPanel/components/Editor/components/CustomSpan';
import CustomParagraph from 'pages/Home/components/EditorPanel/components/Editor/components/CustomParagraph';
import { ExtendedLink } from 'pages/Home/components/EditorPanel/components/Editor/components/CustomLink/linkWithCustomAttributes';

interface BibChunkConfig {
  htmlString: string;
  bibliographyList?: Array<any>;
}

interface CombinedBibChunk {
  BIB_ID: string;
  CHUNK_IDs: string[];
}

/**
 * Extracts and processes BIB_ID and CHUNK_ID pairs from HTML string
 * @param {BibChunkConfig} config - Configuration object
 * @returns {string} Processed HTML string with replaced content
 */
const replaceRulesWithLink = ({
  htmlString,
  bibliographyList = []
}: BibChunkConfig): string => {
  if (!htmlString) return '';

  // Base pattern for matching a single BIB_ID and CHUNK_ID pair
  const bibChunkPattern = 'BIB_ID:([\\w-]+),\\s*CHUNK_ID:([\\w-]+)';

  // Main patterns using the base pattern
  const pattern = new RegExp(
    `\\((${bibChunkPattern}(?:;\\s*${bibChunkPattern})*?)\\)`,
    'g'
  );
  const pairPattern = new RegExp(bibChunkPattern, 'g');

  return htmlString.replace(pattern, (_fullMatch, groupContent) => {
    // Create a map to group CHUNK_IDs by BIB_ID
    const bibChunkMap = new Map<string, Set<string>>();
    let pairMatch;

    // Extract and group CHUNK_IDs by BIB_ID
    while ((pairMatch = pairPattern.exec(groupContent)) !== null) {
      const [_, BIB_ID, CHUNK_ID] = pairMatch;
      if (!bibChunkMap.has(BIB_ID)) {
        bibChunkMap.set(BIB_ID, new Set());
      }
      bibChunkMap.get(BIB_ID)?.add(CHUNK_ID);
    }

    // Convert map to array of combined chunks
    const combinedPairs: CombinedBibChunk[] = Array.from(
      bibChunkMap.entries()
    ).map(([BIB_ID, CHUNK_IDs]) => ({
      BIB_ID,
      CHUNK_IDs: Array.from(CHUNK_IDs)
    }));

    // Process each combined pair
    const processedContent = combinedPairs
      .map((pair, index) => {
        const bibItem = bibliographyList.find(
          (item) => item?.id === pair.BIB_ID
        );
        if (!bibItem) return '';

        const { metadata = {}, type = '' } = bibItem;
        const isCustomLink = ['file', 'websearch'].includes(type);

        return generateLinkContent({
          id: pair.BIB_ID,
          chunkIds: pair.CHUNK_IDs,
          linkText: chunksAuthorFormatter(metadata, type),
          isFirst: index === 0,
          isLast: index === combinedPairs.length - 1,
          href: isCustomLink
            ? '#'
            : `https://pubmed.ncbi.nlm.nih.gov/${metadata?.pubmed_id}`,
          ...(isCustomLink && {
            customAttrs: {
              'data-type': type,
              'data-custom_text': metadata?.file_name || metadata?.url
            }
          })
        });
      })
      .join('');

    return processedContent;
  });
};

/**
 * Converts markdown text to HTML with additional processing for links and attributes.
 * This function uses a markdown parser to transform markdown syntax into HTML,
 * then applies custom link processing and attribute additions.
 *
 * @param markdown - The markdown string to convert.
 * @param parentId - The parent ID to associate with the content.
 * @param bibliographyList - List of bibliography metadata items.
 * @returns The resulting HTML string with custom processing.
 */
const convertMarkdownToHtml = (
  markdown: string,
  bibliographyList: Bibliography[] = []
): string => {
  // Initialize a markdown-it parser instance
  const md = new MarkdownIt();

  // Convert the markdown string to HTML
  const htmlString = md.render(markdown);

  // Replace specific rules in the HTML with links using the provided bibliography list
  const markdownWithLinks = replaceRulesWithLink({
    htmlString,
    bibliographyList
  });

  // Return the processed HTML content
  return markdownWithLinks;
};

/**
 * Converts markdown text to Tiptap JSON format.
 * This function first converts markdown to HTML, then transforms the HTML into a JSON format
 * suitable for use with the Tiptap editor, including custom link attributes.
 *
 * @param markdown - The markdown string to convert.
 * @param parentId - The parent ID to associate with the content.
 * @param bibliographyList - List of bibliography metadata items.
 * @returns An array of JSONContent objects representing the document.
 */
const convertMarkdownToTiptapJSON = (
  markdown: string,
  parentId: string = '',
  bibliographyList: Bibliography[] = []
): JSONContent[] => {
  // Return an empty array if the markdown input is empty
  if (!markdown) return [];
  // Convert markdown to HTML
  const htmlString = convertMarkdownToHtml(markdown, bibliographyList);
  // Generate JSON content from the HTML string
  const JSONContent = generateJSON(htmlString, [
    StarterKit.configure({
      paragraph: false
    }),
    ExtendedLink,
    CustomSpan,
    CustomParagraph({
      defaultParentId: parentId
    }),
    Table,
    TableRow,
    TableHeader,
    TableCell
  ]);

  // Add custom attributes to all first-level nodes in the JSONContent
  // This ensures that all top-level elements have the necessary attributes
  if (JSONContent.content && Array.isArray(JSONContent.content)) {
    JSONContent.content = JSONContent.content.map((node) => {
      // Add custom attributes to the node
      return {
        ...node,
        attrs: {
          ...node.attrs,
          'data-parent': parentId
        }
      };
    });
  }
  return JSONContent.content || [];
};

/**
 * Converts document data into a formatted document structure
 * @param documentData - The document object to convert
 * @param bibliographyList - List of bibliography references
 */
const convertToEditorDocument = (
  documentData: DocumentData,
  bibliographyList: Bibliography[] = []
) => {
  const isPolising = documentData.stage === 'polishing';

  //Creates section title content with proper attributes
  const createSectionTitle = (item: Section, level: number): JSONContent => {
    const isPolisingFailed = isPolising && item.status === 'failed';

    return {
      ...item,
      id: item.id,
      name: item.title,
      label: item.title,
      type: 'reactComponent',
      attrs: {
        id: item.id,
        title: item.title,
        className: `sectionTitle title ${item.slug === 'main_text' && documentData.sections.length === 1 ? 'hidden' : ''}`,
        level: level,
        type: `h${level}`,
        componentType: 'SectionTitle',
        contenteditable: item.status === 'completed',
        isRequired: true,
        isPolising: !!item.refined_result || isPolisingFailed,
        isPolisingFailed,
        errorMessage: 'Please enter the heading of the section'
      },
      content: [
        {
          type: 'text',
          text: item.title
        }
      ]
    };
  };

  // Creates feedback component if needed
  const createFeedback = (item: Section): JSONContent => {
    return item.status === 'completed'
      ? {
          type: 'reactComponent',
          attrs: {
            id: item.id,
            componentType: 'Feedback',
            isHidden: item.like !== null || item.sub_sections?.length > 0
          }
        }
      : {};
  };

  // Processes section content including subsections
  const processSection = (item: Section, level: number = 2): JSONContent[] => {
    // Process section data
    const sectionResult = item.refined_result || item.result;
    const isGenerating = item.status === 'in_progress';
    // Generate section content
    // Define generating content for in-progress sections
    const generatingContent = [
      {
        type: 'paragraph',
        attrs: {
          class: 'textSkeleton',
          contenteditable: false
        }
      }
    ];
    const resultData: JSONContent[] = isGenerating
      ? generatingContent
      : sectionResult?.data_format ||
        convertMarkdownToTiptapJSON(
          sectionResult?.data,
          item.id,
          bibliographyList
        );

    // Add section title
    resultData.unshift(createSectionTitle(item, level));

    // Add feedback component if needed
    resultData.push(createFeedback(item));

    // Process subsections recursively
    if (item.sub_sections?.length) {
      item.sub_sections.forEach((subItem) => {
        subItem.label = subItem.title;
        resultData.push(...processSection(subItem, level + 1));
      });
    }

    return resultData;
  };

  // Process all sections
  const content =
    documentData.sections?.map((item) => {
      item.label = item.title;
      return processSection(item);
    }) || [];

  // Create final document structure
  const doc = {
    ...documentData,
    name: documentData.title,
    type: 'doc',
    content: [
      {
        type: 'reactComponent',
        attrs: {
          id: documentData.id,
          level: 1,
          type: 'h1',
          componentType: 'SectionTitle',
          className: 'paperTitle title',
          contenteditable: documentData.status === 'completed',
          isRequired: true,
          isReadOnly: true,
          errorMessage: 'Please enter the title of the document',
          title: documentData.title
        },
        content: [
          {
            type: 'text',
            text: documentData.title
          }
        ]
      },
      {
        type: 'reactComponent',
        attrs: {
          id: documentData.id,
          componentType: 'Diagram',
          isReadOnly: true,
          contenteditable: false
        }
      },
      ...content.flat().filter((item) => item.type)
    ]
  };

  return { doc };
};

const convertItemContentToDataString = (
  contents: JSONContent[] = [],
  type?: string,
  itemIndex?: number,
  rootAttrs?: Record<string, any>
) => {
  return contents.map((content: JSONContent, index: number) => {
    const { marks = [], text = '' } = content;
    if (marks[0]?.type === 'link' && !['(', ')', '; '].includes(text)) {
      const attrs = marks[0].attrs;
      const chunkIds = attrs?.['data-chunk_id']?.split(',') || [];
      const referenceContent = chunkIds.map((chunkId) => {
        return `${text.match('\\(')?.[0] || ''} BIB_ID:${attrs?.id}, CHUNK_ID:${chunkId}${text.match(';')?.[0] || ''}${text.match('\\)')?.[0] || ''}`;
      });
      return referenceContent.join('; ');
    }
    const inlineContent = content.content;

    if (marks.some((mark) => mark.type === 'bold')) {
      return `**${text}**`;
    }
    if (marks.some((mark) => mark.type === 'italic')) {
      return `_${text}_`;
    }

    if (type === 'blockquote' && inlineContent?.length) {
      return `> ${inlineContent.map((it) => it.text).join('')}\n`;
    }

    if (!inlineContent || !inlineContent.length) {
      //Add support for ordered and bullet list
      if (type === 'orderedList') {
        return `${itemIndex}. ${text}\n`;
      }
      if (type === 'bulletList') {
        return `- ${text}\n`;
      }

      if (type === 'heading') {
        const level = rootAttrs?.level || 1;
        return `${'#'.repeat(level)} ${text}\n`;
      }

      if (type === 'table') {
        const { rowType, isNewLine, cellIndex = 0 } = rootAttrs || {};

        if (rowType === 'tableHeader' && isNewLine) {
          // End of header row cell
          return ` | ${text.trim()}`;
        } else if (rowType === 'tableCell' && cellIndex >= 1) {
          // Cell in data row (not first cell)
          return `\n${text.trim()}`;
        } else {
          // First cell in a row (add leading pipe)
          const leadingPipe = !index ? '|' : '';
          return ` ${leadingPipe} ${text.trim()}`;
        }
      }

      return text;
    }

    // Handle table conversion
    if (type === 'table') {
      const rows = content.content || [];

      // Early return for empty tables
      if (rows.length === 0) return [''];

      const markdownRows = rows.map((row: JSONContent) => {
        const cells = row.content || [];

        // Process each cell in the row
        const cellTexts = cells.map((cell: JSONContent, cellIndex: number) => {
          // Extract text from paragraph content
          return convertItemContentToDataString(cell.content, type, ++index, {
            rowType: row.type,
            cellIndex,
            isNewLine: cellIndex === cells.length - 1
          }).join('');
        });

        return cellTexts;
      });

      // Check if the first row is a header row
      const hasHeaderRow = rows.length > 0 && rows[0]?.type === 'tableHeader';
      // Add separator row after header if header exists
      if (hasHeaderRow) {
        // Create a separator with the right number of columns
        // Format: | --- | --- | --- |
        const separatorCells = Array(rows.length).fill('------------');
        const separator = ` |\n| ${separatorCells.join(' | ')} |\n`;
        markdownRows.push([separator]);
      } else {
        // Add closing pipe for the table
        markdownRows.push([' |\n']);
      }

      return markdownRows.join('');
    }

    //Add support for nested inline items
    return inlineContent
      .map((inlineItem: JSONContent) => {
        const { content: itemContent = [] } = inlineItem;
        return convertItemContentToDataString(itemContent, type, ++index);
      })
      .join('');
  });
};

const convertToDataString = (data) => {
  return data
    .map((item: JSONContent) => {
      if (!item.content) return '';
      return convertItemContentToDataString(
        item.content,
        item.type,
        undefined,
        item.attrs
      ).join('');
    })
    .join('\n');
};

/**
 * Converts chunks to bibliographies
 * @param chunks - The chunks to convert
 * @param bibliographyList - The bibliography list to convert
 * @returns The bibliographies
 */
const convertToBibliographies = (
  chunks: Record<string, any> = {},
  bibliographyList: Metadata[] = []
) => {
  if (!bibliographyList.length) {
    return chunks.map((item) => {
      return {
        uid: item.chunk_id,
        metadata: {
          ...item.metadata
        },
        chunks: {
          [item.chunk_id]: item.chunk
        }
      };
    });
  }

  chunks.forEach((item) => {
    chunks[item.pubmed_id] = {
      ...chunks[item.pubmed_id],
      [item.chunk_id]: item.fulltext_chunk || item.abstract_chunk
    };
  });

  const bibliographies = [...bibliographyList]?.map((item) => {
    return {
      uid: item.pubmed_id || item.pmc_id,
      metadata: { ...item },
      chunks: chunks[item.pubmed_id || ''] || {}
    };
  });

  return bibliographies;
};

export {
  replaceRulesWithLink,
  convertMarkdownToTiptapJSON,
  convertToEditorDocument,
  convertToDataString,
  convertToBibliographies
};
