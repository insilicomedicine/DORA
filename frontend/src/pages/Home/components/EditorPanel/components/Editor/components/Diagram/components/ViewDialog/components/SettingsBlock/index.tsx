import React, { memo } from 'react';
import {
  Button,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tooltip,
  Box,
  styled
} from '@mui/material';

const SettingsWrapper = styled(Box)(({}) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: 24,
  borderRight: '1px solid #E0E0E0',
  width: 170
}));

interface SettingsBlockProps {
  selectedType: string;
  handleSelectType: (type: string) => void;
  loading: boolean;
  mermaidEditorLink: string;
  settingsBlockisDisabled: boolean;
}

const SettingsBlock = ({
  selectedType,
  handleSelectType,
  loading,
  mermaidEditorLink,
  settingsBlockisDisabled
}: SettingsBlockProps) => {
  const handleChangeType = (e) => handleSelectType(e.target.value);

  const typeOptions = [
    {
      value: 'flowchart',
      label: 'Flowchart'
    },
    { value: 'state', label: 'State' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'sequence', label: 'Sequence' }
  ];

  const tooltipMarginBottom = -16;

  return (
    <SettingsWrapper data-testid="viewDialog-settingsBlockWrapper">
      <Typography
        fontWeight={500}
        fontSize={12}
        lineHeight={'137%'}
        sx={{ mb: 1 }}
      >
        Type
      </Typography>
      <Tooltip
        title={
          settingsBlockisDisabled
            ? 'Your plan has expired.\n Please renew or upgrade to access diagram type generation'
            : ''
        }
        placement="bottom"
        slotProps={{
          popper: {
            popperOptions: {
              modifiers: [
                {
                  name: 'offset',
                  options: { offset: [0, tooltipMarginBottom] }
                }
              ]
            }
          }
        }}
      >
        <RadioGroup
          name="type"
          value={selectedType}
          onChange={handleChangeType}
        >
          {typeOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              sx={{
                p: 0,
                mr: 0,
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '145%',
                letterSpacing: 0.15
              }}
              value={option.value}
              control={<Radio size="small" />}
              label={option.label}
              disabled={loading || settingsBlockisDisabled}
            />
          ))}
        </RadioGroup>
      </Tooltip>
      <Button
        type="link"
        href={mermaidEditorLink}
        data-testid="settingsBlock-editInMermaidButton"
        target="_blank"
        variant="outlined"
        color="primary"
        sx={{
          marginTop: 'auto',
          textTransform: 'capitalize',
          fontSize: 12,
          whiteSpace: 'nowrap'
        }}
      >
        Edit in Mermaid
      </Button>
    </SettingsWrapper>
  );
};

export default memo(SettingsBlock);
