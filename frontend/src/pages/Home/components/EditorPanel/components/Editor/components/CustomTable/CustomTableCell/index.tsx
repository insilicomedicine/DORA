import TableCell from '@tiptap/extension-table-cell';
import { Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      // extend the existing attributes …
      ...this.parent?.(),

      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-background-color'),
        renderHTML: (attributes) => {
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`
          };
        }
      }
    };
  },

  addProseMirrorPlugins() {
    const plugins = [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragstart: (_view, event) => {
              if (
                event.target instanceof Element &&
                (event.target.closest('td') || event.target.closest('th'))
              ) {
                event.preventDefault();
                return true;
              }
              return false;
            },
            drop: (_view, event) => {
              if (
                event.target instanceof Element &&
                (event.target.closest('td') || event.target.closest('th'))
              ) {
                event.preventDefault();
                return true;
              }
              return false;
            }
          }
        }
      }),

      // Add arrow key handlers
      keymap({
        ArrowUp: (state, _dispatch, view) => {
          if (!view) return false;
          const { selection } = state;
          const { $from } = selection;

          const currentNode = $from.node(-1);
          const isInTableHeader = currentNode?.type.name === 'tableHeader';

          // Only handle arrow up when in a table header
          if (!isInTableHeader) return false;

          // Get the DOM element and find table container
          const domPos = view.coordsAtPos($from.pos);
          const elem = document.elementFromPoint(domPos.left, domPos.top);
          if (!elem) return false;

          // Find the table container
          const tableContainer = elem.closest('.tableContainer');
          if (!tableContainer) return false;

          // Get the table ID
          const containerId = tableContainer.id;
          const tableId = containerId.replace('tableContainer-', '');

          // Find the previous placeholder element
          const prevPlaceholder = document.getElementById(
            `prevPlaceHolder-${tableId}`
          );
          if (prevPlaceholder instanceof HTMLElement) {
            // Focus without scrolling
            prevPlaceholder.focus({ preventScroll: true });
            return true;
          }

          return false;
        },

        ArrowDown: (state, _dispatch, view) => {
          if (!view) return false;

          const { selection } = state;
          const { $from } = selection;

          const currentNode = $from.node(-1);
          const isInTable = currentNode?.type.name === 'tableCell';

          if (!isInTable) return false;

          // Find table node and its position
          let tablePos = -1;
          let rowPos = -1;
          let cellPos = -1;

          // Traverse up the node structure to find the table, row, and cell
          for (let i = $from.depth; i > 0; i--) {
            const node = $from.node(i);
            if (!node) continue;

            if (node.type.name === 'table') {
              tablePos = i;
            } else if (node.type.name === 'tableRow') {
              rowPos = i;
            } else if (
              node.type.name === 'tableCell' ||
              node.type.name === 'tableHeader'
            ) {
              cellPos = i;
            }
          }

          // Ensure we found all required nodes
          if (tablePos === -1 || rowPos === -1 || cellPos === -1) return false;

          // Get the table node
          const tableNode = $from.node(tablePos);
          if (!tableNode) return false;

          // Check if it's the last row
          const rowIndex = $from.index(tablePos);
          const totalRows = tableNode.childCount;
          const isLastRow = rowIndex === totalRows - 1;

          // Only proceed for last row
          if (!isLastRow) return false;

          // Get the DOM element and find table container
          const domPos = view.coordsAtPos($from.pos);
          const elem = document.elementFromPoint(domPos.left, domPos.top);
          if (!elem) return false;

          // Find the table container
          const tableContainer = elem.closest('.tableContainer');
          if (!tableContainer) return false;

          // Get the table ID
          const containerId = tableContainer.id;
          const tableId = containerId.replace('tableContainer-', '');

          // Find the next placeholder
          const nextPlaceholder = document.getElementById(
            `nextPlaceHolder-${tableId}`
          );
          if (nextPlaceholder instanceof HTMLElement) {
            // Save scroll positions before focus change
            const editorContainer = document.getElementById(
              'editorContentContainer'
            );
            const editorScrollTop = editorContainer?.scrollTop || 0;

            // Save table wrapper scroll positions
            const tableWrapper = tableContainer.querySelector('.tableWrapper');
            const tableScrollLeft = tableWrapper?.scrollLeft || 0;
            const tableScrollTop = tableWrapper?.scrollTop || 0;

            // Focus without scrolling
            nextPlaceholder.focus({ preventScroll: true });

            // Restore scroll positions to prevent any unwanted scrolling
            if (editorContainer) {
              editorContainer.scrollTop = editorScrollTop;
            }

            if (tableWrapper) {
              // Use requestAnimationFrame to ensure DOM updates have completed
              requestAnimationFrame(() => {
                tableWrapper.scrollLeft = tableScrollLeft;
                tableWrapper.scrollTop = tableScrollTop;

                // Double-check in the next frame to ensure it stuck
                requestAnimationFrame(() => {
                  if (tableWrapper.scrollLeft !== tableScrollLeft) {
                    tableWrapper.scrollLeft = tableScrollLeft;
                  }
                  if (tableWrapper.scrollTop !== tableScrollTop) {
                    tableWrapper.scrollTop = tableScrollTop;
                  }
                });
              });
            }

            return true;
          }

          return false;
        }
      })
    ];

    return plugins;
  }
});

export default CustomTableCell;
