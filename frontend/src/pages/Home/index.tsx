import { useEffect, lazy, Suspense } from 'react';
import { initialJiraServiceDesk } from 'utils/initialJiraServiceDesk';
import Box from '@mui/material/Box';
import LeftPanel from './components/LeftPanel';
import PageSkeleton from 'components/PageSkeleton';
import { theme } from 'theme';

// Lazy load heavy components
const Templates = lazy(() => import('pages/Templates'));
const DocumentGeneration = lazy(() => import('pages/DocumentGeneration'));
const Bibliography = lazy(() => import('./components/Bibliography'));
const DocumentDetail = lazy(() => import('./components/DocumentDetail'));

const ComponentsMap = {
  Templates,
  DocumentGeneration,
  Bibliography,
  DocumentDetail
};

type ComponentKey = keyof typeof ComponentsMap;

interface HomeProps {
  componentKey?: ComponentKey;
}

const Home = ({ componentKey = 'DocumentGeneration' }: HomeProps) => {
  useEffect(() => {
    initialJiraServiceDesk();
  }, []);

  const ActivedComponent = ComponentsMap[componentKey];
  const loadTemplates = componentKey === 'Templates';

  return (
    <Box
      position="relative"
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
      height="100%"
      gap={1}
    >
      <LeftPanel
        sx={{
          ...(loadTemplates && {
            '& .addNewDocumentButton': {
              pointerEvents: 'none',
              '& svg': {
                fill: theme.palette.text.disabled
              }
            }
          })
        }}
        enableCollapseButton={loadTemplates}
      />

      <Suspense
        fallback={
          <Box width="100%" height="100%">
            <PageSkeleton />
          </Box>
        }
      >
        <ActivedComponent />
      </Suspense>
    </Box>
  );
};

export default Home;
