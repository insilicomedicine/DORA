import { Editor, JSONContent } from '@tiptap/core';
import { Transaction } from 'prosemirror-state';
import { DOMSerializer } from 'prosemirror-model';
import { DocumentStage, DocumentStatus, Section } from 'types/document';
import { exportDocument } from 'services/documents';
import { sendGA4Event } from './ga';

export const INLINE_CITATION_TEXT = 'Citation';

interface NodePosition {
  startPos: number;
  endPos: number;
}

type DeleteMode = 'all' | 'content';

type SelectionMetadata = {
  BIB_ID: string;
  CHUNK_ID: string;
  text_chunk: string;
};

interface GenerateLinkContentProps {
  id?: string;
  chunkIds?: string[];
  linkText?: string;
  href?: string;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
  customAttrs?: Record<string, string>;
  source?: string;
}

export function generateLinkContent({
  id,
  chunkIds,
  linkText,
  isFirst,
  isLast,
  href = '#',
  className = '',
  customAttrs = {},
  source = 'add_reference'
}: GenerateLinkContentProps): string {
  if (!id) {
    return `<span><span class='citationText'>(</span><span id="citation-placeholder" contenteditable="false" class="citation-placeholder">${INLINE_CITATION_TEXT}</span><span class='citationText'>)</span></span>`;
  }
  return `<a id="${id}" 
    data-chunk_id="${chunkIds?.join(',')}" 
    data-source="${source}"
    class="references ${className}"
    rel="noopener noreferrer nofollow" 
    href="${href}"
    ${Object.entries(customAttrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')}
    >${isFirst ? '<span>(</span>' : ''}<span contenteditable="false" class="${className}">${linkText}</span><span>${isLast ? ')' : '; '}</span></a>`;
}

export function isSelectionPartOfReferences() {
  const selection = window.getSelection();
  if (!selection || !selection?.rangeCount || !selection?.toString()) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const references: any = document.querySelectorAll('a.references');

  const getNodeMaxOffset = (node: Node): number => {
    if (!node) return 0;
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      return textNode.data?.length ?? 0;
    }
    return node.childNodes?.length ?? 0;
  };

  for (const ref of references) {
    const refRange = document.createRange();
    refRange.selectNodeContents(ref);
    // Clamp offsets to valid bounds to avoid IndexSizeError
    const safeStartOffset = Math.max(
      0,
      Math.min(range.startOffset - 1, getNodeMaxOffset(range.startContainer))
    );
    const safeEndOffset = Math.max(
      0,
      Math.min(range.endOffset + 1, getNodeMaxOffset(range.endContainer))
    );

    if (
      refRange.isPointInRange(range.startContainer, safeStartOffset) ||
      refRange.isPointInRange(range.endContainer, safeEndOffset)
    ) {
      return true;
    }
  }

  return false;
}

export function covertToDocument(data: any) {
  return {
    id: data.id,
    name: data.name,
    content: data.content,
    created: data.created,
    updated: data.updated
  };
}

export function findTargetSection(sections: any = [], parentId) {
  let targetSection: any = {};
  const findTargetSection = (sections: any = [], parentId) => {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.id === parentId) {
        targetSection = section;
      }
      if (section.sub_sections) {
        findTargetSection(section.sub_sections, parentId);
      }
    }
  };
  findTargetSection(sections, parentId);
  return targetSection;
}

export function getSelectionMetadata(content: any, chunks: any) {
  const metadata: Array<SelectionMetadata> = [];
  const pattern = /BIB_ID:\s*([a-fA-F0-9-]+), CHUNK_ID:\s*([a-fA-F0-9-]+)/gi;
  const matches = content?.match(pattern);

  matches?.forEach((match) => {
    const [BIB_ID, CHUNK_ID] = match.split(',').map((item) => item.trim());
    const _ID = BIB_ID.split(':')[1];
    const _CHUNK_ID = CHUNK_ID.split(':')[1]?.trim();

    const targetChunk = chunks.find((chunk) =>
      [chunk?.id, chunk.metadata?.pubmed_id?.toString()].includes(_ID)
    );

    const _BIB_ID = targetChunk?.id || targetChunk?.metadata?.pubmed_id;
    const text_chunk = targetChunk?.chunks[_CHUNK_ID];

    _CHUNK_ID &&
      text_chunk &&
      metadata.push({
        BIB_ID: _BIB_ID,
        CHUNK_ID: _CHUNK_ID,
        text_chunk
      });
  });
  return metadata;
}

