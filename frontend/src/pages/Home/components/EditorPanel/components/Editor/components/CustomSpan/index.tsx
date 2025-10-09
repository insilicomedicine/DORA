import { Mark } from '@tiptap/core';

const TextStyle = Mark.create({
  name: 'textStyle',
  inclusive: false,
  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('id') || '',
        renderHTML: (attributes) => ({
          id: attributes['id']
        })
      },
      'data-parent': {
        default: '',
        parseHTML: (element) => element.getAttribute('data-parent') || '',
        renderHTML: (attributes) => ({
          'data-parent': attributes['data-parent']
        })
      },
      class: {
        default: null
      },
      contenteditable: {
        default: '',
        renderHTML: (attributes) => {
          return {
            contenteditable: `${attributes['contenteditable']}`
          };
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (node) => {
          const element = node as HTMLElement;
          return { class: element.getAttribute('class') };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  }
});

export default TextStyle;
