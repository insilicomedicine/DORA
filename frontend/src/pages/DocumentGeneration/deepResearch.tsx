import Box from '@mui/material/Box';
import Chatbot from 'components/Chatbot';

const DeepResearch = ({
  documentId,
  templateId
}: {
  documentId?: string;
  templateId?: string;
}) => {
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Chatbot documentId={documentId} templateId={templateId} />
    </Box>
  );
};

export default DeepResearch;