export function removeHtmlTags(str) {
  if (!str) return;
  else str = str?.toString();
  return str?.replace(/(<([^>]+)>)/gi, '');
}

export function removeMarkTags(str) {
  if (!str) return;
  else str = str.toString();
  return str.replace(/<mark[^>]*>|<\/mark>/gi, '');
}

export function getSelectionTextClientRect() {
  const selection = window.getSelection();
  if (!selection) return 0;
  if (selection.rangeCount === 0) {
    return 0;
  }
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return rect;
}

export function getSelectionContext(content) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!content) return;
  const selectedStart = range.startOffset;
  const selectedEnd = range.endOffset;
  const sentences = content
    .split('.')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  let finalText = '';
  sentences.forEach((sentence) => {
    if (
      content.indexOf(sentence) <= selectedEnd &&
      content.indexOf(sentence) + sentence.length >= selectedStart
    ) {
      finalText += `${sentence}. `;
    }
  });
  if (!finalText) {
    sentences.forEach((sentence) => {
      if (
        content.indexOf(sentence) <= selectedStart &&
        content.indexOf(sentence) + sentence.length >= selectedEnd
      ) {
        finalText = sentence;
      }
    });
  }
  return finalText.trim();
}

export function formatHtmlToTextWithPlaceholder(htmlString, chunks) {
  let htmlStringWithoutMarkTags = removeMarkTags(htmlString);
  htmlStringWithoutMarkTags = htmlStringWithoutMarkTags.replace(/&nbsp;/g, '');
  const pattern =
    /<a\s+[^>]*id="([a-fA-F0-9-]+)"[^>]*data-chunk_id="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  const pmidsAndChunkIdsMap = {};
  const convertedText = htmlStringWithoutMarkTags?.replace(
    pattern,
    (_, id, chunkIds, value) => {
      const targetChunk = chunks.find((chunk) =>
        [chunk?.id, chunk.metadata?.pubmed_id?.toString()].includes(id)
      );
      const BIB_ID = targetChunk?.id || targetChunk?.metadata?.pubmed_id;
      const hasLeftBracket = value.includes('(');
      const hasRightBracket = value.includes(')');
      const text = removeHtmlTags(value);
      const placeHolderText = text.replace(/[.\s]/gi, '_');
      const allChunkIds = chunkIds.split(',');
      const pmidsAndChunkIdText = allChunkIds
        .map((chunkId) => `BIB_ID:${BIB_ID || id}, CHUNK_ID:${chunkId}`)
        .join('; ');
      pmidsAndChunkIdsMap[text.replace(/&amp;/g, '&')] =
        `${hasLeftBracket ? '(' : ''}${pmidsAndChunkIdText}${hasRightBracket ? ')' : '; '}`;
      return placeHolderText;
    }
  );
  return { convertedText, pmidsAndChunkIdsMap };
}

export function findTextContext(content, queryText, { startIndex, endIndex }) {
  const query = queryText.trim();
  const queryPosition = startIndex || content.indexOf(query);
  if (queryPosition === -1) return '';
  let sentenceStart = content.lastIndexOf('.', queryPosition);
  sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
  let sentenceEnd = content.indexOf('.', endIndex);
  sentenceEnd = sentenceEnd === -1 ? content.length : sentenceEnd + 1;
  const fullSentence = content.slice(sentenceStart, sentenceEnd).trim();
  return fullSentence;
}

