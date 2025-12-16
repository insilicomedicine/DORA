import Link from '@tiptap/extension-link';
import { generateUUID } from 'utils/generateUUID';

/**
 * Creates custom attributes for the Link extension
 * These attributes can be used across different components
 *
 * @returns Object containing custom attributes configuration
 */
export const createLinkAttributes = () => {
  return {
    id: {
      renderHTML: (attributes) => {
        return {
          id: `${attributes.id}`
        };
      }
    },
    ['data-chunk_id']: {
      default: '',
      renderHTML: (attributes) => {
        return {
          ['data-chunk_id']: `${attributes['data-chunk_id']}`
        };
      }
    },
    ['data-type']: {
      default: '',
      renderHTML: (attributes) => {
        return {
          ['data-type']: `${attributes['data-type']}`
        };
      }
    },
    ['data-source']: {
      default: '',
      renderHTML: (attributes) => {
        return {
          ['data-source']: `${attributes['data-source']}`
        };
      }
    },
    ['data-custom_text']: {
      default: '',
      renderHTML: (attributes) => {
        return {
          ['data-custom_text']: `${attributes['data-custom_text']}`
        };
      }
    },
    ['data-unique-id']: {
      default: null,
      renderHTML: () => {
        return {
          ['data-unique-id']: `id-${generateUUID()}`
        };
      }
    },
    href: {
      renderHTML: (attributes) => {
        return {
          href: `${attributes.href}`
        };
      }
    },
    class: {
      default: 'paperContent',
      renderHTML: (attributes) => {
        return {
          class: `${attributes.class}`
        };
      }
    }
  };
};

/**
 * Creates an extended Link extension with custom attributes
 * This can be used as a base for other link extensions
 *
 * @returns Extended Link extension
 */
export const createExtendedLink = () => {
  return Link.extend({
    inclusive: false,
    addAttributes() {
      const parentAttributes = this.parent?.() || {};
      return {
        ...parentAttributes,
        ...createLinkAttributes()
      };
    }
  });
};

// Export the base extended link for direct use
export const ExtendedLink = createExtendedLink();
