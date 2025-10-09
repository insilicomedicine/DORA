import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Component from './Component';

const ReactComponent = Node.create({
  name: 'reactComponent',
  group: 'block',
  content: 'inline*',
  addAttributes() {
    return {
      id: {
        default: '',
        renderHTML: (attributes) => {
          return {
            id: `${attributes.id}`
          };
        }
      },
      type: {
        default: '',
        renderHTML: (attributes) => {
          return {
            errorMessage: `${attributes.type}`
          };
        }
      },
      componentType: {
        default: '',
        renderHTML: (attributes) => {
          return {
            componentType: `${attributes.componentType}`
          };
        }
      },
      isRequired: {
        default: '',
        renderHTML: (attributes) => {
          return {
            id: `${attributes.id}`
          };
        }
      },
      isHidden: {
        default: '',
        renderHTML: (attributes) => {
          return {
            id: `${attributes.isHidden}`
          };
        }
      },
      errorMessage: {
        default: '',
        renderHTML: (attributes) => {
          return {
            errorMessage: `${attributes.errorMessage}`
          };
        }
      },
      className: {
        default: '',
        renderHTML: (attributes) => {
          return {
            className: `${attributes.className}`
          };
        }
      },
      contenteditable: {
        default: 'true',
        renderHTML: (attributes) => {
          if (!attributes.contenteditable) {
            return {};
          }
          return {
            contenteditable: attributes.contenteditable
          };
        }
      },
      Component: {
        default: '',
        renderHTML: (attributes) => {
          return {
            Component: attributes.Component
          };
        }
      },
      title: {
        default: '',
        renderHTML: (attributes) => {
          return {
            title: attributes.title
          };
        }
      },
      isPolising: {
        default: false,
        renderHTML: (attributes) => {
          return {
            isPolising: attributes.isPolising
          };
        }
      },
      isPolisingFailed: {
        default: false,
        renderHTML: (attributes) => {
          return {
            isPolising: attributes.isPolisingFailed
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'react-component'
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['react-component', mergeAttributes(HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Component);
  }
});

export default ReactComponent;
