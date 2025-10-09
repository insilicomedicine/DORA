import Highlight from '@tiptap/extension-highlight';

const CustomHighlight = Highlight.extend({
  addCommands() {
    return {
      ...this.parent?.(), // Preserve existing commands from the parent Highlight extension
      setHighlight: function (attributes) {
        return ({ chain }) => {
          return chain()
            .setMark('highlight', attributes)
            .setMeta('preventUpdate', true) // Add metadata to suppress onUpdate
            .run();
        };
      },
      unsetHighlight:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            // Walk through document to remove all highlights
            tr.doc.descendants((node, pos) => {
              if (node.marks.some((mark) => mark.type.name === 'highlight')) {
                tr.removeMark(pos, pos + node.nodeSize, this.type);
              }
            });

            // Add metadata to suppress onUpdate
            tr.setMeta('preventUpdate', true);
          }
          return true;
        }
    };
  }
});

export default CustomHighlight;
