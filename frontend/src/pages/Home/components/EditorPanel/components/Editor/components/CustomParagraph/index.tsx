import { Node } from '@tiptap/core';
import Paragraph, { ParagraphOptions } from '@tiptap/extension-paragraph';

interface ParagraphAttributesProps {
  defaultParentId?: string;
}

interface AttributeSpec {
  default: any;
  renderHTML: (attributes: Record<string, any>) => Record<string, string>;
  parseHTML?: (element: HTMLElement) => string;
}

interface ParagraphAttributeConfiguration {
  [key: string]: AttributeSpec;
}

const createParagraphAttributes = ({
  defaultParentId = ''
}: ParagraphAttributesProps = {}): ParagraphAttributeConfiguration => ({
  'data-parent': {
    default: defaultParentId,
    parseHTML: (element) =>
      element.getAttribute('data-parent') || defaultParentId,
    renderHTML: (attributes) => ({
      'data-parent': attributes['data-parent']
    })
  },
  class: {
    default: 'paperContent',
    parseHTML: (element) => element.getAttribute('class') || 'paperContent',
    renderHTML: (attributes) => ({
      class: attributes.class as string
    })
  }
});

const createExtendedParagraph = (
  props?: ParagraphAttributesProps
): Node<ParagraphOptions> => {
  return Paragraph.extend({
    addAttributes() {
      const parentAttributes = this.parent?.() || {};
      return {
        ...parentAttributes,
        ...createParagraphAttributes(props)
      };
    }
  });
};

export default (props?: ParagraphAttributesProps): Node<ParagraphOptions> =>
  createExtendedParagraph(props);
