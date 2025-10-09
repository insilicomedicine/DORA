import React, {
  memo,
  Fragment,
  useState,
  MouseEvent,
  useEffect,
  useRef
} from 'react';
import usePlanStatus from 'hooks/usePlanStatus';
import { useDocumentStore } from 'contexts/documentsStore';
import Popper from '@mui/material/Popper';
import { Button, IconButton, Paper, ButtonGroup, Tooltip } from '@mui/material';
import { useEditorStore } from 'contexts/editorStore';
import { sendGA4Event } from 'utils/ga';

interface TextMarkingButtonsGroupProps {
  editor: any;
  buttonItems: any[];
  groupTitleIcon: any;
  groupTooltip: string;
  disabled?: boolean;
  id: string;
}

const TextMarkingButtonsGroup = ({
  editor,
  buttonItems,
  groupTitleIcon,
  groupTooltip,
  disabled = false,
  id
}: TextMarkingButtonsGroupProps) => {
  const { documentData } = useDocumentStore();
  const { setIsFormatting, activePopper, setActivePopper } = useEditorStore();
  const { isExpired } = usePlanStatus();
  const isDisabled = isExpired || documentData?.status !== 'completed';
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = activePopper === id;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClickPopper = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);

    if (open) {
      setActivePopper(null);
    } else {
      setActivePopper(id);
    }
  };

  const popperContainer = document.getElementById('TextMarkingButtonGroups');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popperContainer?.contains(event.target as Node)) {
        return;
      }

      if (
        open &&
        activePopper === id &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setActivePopper(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as any);
    };
  }, [open, activePopper, id, setActivePopper]);

  return (
    <Fragment>
      <Tooltip title={groupTooltip} placement="top">
        <span style={{ width: 'fit-content' }}>
          <Button
            ref={buttonRef}
            size="small"
            onClick={handleClickPopper}
            disabled={disabled}
            sx={{
              padding: '2px 4px',
              borderRadius: '6px',
              color: open ? 'primary.main' : 'grey.600',
              '&:hover': {
                backgroundColor: 'grey.50'
              }
            }}
          >
            {groupTitleIcon}
          </Button>
        </span>
      </Tooltip>

      {popperContainer && (
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-start"
          container={popperContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <Paper
            sx={{
              p: 0.5,
              maxWidth: '100%',
              backgroundColor: '#fff',
              boxShadow: 'box-shadow: 0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
            }}
          >
            <ButtonGroup variant="outlined">
              {buttonItems.map((item, index) => {
                const { label = '' } = item;
                const isButtonDisabled =
                  isDisabled || !documentData?.sections.length;
                const isActive = editor.isActive(item.activeState || item.key);

                return (
                  <Fragment key={index}>
                    <Tooltip title={label} placement="top">
                      <span style={{ minWidth: 'fit-content' }}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            item.handleClick();
                            setIsFormatting(true);
                            sendGA4Event('click_button', {
                              location: 'editor_tool_bar',
                              button_type: item.label || item.key
                            });
                          }}
                          color={isActive ? 'secondary' : 'default'}
                          disabled={isButtonDisabled}
                          sx={{
                            borderRadius: '6px',
                            p: '2px',
                            '&:hover': {
                              backgroundColor: 'grey.50'
                            }
                          }}
                        >
                          {item.icon(isActive)}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Fragment>
                );
              })}
            </ButtonGroup>
          </Paper>
        </Popper>
      )}
    </Fragment>
  );
};

export default memo(TextMarkingButtonsGroup);
