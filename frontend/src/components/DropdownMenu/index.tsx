import React, {
  MouseEvent,
  ReactElement,
  ReactNode,
  memo,
  useState
} from 'react';
import {
  Menu as MUIMenu,
  Typography,
  IconButton,
  MenuItem,
  Tooltip
} from '@mui/material';
import { MoreHorizRounded } from '@mui/icons-material';
import { sendGA4Event } from 'utils/ga';
import classNames from 'classnames';

interface DropdownMenuProps {
  menuIcon?: ReactElement;
  menuItems: Array<{
    icon?: ReactElement;
    text: string;
    tooltipTitle?: ReactNode;
    isHidden?: boolean;
    disabled?: boolean;
    disableGAEvent?: boolean;
    handleClick: () => void;
  }>;
  isDisabled?: boolean;
  handleMenuOpenCallback?: (isOpen: boolean) => void;
}

const DropdownMenu = ({
  menuIcon = <MoreHorizRounded />,
  menuItems,
  handleMenuOpenCallback
}: DropdownMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement> | null) => {
    event?.preventDefault();
    event?.stopPropagation();
    const currentTarget = event?.currentTarget || null;
    setAnchorEl(currentTarget);
    handleMenuOpenCallback && handleMenuOpenCallback(!!currentTarget);
  };

  return (
    <>
      <IconButton
        onClick={handleOpenMenu}
        sx={{ p: '3px', ...(open && { zIndex: 1, color: 'primary.main' }) }}
        className={classNames('menuIcon', open && 'dropdownMenuOpened')}
      >
        {menuIcon}
      </IconButton>
      <MUIMenu
        anchorEl={anchorEl}
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={() => handleOpenMenu(null)}
        sx={{
          '& .MuiPaper-root': {
            minWidth: 184,
            padding: '8px 0',
            borderRadius: 2,
            boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
          },
          '& .MuiList-padding': {
            padding: 0
          },
          '& .MuiMenuItem-root:hover': {
            backgroundColor: '#F2F2F2'
          }
        }}
      >
        {menuItems.map(
          (
            {
              text,
              handleClick,
              icon,
              tooltipTitle,
              isHidden,
              disabled,
              disableGAEvent = false
            },
            index
          ) => {
            if (isHidden) return null;

            return (
              <div key={index}>
                <Tooltip title={disabled ? tooltipTitle : ''} placement="top">
                  <span>
                    <MenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        !disableGAEvent &&
                          sendGA4Event('click_button', {
                            button_type: text
                          });
                        handleClick();
                        handleOpenMenu(null);
                      }}
                      disabled={disabled}
                      sx={{
                        display: 'flex',
                        padding: '6px 16px',
                        '& .MuiSvgIcon-root': {
                          marginLeft: 'auto',
                          color: 'text.secondary'
                        },
                        '& .Mui-disabled': {
                          cursor: 'default',
                          color: 'grey.400',
                          '& .MuiSvgIcon-root': {
                            fill: 'grey.400'
                          }
                        },
                        '&:hover': {
                          '& .deleteIcon': {
                            color: '#E31B0C'
                          }
                        }
                      }}
                    >
                      <Typography variant="body2" p="4px 0">
                        {text}
                      </Typography>
                      {icon}
                    </MenuItem>
                  </span>
                </Tooltip>
              </div>
            );
          }
        )}
      </MUIMenu>
    </>
  );
};

export default memo(DropdownMenu);
