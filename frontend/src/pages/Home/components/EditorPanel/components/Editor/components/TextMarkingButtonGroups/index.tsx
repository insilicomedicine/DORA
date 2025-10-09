import React, { memo, useCallback } from 'react';
import TextMarkingButtonsGroup from '../TextMarkingButtonsGroup';
import { Divider, IconButton, Stack, Tooltip } from '@mui/material';
import {
  FormatBoldRounded,
  FormatAlignJustifyRounded,
  FormatListNumberedRounded,
  ArrowDropDownRounded,
  FormatClearRounded
} from '@mui/icons-material';
import {
  getFormattingTextItems,
  numberedListTextItems,
  alignmentTextItems
} from './utils';
import { useEditorStore } from 'contexts/editorStore';
import { sendGA4Event } from 'utils/ga';

// Define the button group type
interface ButtonGroup {
  getItems: (editor: any) => any[];
  focus?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  id: string;
  disabled?: boolean;
}

const baseButtonGroups: ButtonGroup[] = [
  {
    getItems: getFormattingTextItems,
    focus: true,
    icon: <FormatBoldRounded fontSize="small" />,
    tooltip: 'Formatting',
    id: 'formatting-group'
  },
  {
    getItems: alignmentTextItems,
    icon: <FormatAlignJustifyRounded fontSize="small" />,
    tooltip: 'Align & Indent',
    id: 'alignment-group'
  }
];

interface TextMarkingButtonGroupsProps {
  editor: any;
  isEntireDocumentSelected?: boolean;
}

const TextMarkingButtonGroups = ({
  editor,
  isEntireDocumentSelected = false
}: TextMarkingButtonGroupsProps) => {
  const { setIsFormatting, setActivePopper } = useEditorStore();

  const buttonGroups: ButtonGroup[] = [
    ...baseButtonGroups,
    {
      getItems: numberedListTextItems,
      icon: <FormatListNumberedRounded fontSize="small" />,
      tooltip: 'Numbered & Bulleted lists',
      disabled: isEntireDocumentSelected,
      id: 'list-group'
    }
  ];

  // Handle clear formatting
  const handleClearFormatting = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      editor
        .chain()
        .focus()
        .unsetBold()
        .unsetItalic()
        .unsetUnderline()
        .unsetStrike()
        .run();
      setIsFormatting(true);
      // Close any open poppers when clearing formatting
      setActivePopper(null);
      sendGA4Event('click_button', {
        location: 'editor_tool_bar',
        button_type: 'Clear formatting'
      });
    },
    [editor, setIsFormatting, setActivePopper]
  );

  return (
    <Stack direction="row" id="TextMarkingButtonGroups">
      <Divider orientation="vertical" flexItem sx={{ mr: 0.5 }} />
      {buttonGroups.map(({ getItems, icon, tooltip, id, ...rest }, index) => (
        <TextMarkingButtonsGroup
          key={index}
          editor={editor}
          buttonItems={getItems(editor)}
          groupTitleIcon={
            <>
              {icon}
              <ArrowDropDownRounded sx={{ ml: -1 }} fontSize="small" />
            </>
          }
          groupTooltip={tooltip}
          id={id}
          {...rest}
        />
      ))}
      <Divider orientation="vertical" flexItem sx={{ mr: 0.5, ml: 0.5 }} />
      <Tooltip placement="top" title="Clear formatting">
        <IconButton
          onClick={handleClearFormatting}
          sx={{
            p: 0.25,
            borderRadius: '6px',
            '&:hover': {
              backgroundColor: 'grey.50'
            },
            mr: 0.75
          }}
        >
          <FormatClearRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default memo(TextMarkingButtonGroups);