export function formatSentencesToPmidsAndChunkIds(editor, data, startPos) {
  const { pmidsAndChunkIdsMap = {} } = data;
  const { state } = editor || {};
  const { from = 0, to = 0 } = state?.selection || {};
  const documentSize = state?.doc?.content?.size;
  const endPos = to + 1000 > documentSize ? documentSize : to + 1000;
  let queryText = state?.doc.textBetween(from, to, ' ');
  let paragraphText = state?.doc.textBetween(startPos, endPos, ' ');
  Object.keys(pmidsAndChunkIdsMap).forEach((key) => {
    const _key = key.trim();
    const placeHolderKey = key.replace(/[.\s]/gi, '_');
    queryText = queryText.replaceAll(_key, placeHolderKey);
    paragraphText = paragraphText.replaceAll(_key, placeHolderKey);
  });
  let queryTextContext = findTextContext(paragraphText, queryText, {
    startIndex: from - startPos,
    endIndex: to - startPos
  });
  Object.keys(pmidsAndChunkIdsMap).forEach((key) => {
    const placeHolderKey = key.replace(/[.\s]/gi, '_');
    const _key = key.replace(/&amp;/g, '&');
    queryText = queryText.replaceAll(placeHolderKey, pmidsAndChunkIdsMap[_key]);
    queryTextContext = queryTextContext.replaceAll(
      placeHolderKey,
      pmidsAndChunkIdsMap[_key]
    );
  });
  return { queryText, queryTextContext };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidSelectionText(
  selectedContext: string,
  selectionText: string
) {
  if (!selectionText || !selectionText.trim()) return false;
  const words = selectionText.trim().split(/\s+/);
  if (/^[^\w\s]+$/.test(selectionText)) return false;
  const escapedSelectionText = escapeRegExp(selectionText.trim());
  const regex = new RegExp(`\\b${escapedSelectionText}(?!\\w|\\d)`, 'i');
  const hasMultipleWords = words.length > 1;
  if (hasMultipleWords) {
    return words.some((word) => isValidSelectionText(selectedContext, word));
  }

  return regex.test(selectedContext);
}

export function scrollToSection(e, id) {
  e?.stopPropagation();
  const element = document.getElementById(id);
  if (element) {
    document
      .getElementById('editorContentContainer')
      ?.scrollTo({ behavior: 'smooth', top: element.offsetTop - 20 });
  }
}

export function getAllSectionsByField(
  data: Section[],
  field: string,
  value?: string
) {
  let sections: any = [];
  data.forEach((item: any) => {
    if ((!value && item[field]) || (value && item[field] === value)) {
      sections.push(item);
    }
    if (item.sub_sections) {
      sections = [
        ...sections,
        ...getAllSectionsByField(item.sub_sections, field, value)
      ];
    }
  });
  return sections;
}

export function getAllSectionsByFields(
  data: Section[] = [],
  fields: Record<string, any> = {}
) {
  let sections: any = [];
  data.forEach((item: any) => {
    const isMatched = Object.keys(fields).some(
      (key) =>
        (typeof fields[key] === 'boolean' && item[key]) ||
        item[key] === fields[key]
    );
    if (isMatched) {
      sections.push(item);
    }
    if (item.sub_sections) {
      sections = [
        ...sections,
        ...getAllSectionsByFields(item.sub_sections, fields)
      ];
    }
  });
  return sections;
}

export function updateSectionData(sections: any = [], id, attrs) {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.id === id) {
      sections[i] = { ...section, ...attrs };
    } else {
      updateSectionData(section.sub_sections, id, attrs);
    }
  }
  return sections;
}

export function updatePapers(papers, id, sectionId, attrs, type) {
  const _papers = papers.map((item) => {
    if (item.id === id) {
      if (type === 'section') {
        return {
          ...item,
          sections: updateSectionData(item.sections, sectionId, attrs)
        };
      }
      return { ...item, ...attrs };
    }
    return item;
  });

  return _papers;
}

