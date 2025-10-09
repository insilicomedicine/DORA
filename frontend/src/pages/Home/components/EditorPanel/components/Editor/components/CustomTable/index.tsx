import Table from '@tiptap/extension-table';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { Slice, Fragment, Node } from 'prosemirror-model';

const CustomTable = Table.extend({
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
      },
      id: {
        default: ``,
        renderHTML: () => {
          // Generate a unique ID for the table
          return { id: crypto.randomUUID() };
        }
      }
    };
  },
  renderHTML({ HTMLAttributes }) {
    const parentId = HTMLAttributes['data-parent'];
    const tableId = HTMLAttributes.id;
    return [
      'div',
      {
        class: 'tableContainer',
        'data-parent': parentId,
        id: `tableContainer-${tableId}`
      },
      [
        'span',
        {
          class: 'prevPlaceHolder',
          contenteditable: 'true',
          tabindex: '0',
          id: `prevPlaceHolder-${tableId}`
        },
        ''
      ],
      [
        'div',
        { class: 'tableWrapper' },
        ['table', { ...HTMLAttributes, id: tableId }, 0]
      ],
      [
        'span',
        {
          class: 'nextPlaceHolder',
          contenteditable: 'true',
          tabindex: '0',
          id: `nextPlaceHolder-${tableId}`
        },
        ''
      ]
    ];
  },
  addProseMirrorPlugins() {
    const plugins = this.parent?.() || [];

    // Add a plugin to handle cursor visibility
    const cursorPlugin = new Plugin({
      key: new PluginKey('table-cursor'),
      props: {
        handleClick(_view, _pos, event) {
          const target = event.target;
          if (
            target instanceof HTMLElement &&
            (target.classList.contains('prevPlaceHolder') ||
              target.classList.contains('nextPlaceHolder'))
          ) {
            target.focus();
            return true;
          }
          return false;
        }
      }
    });

    // Add a keymap plugin to handle Enter key
    const enterKeyPlugin = keymap({
      Enter: (state, dispatch, view) => {
        // Check if the focused element is the beforeTable or afterTable span
        if (view && document.activeElement) {
          const isBeforeTable =
            document.activeElement.classList.contains('prevPlaceHolder');
          const isAfterTable =
            document.activeElement.classList.contains('nextPlaceHolder');

          if (isBeforeTable || isAfterTable) {
            // Find the table node position
            const { tr } = state;
            let tableNode;
            let tableNodePos;

            // Find the table node and its position
            state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
              if (node.type.name === 'table' && !tableNode) {
                tableNode = node;
                tableNodePos = pos;
                return false;
              }
              return true;
            });

            if (tableNode && tableNodePos !== undefined) {
              // Insert a new paragraph
              if (dispatch) {
                // Find the active table element
                const activeElement = document.activeElement;
                if (!activeElement) return false;

                // Get the parent table container
                const tableContainer = activeElement.closest('.tableContainer');
                if (!tableContainer) return false;

                // Find the corresponding table node in the document
                let targetTablePos = -1;
                state.doc.nodesBetween(
                  0,
                  state.doc.content.size,
                  (node, pos) => {
                    if (node.type.name === 'table') {
                      // Check if this is our table by comparing DOM nodes
                      const domNode = view?.nodeDOM(pos);
                      if (domNode && tableContainer.contains(domNode)) {
                        targetTablePos = pos;
                        return false;
                      }
                    }
                    return targetTablePos === -1;
                  }
                );

                if (targetTablePos === -1) return false;

                // Calculate position before or after the table
                const tableNode = state.doc.nodeAt(targetTablePos);
                if (!tableNode) return false;

                const position = isBeforeTable
                  ? targetTablePos
                  : targetTablePos + tableNode.nodeSize;

                // Insert the paragraph with data-parent attribute
                const tableParentId =
                  tableContainer.getAttribute('data-parent');
                const paragraph = state.schema.nodes.paragraph.create({
                  'data-parent': tableParentId
                });

                tr.insert(position, paragraph);

                // Set selection to the new paragraph
                const newPos = isBeforeTable ? targetTablePos : position + 1;

                // Ensure the position is valid
                const validPos = Math.min(
                  Math.max(0, newPos),
                  tr.doc.content.size - 1
                );
                tr.setSelection(TextSelection.create(tr.doc, validPos));

                dispatch(tr);

                // Return focus to the editor
                if (view) {
                  view.focus();
                }

                return true;
              }
            }
          }
        }
        return false;
      }
    });

    // Add to your keymap plugin or create a new one
    const deleteKeyPlugin = keymap({
      Delete: (state, dispatch, view) => {
        if (
          view &&
          document.activeElement?.classList.contains('prevPlaceHolder')
        ) {
          // Find the active table element
          const activeElement = document.activeElement;
          if (!activeElement) return false;

          // Get the parent table container
          const tableContainer = activeElement.closest('.tableContainer');
          if (!tableContainer) return false;

          // Find the corresponding table node in the document
          let targetTablePos = -1;
          state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
            if (node.type.name === 'table') {
              // Check if this is our table by comparing DOM nodes
              const domNode = view.nodeDOM(pos);
              if (domNode && tableContainer.contains(domNode)) {
                targetTablePos = pos;
                return false;
              }
            }
            return targetTablePos === -1;
          });

          if (targetTablePos === -1) return false;

          // Delete the table
          const tableNode = state.doc.nodeAt(targetTablePos);
          if (!tableNode) return false;

          if (dispatch) {
            const tr = state.tr.delete(
              targetTablePos,
              targetTablePos + tableNode.nodeSize
            );
            dispatch(tr);
            view.focus();
            return true;
          }
        }
        return false;
      },
      Backspace: (state, dispatch, view) => {
        if (
          view &&
          document.activeElement?.classList.contains('nextPlaceHolder')
        ) {
          // Find the active table element
          const activeElement = document.activeElement;
          if (!activeElement) return false;

          // Get the parent table container
          const tableContainer = activeElement.closest('.tableContainer');
          if (!tableContainer) return false;

          // Find the corresponding table node in the document
          let targetTablePos = -1;
          state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
            if (node.type.name === 'table') {
              // Check if this is our table by comparing DOM nodes
              const domNode = view.nodeDOM(pos);
              if (domNode && tableContainer.contains(domNode)) {
                targetTablePos = pos;
                return false;
              }
            }
            return targetTablePos === -1;
          });

          if (targetTablePos === -1) return false;

          // Delete the table
          const tableNode = state.doc.nodeAt(targetTablePos);
          if (!tableNode) return false;

          if (dispatch) {
            const tr = state.tr.delete(
              targetTablePos,
              targetTablePos + tableNode.nodeSize
            );
            dispatch(tr);
            view.focus();
            return true;
          }
        }
        return false;
      }
    });

    // Add a paste handler plugin to inherit data-parent
    const pastePlugin = new Plugin({
      key: new PluginKey('table-paste-handler'),
      props: {
        transformPasted: (slice, view) => {
          const { state } = view;
          const { selection, doc } = state;
          const { from } = selection;

          // Quick check if we need to process
          let needsDataParent = false;
          slice.content.descendants((node) => {
            if (node.type.name === 'table' || node.type.name === 'paragraph') {
              needsDataParent = true;
              return false;
            }
            return true;
          });

          if (!needsDataParent) return slice;

          // Find data-parent using a series of strategies
          let dataParent = null;
          const $from = doc.resolve(from);

          // Strategy 1: Check current node and its ancestors
          if (!dataParent && $from.depth >= 0) {
            for (let d = $from.depth; d >= 0; d--) {
              const node = $from.node(d);
              if (node.attrs?.['data-parent']) {
                dataParent = node.attrs['data-parent'];
                break;
              }
            }
          }

          // Strategy 2: Look nearby in the document
          if (!dataParent) {
            // Search backward then forward from cursor position
            [-1, 1].some((direction) => {
              let pos = from;
              const limit = direction === -1 ? 0 : doc.content.size;

              while (
                (direction === -1 ? pos > limit : pos < limit) &&
                !dataParent
              ) {
                pos += direction;
                try {
                  const resolvedPos = doc.resolve(pos);
                  if (resolvedPos.parent.attrs?.['data-parent']) {
                    dataParent = resolvedPos.parent.attrs['data-parent'];
                    return true;
                  }
                } catch (_) {
                  /* Skip invalid positions */
                }
              }
              return false;
            });
          }

          // Strategy 3: Find any data-parent in the document
          if (!dataParent) {
            doc.descendants((node) => {
              if (node.attrs?.['data-parent']) {
                dataParent = node.attrs['data-parent'];
                return false;
              }
              return true;
            });
          }

          if (!dataParent) {
            return slice;
          }

          // Process nodes recursively
          const processNode = (node: Node): Node => {
            // For tables and paragraphs, add data-parent directly
            if (node.type.name === 'table' || node.type.name === 'paragraph') {
              return node.type.create(
                { ...node.attrs, 'data-parent': dataParent },
                node.content,
                node.marks
              );
            }

            // For nodes with content, process children
            if (node.content && node.content.size > 0) {
              const newContent: Node[] = [];
              node.content.forEach((child) =>
                newContent.push(processNode(child))
              );
              return node.copy(Fragment.from(newContent));
            }

            return node;
          };

          // Create new slice with processed nodes
          const newNodes: Node[] = [];
          slice.content.forEach((node) => newNodes.push(processNode(node)));

          return new Slice(
            Fragment.from(newNodes),
            slice.openStart,
            slice.openEnd
          );
        }
      }
    });

    return [
      ...plugins,
      cursorPlugin,
      enterKeyPlugin,
      deleteKeyPlugin,
      pastePlugin
    ];
  }
});

export default CustomTable;
