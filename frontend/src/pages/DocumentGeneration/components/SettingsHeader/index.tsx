import React, { memo, ReactNode } from 'react';
import { Button, Stack, SxProps, Theme, Typography } from '@mui/material';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import type { TypographyVariant } from '@mui/material/styles/createTypography';
import { CustomTooltip } from '../StyledComponents';
import { theme } from 'theme';

export interface SettingsHeaderProps {
  title: string;
  titleLevel?: TypographyVariant;
  titleStyle?: SxProps<Theme>;
  isRequired?: boolean;
  disableToolTip?: boolean;
  description?: string;
  className?: string;
  popoverInfo?: { content?: string | ReactNode };
  sx?: SxProps<Theme>;
}

const SettingHeader = ({
  title = '',
  titleLevel = 'body2',
  titleStyle = {},
  description = '',
  isRequired = false,
  disableToolTip = false,
  popoverInfo,
  className = '',
  sx = {}
}: SettingsHeaderProps) => {
  return (
    <Stack sx={{ gap: 0.5, py: 2, ...sx }} className={className}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <Typography
          variant={titleLevel}
          fontWeight={500}
          whiteSpace="nowrap"
          lineHeight={1.45}
          letterSpacing={0.1}
          sx={{
            ...(titleLevel === 'subtitle1' && {
              fontSize: 18,
              letterSpacing: 0.15,
              lineHeight: 1.42
            }),
            ...titleStyle
          }}
        >
          {title}
          {!isRequired && (
            <span
              style={{
                fontWeight: 400,
                marginLeft: 4,
                color: theme.palette.grey[500]
              }}
            >
              (Optional)
            </span>
          )}
        </Typography>
        {!disableToolTip && (
          <CustomTooltip
            title={
              <>
                <Typography variant="body2" mb="12px">
                  {popoverInfo?.content}
                </Typography>
                <Button
                  variant="text"
                  color="primary"
                  sx={{
                    textTransform: 'none',
                    letterSpacing: 0.1,
                    padding: '5px 8px 5px 16px'
                  }}
                  endIcon={<OpenInNewRounded />}
                  onClick={() => {
                    window.open('https://pharma.ai/science42/dora/help');
                  }}
                  data-ga-event="Go to Manual"
                  data-ga-event-location="tooltip"
                >
                  Go to Manual
                </Button>
              </>
            }
          >
            <HelpOutlineRounded
              sx={{
                fontSize: 16,
                '&:hover': {
                  fill: theme.palette.common.black
                }
              }}
              htmlColor={theme.palette.grey[600]}
            />
          </CustomTooltip>
        )}
      </Stack>
      {description && (
        <Typography variant="body2" color="text.secondary" lineHeight="145%">
          {description}
        </Typography>
      )}
    </Stack>
  );
};
export default memo(SettingHeader);
