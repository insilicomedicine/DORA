import OrderedList from '@tiptap/extension-ordered-list';

const CustomOrderedList = OrderedList.extend({
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

export default CustomOrderedList;
