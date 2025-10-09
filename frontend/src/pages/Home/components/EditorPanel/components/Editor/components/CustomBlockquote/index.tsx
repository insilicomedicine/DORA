import Blockquote from '@tiptap/extension-blockquote';

const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-parent': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent'),
        renderHTML: (attributes) => {
          return {
            'data-parent': attributes['data-parent']
          };
        }
      }
    };
  }
});

export default CustomBlockquote;
