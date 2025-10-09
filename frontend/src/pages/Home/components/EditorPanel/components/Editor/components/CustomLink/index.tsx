import { mergeAttributes } from '@tiptap/core';
import '@tiptap/extension-text-style';
import useRightPanelStore from 'contexts/useRightPanelStore';
import { useEditorStore } from 'contexts/editorStore';
import { ExtendedLink } from './linkWithCustomAttributes';

/**
 * CustomLink component that provides an extended Link extension
 * with custom attributes and behavior for the editor
 */
const CustomLink = () => {
  const { setReferenceLinkTarget, setRightPanel } = useEditorStore();
  const { toggleCollapseRightPanel } = useRightPanelStore();

  return ExtendedLink.extend({
    renderHTML({ HTMLAttributes }) {
      const elem = document.createElement('a');

      Object.entries(
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
      ).forEach(([attr, val]) => elem.setAttribute(attr, val));

      const {
        id: { value: pmid },
        ['data-type']: { value: type },
        ['data-chunk_id']: { value: chunkid },
        ['data-custom_text']: { value: customText },
        ['data-unique-id']: { value: uniqueId }
      } = elem.attributes as any;

      if (pmid && chunkid) {
        elem.addEventListener('click', (e) => {
          e.preventDefault();
          // disable the link to prevent the default behavior when click on it
          elem.setAttribute('contenteditable', 'false');
          setReferenceLinkTarget({
            id: uniqueId,
            pmid,
            chunkid
          });
          setRightPanel({
            activedComponentId: 'textevidence'
          });
          toggleCollapseRightPanel(false);
        });
      }

      const customTextWithoutExtension = customText.replace(/\.[^/.]+$/, '');
      const MAX_LENGTH = 30;
      if (
        ['file', 'websearch'].includes(type) &&
        customTextWithoutExtension.length > MAX_LENGTH
      ) {
        // add tooltip for the link when hover on it
        elem.addEventListener('mouseenter', (_e) => {
          const tooltip = document.createElement('div');
          tooltip.style.position = 'absolute';
          tooltip.innerText = customText.replace(/^\(/, '').replace(/\)$/, '');
          tooltip.className = 'tooltip';
          tooltip.style.visibility = 'none';
          document.body.appendChild(tooltip);
          const {
            top: elemTop,
            left: elemLeft,
            width: elemWidth
          } = elem.getBoundingClientRect();
          const { width: tooltipWidth, height: tooltipHeight } =
            tooltip.getBoundingClientRect();
          tooltip.style.top = `${elemTop - tooltipHeight - 2}px`;
          tooltip.style.left = `${elemLeft + elemWidth / 2 - tooltipWidth / 2}px`;
          tooltip.style.visibility = 'visible';
        });

        //remove tooltip when mouse leave the link
        elem.addEventListener('mouseleave', (_e) => {
          const tooltip = document.querySelector('.tooltip');
          if (tooltip) {
            tooltip.remove();
          }
        });
      }

      return elem;
    },
    onTransaction() {
      const elem = document.querySelector('.tooltip');
      if (!elem) return;
      elem.remove();
    }
  });
};

export default CustomLink;
