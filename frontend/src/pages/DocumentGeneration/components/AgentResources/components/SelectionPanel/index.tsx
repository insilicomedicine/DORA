import React, { memo, useState } from 'react';
import {
  Chip,
  CircularProgress,
  Link,
  Stack,
  styled,
  TextField,
  Tooltip,
  tooltipClasses,
  TooltipProps,
  Typography
} from '@mui/material';
import Dialog from 'components/Dialog';
import { createSuggestions } from 'services/templates';
import { theme } from 'theme';
import { SelectedOption } from 'utils/agentReport';
import { sendGA4Event } from 'utils/ga';

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} disableInteractive />
))(({}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#fff',
    color: theme.palette.text.primary,
    maxWidth: 320,
    textAlign: 'left',
    padding: '12px 24px',
    boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
  }
}));
interface SelectionPanelProps {
  isLoading?: boolean;
  sourceKey?: string;
  GA4SourceType?: string;
  title: string;
  options: Partial<SelectedOption>[];
  defaultDisplayCount?: number;
  suggestAction?: {
    label: string;
    type: string;
    placeholder: string;
    description: string;
  };
  onOptionClick?: (_option: any) => void;
  enableShowMore?: boolean;
  selectedItems?: any[];
  setSelectedItems?: (_items: any[], _sourceKey: string) => void;
}

const SelectionPanel = ({
  isLoading = false,
  sourceKey = '',
  GA4SourceType = '',
  title,
  options = [],
  defaultDisplayCount = 8,
  suggestAction,
  enableShowMore = false,
  selectedItems = [],
  setSelectedItems
}: SelectionPanelProps) => {
  const [suggestActionDialogOpen, setSuggestActionDialogOpen] = useState(false);
  const [showMore, setShowMore] = useState(!enableShowMore);
  const [suggestDescription, setSuggestDescription] = useState('');

  return (
    <Stack sx={{ bgcolor: '#fff', pt: 2, pb: 4, borderRadius: 4, gap: 2 }}>
      <Typography
        variant="body2"
        fontWeight={500}
        display="flex"
        alignItems="center"
      >
        {title}
        {suggestAction && (
          <>
            <Link
              href="#"
              color="text.secondary"
              sx={{
                minWidth: 'fit-content',
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 500
              }}
              onClick={() => setSuggestActionDialogOpen(true)}
              data-ga-event={`Suggest ${suggestAction.type}`}
              data-ga-event-location="main_form"
            >
              {suggestAction.label}
            </Link>
            <Dialog
              open={suggestActionDialogOpen}
              handleClose={() => {
                setSuggestActionDialogOpen(false);
                setSuggestDescription('');
                sendGA4Event('click_button', {
                  button_type: `Cancel Suggestion ${suggestAction?.type}`,
                  location: 'model'
                });
              }}
              title={suggestAction?.label}
              Content={
                <Stack sx={{ gap: 1 }}>
                  <Typography>{suggestAction?.description}</Typography>
                  <TextField
                    fullWidth
                    placeholder={suggestAction?.placeholder}
                    variant="outlined"
                    value={suggestDescription}
                    onChange={(e) => setSuggestDescription(e.target.value)}
                  />
                </Stack>
              }
              actionBtnTexts={{ confirm: 'Send', cancel: 'Cancel' }}
              handleConfirm={async () => {
                await createSuggestions({
                  suggest_type: suggestAction?.type,
                  description: suggestDescription
                });
                setSuggestDescription('');
                sendGA4Event('click_button', {
                  button_type: `Send Suggestion ${suggestAction?.type}`,
                  location: 'model'
                });
              }}
            />
          </>
        )}
      </Typography>
      {isLoading && (
        <Stack sx={{ mt: 2, alignItems: 'center' }}>
          <CircularProgress size={24} />
        </Stack>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: '12px' }}>
        {options
          .slice(0, showMore ? options.length : defaultDisplayCount)
          .map((option) => {
            const {
              icon,
              label,
              key,
              checked,
              description = '',
              toggleable = true,
              disabled = false
            } = option;
            const isSelected =
              (checked ??
                [...selectedItems].map((item) => item.key).includes(key)) &&
              !disabled;
            return (
              <HtmlTooltip
                key={key}
                placement="top"
                title={description && <Typography>{description}</Typography>}
              >
                <Chip
                  key={key}
                  variant={isSelected || disabled ? 'filled' : 'outlined'}
                  sx={{
                    height: 36,
                    p: '8px 20px',
                    fontSize: 14,
                    borderRadius: '10px',
                    bgcolor:
                      disabled || !toggleable
                        ? '#F2F2F2'
                        : isSelected
                          ? 'primary.light'
                          : '#fff',
                    border: '1px solid',
                    borderColor:
                      isSelected && toggleable ? 'primary.main' : '#D5D5D5',
                    lineHeight: 1.45,
                    letterSpacing: 0.15,
                    cursor: disabled
                      ? 'default'
                      : !toggleable && !isSelected
                        ? 'not-allowed'
                        : 'pointer',
                    '& .MuiChip-icon': {
                      mx: 0
                    },
                    '& .MuiChip-label': {
                      px: 0
                    }
                  }}
                  label={
                    <>
                      {icon && (
                        <span
                          role="img"
                          aria-label="icon"
                          style={{ marginRight: 8 }}
                        >
                          {icon}
                        </span>
                      )}
                      {label}
                    </>
                  }
                  onClick={() => {
                    if (!toggleable || disabled) return;
                    const selections = isSelected
                      ? [...selectedItems].filter((item) => item.key !== key)
                      : [option, ...selectedItems];

                    setSelectedItems?.(selections, sourceKey);
                    //send GA4 event

                    sendGA4Event(
                      `click_checkbox_${isSelected ? 'off' : 'on'}`,
                      {
                        button_type: `${GA4SourceType} | ${label}`,
                        location: 'agents_settings'
                      }
                    );
                  }}
                  clickable={toggleable}
                />
              </HtmlTooltip>
            );
          })}

        {!showMore && (
          <Typography
            variant="body2"
            color="primary.main"
            sx={{ cursor: 'pointer', height: 32, padding: '6px 8px' }}
            onClick={() => setShowMore(!showMore)}
          >
            +{options.length - defaultDisplayCount} more
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default memo(SelectionPanel);
