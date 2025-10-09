import React, { useState } from 'react';
import { IconButton, Stack, Typography } from '@mui/material';
import FullscreenRounded from '@mui/icons-material/FullscreenRounded';
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded';
import DeleteDialog from './components/DeleteDialog';
import SVGRenderer from 'components/SVGRenderer';
import ViewDialog from './components/ViewDialog';
import { MermaidDiagramData } from 'types/document';
import usePlanStatus from 'hooks/usePlanStatus';

interface DiagramProps {
  diagramData: MermaidDiagramData;
  handleRemoveDiagramFromDocument: () => void;
  documentTitle: string;
}

const Diagram = ({
  diagramData,
  handleRemoveDiagramFromDocument,
  documentTitle
}: DiagramProps) => {
  const { diagram_type, mermaid_editor_link, svg_diagram } = diagramData;
  const [hover, setHover] = useState(false);
  const [viewSvgDialogIsOpen, setViewSvgDialogIsOpen] = useState(false);
  const [deleteSvgDialogIsOpen, setDeleteSvgDialogIsOpen] = useState(false);

  const { isExpired } = usePlanStatus();

  const handleToggleHover = (isHovering) => () => setHover(isHovering);
  const handleOpenDialog = (setDialogState) => () => setDialogState(true);
  const handleCloseDialog = (setDialogState) => () => setDialogState(false);

  const icons = [
    {
      Icon: FullscreenRounded,
      handler: handleOpenDialog(setViewSvgDialogIsOpen),
      ariaLabel: 'view'
    },
    {
      Icon: DeleteForeverRounded,
      handler: handleOpenDialog(setDeleteSvgDialogIsOpen),
      ariaLabel: 'delete',
      disabled: isExpired
    }
  ];

  return (
    <>
      <Stack
        sx={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 3,
          padding: 2,
          userSelect: 'none'
        }}
        onMouseEnter={handleToggleHover(true)}
        onMouseLeave={handleToggleHover(false)}
        data-testid="diagram-wrapper"
      >
        <SVGRenderer svgString={svg_diagram} showZoomControls={false} />
        {hover && (
          <Stack
            direction="row"
            sx={{
              marginLeft: 1.25,
              position: 'absolute',
              right: 16,
              top: 24
            }}
          >
            {icons.map(({ Icon, handler, ariaLabel }, index) => (
              <IconButton
                key={index}
                data-testid={`diagram-icon-${ariaLabel}`}
                size="small"
                onClick={handler}
                aria-label={ariaLabel}
                data-ga-tracking
                data-ga-event-type={`Diagram ${ariaLabel}`}
                data-ga-event-location="editor_diagram"
              >
                <Icon />
              </IconButton>
            ))}
          </Stack>
        )}
        <Typography variant="caption">Visual summary</Typography>
      </Stack>
      <ViewDialog
        open={viewSvgDialogIsOpen}
        onClose={handleCloseDialog(setViewSvgDialogIsOpen)}
        svg={svg_diagram}
        mermaidEditorLink={mermaid_editor_link}
        diagramType={diagram_type}
        documentTitle={documentTitle}
      />
      <DeleteDialog
        open={deleteSvgDialogIsOpen}
        onClose={handleCloseDialog(setDeleteSvgDialogIsOpen)}
        handleRemoveDiagramFromDocument={handleRemoveDiagramFromDocument}
      />
    </>
  );
};

export default Diagram;
