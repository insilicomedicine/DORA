import Heading from '@tiptap/extension-heading';

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      class: {
        default: '',
        renderHTML: (attributes) => {
          return {
            class: `${attributes.class}`
          };
        }
      },
      ['data-parent']: {
        default: '',
        renderHTML: (attributes) => {
          return {
            ['data-parent']: `${attributes['data-parent']}`
          };
        }
      },
      level: {
        default: 1,
        renderHTML: (attributes) => {
          return {
            level: attributes.level
          };
        }
      }
    };
  }
});

export default CustomHeading;
