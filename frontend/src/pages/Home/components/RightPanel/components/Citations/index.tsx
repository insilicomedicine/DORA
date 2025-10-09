import React, {
  memo,
  useState,
  MouseEvent,
  Fragment,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Button, Stack, SxProps, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PublicationDialog from '../PublicationDialog';
import { publicationsViewController } from 'utils/publicationsViewController';
import { PublicationsViewModel } from 'types/bibliography';
import { theme } from 'theme';

const StyledButton = ({
  label,
  labelIcon,
  isSearchResult,
  onClick
}: {
  label: string | React.ReactNode;
  labelIcon?: React.ReactNode;
  isSearchResult?: boolean;
  onClick: (e: MouseEvent) => void;
}) => (
  <Button
    variant="text"
    disableRipple
    sx={{
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      textTransform: 'none',
      padding: 0,
      fontSize: 'inherit',
      userSelect: 'text',
      '& .openInNewIcon': {
        display: 'none'
      },
      '&:hover': {
        background: 'transparent',
        '& .openInNewIcon': {
          display: 'inline-block'
        }
      }
    }}
    onClick={(e) => {
      onClick(e);
    }}
  >
    <Typography
      color="primary.dark"
      fontSize="inherit"
      lineHeight={1.45}
      letterSpacing={0.15}
      display="flex"
      alignItems="center"
      flexDirection="row"
      {...(!isSearchResult && {
        sx: {
          '&:hover': { textDecoration: 'underline' }
        }
      })}
    >
      {label}
      {labelIcon}
    </Typography>
  </Button>
);

interface CitationsProps extends Partial<PublicationsViewModel> {
  sx?: SxProps;
  disableViewAbstract?: boolean;
  isSearchResult?: boolean;
}

export interface CitationsRef {
  handleOpenDialog: () => void;
}

const Citations = forwardRef<CitationsRef, CitationsProps>(
  ({ sx, disableViewAbstract, isSearchResult, ...props }, ref) => {
    const publicationData = publicationsViewController(
      props as PublicationsViewModel
    );

    const { citation_count, publicationSourcesMap } = publicationData;
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogData, setDialogData] = useState<any | undefined>(undefined);

    const handleCloseDialog = (e: MouseEvent) => {
      e.stopPropagation();
      setOpenDialog(false);
      setDialogData(undefined);
    };

    const handleOpenDialog = () => {
      setDialogData({
        ...publicationData,
        ...props
      });
      setOpenDialog(true);
    };

    // Expose the methods via ref
    useImperativeHandle(ref, () => ({
      handleOpenDialog
    }));

    const buttons = [
      {
        label: 'View Abstract',
        onClick: handleOpenDialog,
        show: !disableViewAbstract
      },
      {
        label: isSearchResult ? (
          !disableViewAbstract ? (
            'Open PubMed'
          ) : (
            <>
              {publicationSourcesMap?.pmc?.id && (
                <>
                  <span style={{ color: '#666' }}>PMC: </span>
                  <span className="externalLink">
                    {publicationSourcesMap?.pmc?.id}
                  </span>
                  <Typography
                    variant="caption"
                    color="grey.400"
                    mx={0.5}
                    fontSize="inherit"
                  >
                    •
                  </Typography>
                </>
              )}
              <span style={{ color: '#666' }}>PMID: </span>
              <span className="externalLink">
                {publicationSourcesMap?.pubmed?.id}
              </span>
            </>
          )
        ) : (
          'PubMed'
        ),
        ...(disableViewAbstract &&
          !isSearchResult && {
            labelIcon: (
              <OpenInNewIcon
                fontSize="xsmall"
                className="openInNewIcon"
                sx={{ pl: 0.5 }}
              />
            )
          }),
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          window.open(publicationSourcesMap?.pubmed?.link, '_blank');
        },
        show: !!publicationSourcesMap?.pubmed?.id
      }
    ];

    return (
      <>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            fontSize: 14,
            ...(!disableViewAbstract && {
              [theme.breakpoints.down('xl')]: {
                fontSize: 12
              }
            }),
            ...sx
          }}
          data-testid="citations"
        >
          <Typography color="textSecondary" fontSize="inherit">
            Citations: {citation_count ?? ' - '}
          </Typography>
          {buttons
            .filter((button) => button.show)
            .map((button, index) => (
              <Fragment key={index}>
                <Typography color="grey.400" mx={0.5} fontSize="inherit">
                  •
                </Typography>
                <StyledButton {...button} isSearchResult={isSearchResult} />
              </Fragment>
            ))}
        </Stack>
        {openDialog && (
          <PublicationDialog
            handleClose={handleCloseDialog}
            open={openDialog}
            data={dialogData}
            enableTypeFilter
          />
        )}
      </>
    );
  }
);

export default memo(Citations);