export function getSectionContent(
  content: JSONContent[],
  id: string
): JSONContent[] {
  const hasDataParent = (item?: JSONContent): boolean =>
    item?.attrs?.['data-parent'] === id;

  // Helper function to recursively clean bgFadeOutAnimation class at all levels
  const cleanItemRecursively = (item: JSONContent): JSONContent => {
    // Clean class at current level
    if (item?.attrs?.class) {
      item.attrs.class = item.attrs.class
        .replace(/\bbgFadeOutAnimation\b/g, '')
        .trim();
      // Remove class attribute if it's empty
      if (!item.attrs.class) {
        delete item.attrs.class;
      }
    }

    // Clean marks classes in text nodes
    if (item?.marks) {
      item.marks = item.marks.map((mark) => {
        if (mark?.attrs?.class === 'bgFadeOutAnimation') {
          mark.attrs.class = null;
        } else if (mark?.attrs?.class?.includes('bgFadeOutAnimation')) {
          mark.attrs.class = mark.attrs.class
            .replace(/\bbgFadeOutAnimation\b/g, '')
            .trim();
          if (!mark.attrs.class) {
            mark.attrs.class = null;
          }
        }
        return mark;
      });
    }

    // Clean classes in nested content
    if (item?.content?.length) {
      item.content = item.content.map(cleanItemRecursively);
    }

    return item;
  };

  // Remove class bgFadeOutAnimation from content attrs for each item at all levels
  const cleanedContent = content.map(cleanItemRecursively);

  return cleanedContent.filter(
    (item) =>
      hasDataParent(item) ||
      hasDataParent(item?.content?.[0]) ||
      hasDataParent(item?.content?.[0]?.content?.[0])
  );
}

export function getAllAbstractChunkTexts(chunks: {}, targetChunkIds: string) {
  const chunkIds = targetChunkIds?.split(',');
  const abstractChunks = chunkIds?.map((id) => {
    return chunks[id]?.split('\n');
  });
  return abstractChunks?.filter((item) => item);
}

export function isSelectionIncludeElementBySelector(selector) {
  const selection = window.getSelection();
  // If there's no selection or it's empty, exit early
  if (!selection || selection.isCollapsed) {
    return false;
  }

  let sectionTitleSelected = false;
  // Loop through the selected ranges
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    // Get the common ancestor container of the range
    const commonAncestor = range.commonAncestorContainer as HTMLElement;
    // If the common ancestor itself is .sectionTitle, mark as true
    if (
      commonAncestor.nodeType === Node.ELEMENT_NODE &&
      commonAncestor.classList.contains(selector)
    ) {
      sectionTitleSelected = true;
      break;
    }
    // Otherwise, traverse all nodes within the range
    const nodes = document.createNodeIterator(
      commonAncestor,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: any) => {
          // Check if the node is part of the selection range
          if (range.intersectsNode(node) && node.classList.contains(selector)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let currentNode;
    while ((currentNode = nodes.nextNode())) {
      if (currentNode.classList.contains(selector)) {
        sectionTitleSelected = true;
        break;
      }
    }
  }
  return sectionTitleSelected;
}

const VALID_HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function getHtmlTagByType(type) {
  return VALID_HEADING_TAGS.has(type) ? type : 'div';
}

// Function to get HTML of the current selection
export function getEditorSelectionHtml(editor) {
  const { state } = editor;
  const { selection } = state;
  // Check if a selection is made
  if (selection.empty) {
    return '';
  }
  // Extract the fragment from the document using the selection's from and to positions
  const fragment = state.doc.slice(selection.from, selection.to).content;
  // Create a ProseMirror DOMSerializer from the editor schema
  const serializer = DOMSerializer.fromSchema(editor.schema);
  // Create a temporary document fragment to which we'll serialize the selection
  const tempFragment = document.createDocumentFragment();
  // Serialize each node in the fragment to the temporary fragment
  fragment.forEach((node) => {
    tempFragment.appendChild(serializer.serializeNode(node));
  });
  // Create a temporary div to extract the HTML from the fragment
  const div = document.createElement('div');
  div.appendChild(tempFragment);
  // Return the HTML content as a string
  return div.innerHTML;
}

export function getSectionId(element) {
  if (!element) return;

  const getParentId = (el) => el?.getAttribute('data-parent');

  const parentId = [
    element,
    element.parentNode as HTMLElement,
    element.parentNode?.parentNode as HTMLElement,
    element.closest('p') as HTMLElement,
    element.closest('table') as HTMLElement
  ].find((el) => getParentId(el));

  return getParentId(parentId);
}

/**
 * Retrieves the section id (data-parent) using the current transaction selection.
 * This works even if the DOM target is a deeply nested inner tag (e.g., span, a).
 */
export function getSectionIdFromTransaction(
  transaction: Transaction
): string | undefined {
  if (!transaction) return undefined;
  const { selection, doc } = transaction as any;
  if (!selection || !doc) return undefined;

  const from: number = selection.from;
  const resolvedPos = doc.resolve(from);

  const getAttr = (node?: any) => node?.attrs?.['data-parent'];

  // Try node at current position and the one before (common at boundaries)
  const directMatch =
    getAttr(doc.nodeAt(from)) || getAttr(doc.nodeAt(from - 1));
  if (directMatch) return directMatch;

  // Check parent chain from the current depth up to the root
  for (let depth = resolvedPos.depth; depth >= 0; depth--) {
    const nodeAtDepth = resolvedPos.node(depth);
    const id = getAttr(nodeAtDepth);
    if (id) return id;
  }

  return undefined;
}

export function isLink(node) {
  if (!node) return false;
  const nodeName = node?.nodeName;
  if (nodeName !== 'A') {
    const parentNode = node.parentNode as HTMLElement;
    const isVaildLink = !!parentNode?.closest('a')?.getAttribute('href');
    return parentNode?.nodeName === 'A' || isVaildLink;
  }
  return true;
}

export const checkShouldShowStatus = (
  isPaperCompleted: boolean,
  stage: DocumentStage,
  checkedStatus: DocumentStatus
): boolean => {
  if (!isPaperCompleted) {
    return ['polishing'].includes(stage)
      ? ['in_progress', 'polishing'].includes(checkedStatus)
      : ['in_progress', 'completed', 'failed'].includes(checkedStatus);
  }
  return ['failed', 'limited', 'polishing'].includes(checkedStatus);
};

export const handleDocumentScroll = (
  e: React.UIEvent<HTMLElement>,
  isScrollingDocumentPageContent: boolean,
  paperSections: any[],
  setActiveSectionId: (id: string) => void
) => {
  if (isScrollingDocumentPageContent) return;

  const target = e.target as HTMLElement;
  const viewportThreshold = { top: 100, bottom: 200 };

  const isElementInViewport = (element: HTMLElement) => {
    const { top } = element.getBoundingClientRect();
    return top >= viewportThreshold.top && top <= viewportThreshold.bottom;
  };

  let visibleSection: any = {};
  const findTargetVisibleSection = (sections: any = []) => {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionElement = target.querySelector(`[id="${section.id}"]`);
      if (
        sectionElement &&
        isElementInViewport(sectionElement as HTMLElement)
      ) {
        visibleSection = section;
      }
      if (section.sub_sections) {
        findTargetVisibleSection(section.sub_sections);
      }
    }
  };
  findTargetVisibleSection(paperSections);

  if (visibleSection.id) {
    setActiveSectionId(visibleSection.id);
  }
};

