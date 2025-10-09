import React, { useState, memo } from 'react';
import { Stack, Dialog, DialogContent } from '@mui/material';
import SettingsBlock from './components/SettingsBlock';
import ModalHeader from './components/ModalHeader';
import SVGRenderer from 'components/SVGRenderer';
import RequestStatusIsLoadingOrGotErrorBlock from './components/RequestStatusIsLoadingOrGotErrorBlock';
import { generateMermaidDiagram } from 'services/documents';
import { useDocumentStore } from 'contexts/documentsStore';
import { sendGA4Event } from 'utils/ga';
import usePlanStatus from 'hooks/usePlanStatus';
import { useUserStore } from 'contexts/useUserStore';

interface ViewDialogProps {
  open: boolean;
  onClose: () => void;
  svg: string;
  mermaidEditorLink: string;
  diagramType: string;
  documentTitle: string;
}

const ViewDialog = ({
  open,
  onClose,
  svg,
  mermaidEditorLink,
  diagramType,
  documentTitle
}: ViewDialogProps) => {
  const { documentData, setDocumentDetailData } = useDocumentStore();
  const { userInfo: { is_internal: isUserInternal = false } = {} } =
    useUserStore();

  const { isPaidPlanExpired, isReachedLimit } = usePlanStatus();
  const settingsBlockisDisabled =
    (isPaidPlanExpired || isReachedLimit) && !isUserInternal;

  const savedDiagramType = diagramType.toLowerCase();
  const [selectedType, setSelectedType] = useState(savedDiagramType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSelectType = async (type) => {
    setLoading(true);
    setError(false);
    setSelectedType(type);
    try {
      if (!documentData?.id) return;
      const generatedMermaidDiagram = await generateMermaidDiagram(
        documentData?.id,
        {
          diagram_type: type.toUpperCase()
        }
      );
      if (!generatedMermaidDiagram.svg_diagram) {
        throw new Error('No diagram found');
      }
      if (documentData) {
        setDocumentDetailData({
          documentData: {
            ...documentData,
            mermaid_diagram: generatedMermaidDiagram
          }
        });
      }
      setLoading(false);
      // GA4 event
      sendGA4Event('click_button', {
        button_type: type,
        location: 'editor_diagram'
      });
    } catch (_error) {
      setError(true);
      setSelectedType(savedDiagramType);
      setLoading(false);
    }
  };

  return (
    <Dialog
      sx={{
        '& .MuiDialog-paper': {
          minWidth: 1300,
          minHeight: 680,
          borderRadius: 4
        }
      }}
      open={open}
      onClose={onClose}
      data-testid="viewDialog-wrapper"
    >
      <DialogContent
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: 0
        }}
      >
        <SettingsBlock
          selectedType={selectedType}
          handleSelectType={handleSelectType}
          loading={loading}
          mermaidEditorLink={mermaidEditorLink}
          settingsBlockisDisabled={settingsBlockisDisabled}
        />
        <Stack
          sx={{
            padding: 3,
            position: 'relative'
          }}
        >
          <ModalHeader
            onClose={onClose}
            titleText="Visual summary"
            svg={svg}
            documentTitle={documentTitle}
          />

          <div style={{ opacity: loading ? '0.3' : '1' }}>
            <SVGRenderer svgString={svg} height={596} width={1082} />
          </div>
          <RequestStatusIsLoadingOrGotErrorBlock
            loading={loading}
            error={error}
            onCloseErrorAlert={() => setError(false)}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ViewDialog);
