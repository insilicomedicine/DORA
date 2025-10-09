import React, { memo } from 'react';
import { IconButton, Typography, Tooltip, styled } from '@mui/material';
import { CloseRounded, DownloadRounded } from '@mui/icons-material';
import { downloadSvg } from 'utils/utils';
import usePlanStatus from 'hooks/usePlanStatus';
import { sendGA4Event } from 'utils/ga';

interface ModalHeaderProps {
  onClose: () => void;
  titleText: string;
  svg: string;
  documentTitle: string;
}

const StyledIconButton = styled(IconButton)(({}) => ({
  padding: 0.5,
  marginRight: 0,
  '&:hover': {
    backgroundColor: 'transparent'
  },
  '& svg': {
    maxWidth: 19,
    width: 'auto'
  }
}));

const ModalHeader = ({
  onClose,
  titleText,
  svg,
  documentTitle
}: ModalHeaderProps) => {
  const { isExpired, limitInfos = {} } = usePlanStatus();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography fontWeight={500} data-testid="viewDialog-title">
        {titleText}
      </Typography>
      <div>
        <Tooltip
          title={isExpired ? limitInfos.expired?.export : ''}
          placement="bottom-end"
        >
          <span>
            <StyledIconButton
              aria-label="download-svg"
              onClick={() => {
                downloadSvg(svg, documentTitle);
                sendGA4Event('click_button', {
                  button_type: 'Download Diagram',
                  location: 'view_diagram_dialog'
                });
              }}
              style={{ marginRight: 8 }}
              disabled={isExpired}
            >
              <DownloadRounded />
            </StyledIconButton>
          </span>
        </Tooltip>

        <StyledIconButton aria-label="close-modal" onClick={onClose}>
          <CloseRounded />
        </StyledIconButton>
      </div>
    </div>
  );
};

export default memo(ModalHeader);