/**
 * Calculates the position of a given DOM element within the editor's document.
 * This function determines the position based on the element's sibling or the document's size.
 *
 * @param element - The DOM element for which to calculate the position.
 * @param editor - The editor instance containing the document.
 * @returns The position of the element in the document.
 */
const calculateEndPosition = (
  element: Element | null,
  editor: Editor
): number => {
  // If the element is null, return 0 as a default position
  if (!element) return 0;

  // Check if the element has a next sibling
  const nextElement =
    element.nextElementSibling || element.parentNode?.parentNode?.nextSibling;

  if (nextElement) {
    // Calculate the position at the start of the next sibling
    // Subtract 1 to get the position just before the next sibling
    return editor.view.posAtDOM(nextElement, 0) - 1;
  }

  // If there is no next sibling, return the size of the document's content
  // This indicates the position at the end of the document
  return editor.state.doc.content.size;
};

export function getNodePositionById(
  id: string,
  editor: Editor,
  mode: DeleteMode = 'all'
): NodePosition {
  // Input validation
  if (!id?.trim() || !editor?.view?.posAtDOM) {
    throw new Error('Valid ID and editor instance are required');
  }

  // Get DOM elements with the given ID
  const selector = `${mode === 'content' ? 'p' : ''}[data-parent="${id}"]`;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  if (!elements?.length) return { startPos: 0, endPos: 0 };

  // Multiple paragraphs case
  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];
  return {
    startPos: editor.view.posAtDOM(firstElement, 0) - 1,
    endPos: calculateEndPosition(lastElement, editor)
  };
}

