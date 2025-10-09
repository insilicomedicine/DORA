import BulletList from '@tiptap/extension-bullet-list';

const CustomBulletList = BulletList.extend({
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

export default CustomBulletList;
