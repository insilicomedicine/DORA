import React, { HTMLAttributes, memo, ReactNode, useState } from 'react';
import { Dialog as MUIDialog } from '@mui/material';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';
import { CloseRounded } from '@mui/icons-material';
interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  title?: string;
  Content?: ReactNode;
  Actions?: ReactNode;
  enableLeftBtn?: boolean;
  leftBtnText?: string;
  inputTagLabel?: string;
  classNames?: any;
  sx?: SxProps<Theme>;
  disableConfirmButton?: boolean;
  enableHeaderCloseIcon?: boolean;
  enableScrolableContent?: boolean;
  enableActions?: boolean;
  actionBtnTexts?: {
    confirm?: string;
    cancel?: string;
  };
  actionBtnTypes?: any;
  leftBtnAction?: () => void;
  handleClose: (e?) => void;
  handleConfirm?: (_inputValue: string) => void;
  children?: ReactNode;
}

const Dialog = ({
  sx,
  classNames,
  open,
  title,
  Content,
  Actions,
  enableLeftBtn = false,
  leftBtnText,
  inputTagLabel,
  actionBtnTexts = { cancel: 'Cancel', confirm: 'Save' },
  actionBtnTypes = {},
  disableConfirmButton = false,
  enableHeaderCloseIcon = false,
  enableScrolableContent = false,
  enableActions = true,
  handleClose = () => {},
  leftBtnAction = () => {},
  handleConfirm = () => {},
  children,
  ...rest
}: DialogProps) => {
  const [inputValue, setInputValue] = useState<string>('');

  return (
    <MUIDialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      classes={{ ...classNames }}
      sx={{
        '& .MuiPaper-rounded': {
          minWidth: 577,
          borderRadius: 4,
          overflow: 'hidden'
        },
        ...sx
      }}
      {...rest}
    >
      {children ? (
        children
      ) : (
        <>
          <DialogTitle>
            {title}
            {enableHeaderCloseIcon && (
              <IconButton
                size="small"
                onClick={handleClose}
                style={{ position: 'absolute', top: 10, right: 10 }}
              >
                <CloseRounded />
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent
            sx={{
              overflow: enableScrolableContent ? 'auto' : 'unset',
              paddingBottom: 0
            }}
          >
            {Content || (
              <TextField
                autoFocus
                label={inputTagLabel || 'URL'}
                value={inputValue}
                sx={{
                  width: '100%',
                  '& .MuiInputBase-root': {
                    lineHeight: 1.5
                  }
                }}
                onChange={(e) => setInputValue(e.target?.value)}
                placeholder="Enter your URL..."
              />
            )}
          </DialogContent>
          {enableActions && (
            <DialogActions
              sx={{
                padding: 3,
                '& button': {
                  maxHeight: 36,
                  fontSize: 16,
                  padding: '6px 20px',
                  textTransform: 'unset'
                }
              }}
            >
              {enableLeftBtn && (
                <Button
                  onClick={() => {
                    leftBtnAction();
                    handleClose();
                  }}
                  style={{ marginRight: 'auto' }}
                >
                  {leftBtnText}
                </Button>
              )}
              {Actions || (
                <>
                  <Button
                    onClick={handleClose}
                    color={actionBtnTypes?.cancel || 'primary'}
                  >
                    {actionBtnTexts.cancel || 'Cancel'}
                  </Button>

                  <Button
                    data-testid="dialog-confirm-button"
                    color={actionBtnTypes?.confirm || 'primary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirm(inputValue);
                      handleClose(e);
                    }}
                    variant="contained"
                    disabled={disableConfirmButton}
                  >
                    {actionBtnTexts.confirm}
                  </Button>
                </>
              )}
            </DialogActions>
          )}
        </>
      )}
    </MUIDialog>
  );
};

export default memo(Dialog);