/**
 * Deletes a node and its children from the editor by ID
 * @param id - The ID of the node to delete
 * @param editor - The editor instance
 * @param content - Optional content to replace the deleted node
 * @throws Error if node with ID not found
 */
export function deleteNodeById(
  id: string,
  editor: Editor,
  mode?: DeleteMode
): void {
  const { startPos: from = 0, endPos: to = 0 } = getNodePositionById(
    id,
    editor,
    mode
  );
  if (!from || !to) return;
  editor.commands.insertContentAt({ from: from, to }, '', {
    updateSelection: false
  });
}

/**
 * Gets all influenced section IDs and subsection IDs for a given section
 * @param sectionId - The ID of the target section
 * @param sections - Array of all sections
 * @param sectionInfluences - Map of section slug to influenced section slugs
 * @returns Array of influenced section IDs
 */
export function getAllSectionsIdsByDeps(
  sectionId: string,
  sections: any[],
  sectionInfluences: Record<string, string[]>
): string[] {
  const slugToIdMap = new Map<string, string>();
  const sectionByIdMap = new Map<string, any>();

  sections.forEach(function map(section) {
    slugToIdMap.set(section.slug, section.id);
    sectionByIdMap.set(section.id, section);
    section.sub_sections?.forEach(map);
  });

  const allIds = new Set<string>();

  function collectIds(slug: string): void {
    const id = slugToIdMap.get(slug);
    if (id && !allIds.has(id)) {
      allIds.add(id);
      const section = sectionByIdMap.get(id);
      section?.sub_sections?.forEach((sub) => collectIds(sub.slug));
      sectionInfluences[slug]?.forEach(collectIds);
    }
  }

  const initialSection = sectionByIdMap.get(sectionId);
  initialSection && collectIds(initialSection.slug);

  return Array.from(allIds);
}

/**
 * Gets all sub sections ids for a given section
 * @param sectionId - The ID of the target section
 * @param sections - Array of all sections
 * @returns Array of section IDs
 */
//the order should be from parent to child keep order align with the sections
export function getAllSubSectionsIds(
  sectionId: string,
  sections: any[]
): string[] {
  const idMap = new Map<string, any>();
  sections.forEach((section) => idMap.set(section.id, section));

  const allIds = new Set<string>();
  const stack = [sectionId];

  while (stack.length) {
    const currentId = stack.shift();
    if (currentId && !allIds.has(currentId)) {
      allIds.add(currentId);
      const section = idMap.get(currentId);
      if (section && section.sub_sections) {
        stack.push(...section.sub_sections.map((subSec: any) => subSec.id));
      }
    }
  }

  return Array.from(allIds);
}

/**
 * Gets parent section for a given section id
 * @param sectionId - The ID of the target section
 * @param sections - Array of all sections
 * @returns Array of section IDs
 */
export function getParentSectionId(sectionId: string, sections: any[]): any {
  const idMap = new Map<string, any>();
  sections.forEach((section) => idMap.set(section.id, section));

  let parentSection = {};
  const stack = [sections];

  while (stack.length) {
    const currentSections = stack.pop();
    if (!currentSections) continue;
    for (const section of currentSections) {
      if (section.sub_sections) {
        for (const subSec of section.sub_sections) {
          if (subSec.id === sectionId) {
            parentSection = section;
            break;
          }
        }
        stack.push(section.sub_sections);
      }
    }
  }

  return parentSection;
}

//Selected style for reference link
export const generateReferenceStyle = (
  referenceLinkTarget: Record<string, any> = {}
) => {
  if (!referenceLinkTarget.id) return {};

  return {
    [`& .ProseMirror-focused a.references[data-unique-id="${referenceLinkTarget.id}"]`]:
      {
        color: 'white',
        backgroundColor: 'primary.main',
        animation: 'unset'
      }
  };
};

// Define tooltip message types
type TooltipType = 'isTextIncludesTitle' | 'isTextTooLong';

