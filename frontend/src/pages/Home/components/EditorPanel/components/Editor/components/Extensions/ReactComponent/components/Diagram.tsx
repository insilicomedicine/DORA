import React from 'react';
import { useDocumentStore } from 'contexts/documentsStore';
import { removeDiagramFromDocument } from 'services/documents';
import Diagram from '../../../Diagram';

export default (_props) => {
  const { documentData, setDocumentDetailData } = useDocumentStore();

  const isPolishing = documentData?.stage === 'polishing';

  const handleRemoveDiagramFromDocument = async () => {
    if (!documentData?.id) return;
    const response = await removeDiagramFromDocument(documentData.id);
    if (!response) return;
    setDocumentDetailData({
      documentData: {
        ...documentData,
        mermaid_diagram: null
      }
    });
  };

  return (
    <>
      {!isPolishing && documentData?.['mermaid_diagram'] && (
        <Diagram
          diagramData={documentData['mermaid_diagram']}
          handleRemoveDiagramFromDocument={handleRemoveDiagramFromDocument}
          documentTitle={documentData.title}
        />
      )}
    </>
  );
};