// Define tooltip messages as constants
const TOOLTIP_MESSAGES = {
  isTextIncludesTitle:
    'The selected text spans multiple sections.\nPlease highlight text within a single section and try again.',
  isTextTooLong:
    'The selected text is too long.\nPlease select a shorter part and try again.'
} as const;

/**
 * Returns tooltip text based on validation type
 * @param type - Type of tooltip to display
 * @returns Tooltip message string
 */
export const getBubbleMenuTooltipText = (type: TooltipType): string => {
  return TOOLTIP_MESSAGES[type] || '';
};

export const isEnableBubbleMenu = (editor) => {
  //set selected text
  const { state } = editor || {};
  const { from = 0, to = 0 } = state?.selection || {};
  const selectedText = state?.doc.textBetween(from, to, ' ');
  const focusNode = window.getSelection()?.focusNode;
  const nodeName = focusNode?.parentNode?.nodeName;
  //disable bubble menus( reference links, < 1 word etc.)

  if (
    isLink(focusNode) ||
    !nodeName ||
    ['HTML'].includes(nodeName) ||
    !selectedText.trim() ||
    isSelectionIncludeMultipleTableCells()
  )
    return false;
  return true;
};

export function isSelectionIncludeMultipleTableCells() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return false;
  }

  let tableCellCount = 0;
  // Loop through the selected ranges
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    // Get the common ancestor container of the range
    const commonAncestor = range.commonAncestorContainer as HTMLElement;

    // If the common ancestor itself is a table cell, increment count
    if (
      commonAncestor.nodeType === Node.ELEMENT_NODE &&
      ['TD', 'TH'].includes(commonAncestor.tagName)
    ) {
      tableCellCount++;
    }

    // Traverse all nodes within the range
    const nodes = document.createNodeIterator(
      commonAncestor,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: any) => {
          // Check if the node is part of the selection range and is a table cell
          if (
            range.intersectsNode(node) &&
            ['TD', 'TH'].includes(node.tagName)
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let currentNode;
    while ((currentNode = nodes.nextNode())) {
      if (['TD', 'TH'].includes(currentNode.tagName)) {
        tableCellCount++;
      }
    }
  }

  return tableCellCount > 1;
}

// Export document as PDF or DOCX
export async function handleExportDocument(
  format: 'pdf' | 'docx' = 'docx',
  {
    documentId,
    title,
    GAEventParams,
    callback
  }: {
    documentId: string;
    title: string;
    GAEventParams?: Record<string, any>;
    callback?: () => void;
  }
) {
  const response = await exportDocument({
    document_id: documentId,
    format
  });

  if (!response) return;

  const mimeTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  const blob = new Blob([response], { type: mimeTypes[format] });
  const fileURL = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = fileURL;
  link.download = `${title}.${format}`;
  link.click();
  URL.revokeObjectURL(fileURL);
  callback?.();

  if (GAEventParams) {
    sendGA4Event('click_button', {
      button_type: `Export ${format.toUpperCase()}`,
      ...GAEventParams
    });
  }
}

export function createAIInsertTextAnimation() {
  const style = document.createElement('style');
  style.id = 'aiInsertTextAnimation';
  style.textContent = `
    .bgFadeOutAnimation {
      padding: 5.5px 0px;
      animation-timing-function: linear;
      animation-duration: 600ms;
      animation-name: bgAnimation;
    }
  `;
  document.head.appendChild(style);
}

export function clearAIInsertTextAnimationElements() {
  const aiInsertTextAnimationElements = document.querySelectorAll(
    '.bgFadeOutAnimation'
  );
  if (aiInsertTextAnimationElements.length > 0) {
    aiInsertTextAnimationElements.forEach((element) => {
      element.classList.remove('bgFadeOutAnimation');
    });
  }
  const editorContentContainer = document.getElementById(
    'editorContentContainer'
  );
  const scrollTop = editorContentContainer?.scrollTop || 0;
  if (scrollTop && editorContentContainer) {
    requestAnimationFrame(() => {
      editorContentContainer.scrollTop = scrollTop;
    });
  }
}

export function removeAIInsertTextAnimation() {
  const styleElement = document.getElementById('aiInsertTextAnimation');
  if (styleElement) {
    setTimeout(() => {
      styleElement.remove();
    }, 3000);
  }
}
