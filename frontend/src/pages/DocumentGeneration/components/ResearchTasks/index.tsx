import React, { memo, useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  ClickAwayListener,
  Stack,
  styled,
  Tooltip,
  Typography
} from '@mui/material';
import { AutoAwesomeRounded, RefreshRounded } from '@mui/icons-material';
import { CustomTextField } from '../StyledComponents';
import useSettingsStore from 'contexts/useSettingsStore';
import { useDebounce } from 'hooks/useDebounce';

const StyledButton = styled(Button)(({}) => ({
  height: 30,
  minWidth: 83,
  maxWidth: 130,
  padding: '5px 16px',
  fontWeight: 500,
  lineHeight: 1.45,
  textTransform: 'none'
}));

interface ResearchTasksProps {
  loading?: boolean;
  editMode?: string;
  setUserResearchTasks?: (_items: any) => void;
  isResearchTasksGenerating?: boolean;
  handleGenerateResearchTasks?: () => void;
  handleUpdateDocument?: (settings: any) => void;
  displayNameOnPlanOverview?: string;
}

const ResearchTasks = ({
  loading = false,
  editMode = '',
  isResearchTasksGenerating = false,
  handleGenerateResearchTasks = () => {},
  handleUpdateDocument = () => {},
  displayNameOnPlanOverview = ''
}: ResearchTasksProps) => {
  const { updatePlan: updateResearchTasks, plan: userResearchTasks = '' } =
    useSettingsStore((state) => state);

  const [researchTasks, setResearchTasks] = useState<string | undefined>(
    undefined
  );
  const [isShowTooltip, setIsShowTooltip] = useState<boolean>(
    editMode === 'update'
  );
  const debouncedResearchTasks = useDebounce(researchTasks, 600);

  const handleUpdateResearchTasks = () => {
    setResearchTasks(undefined);
    handleGenerateResearchTasks();
  };

  useEffect(() => {
    if (debouncedResearchTasks === undefined) return;
    handleUpdateDocument({
      plan: debouncedResearchTasks
    });
  }, [debouncedResearchTasks]);

  return (
    <Stack sx={{ py: 2, gap: 1, width: '50%', minWidth: 200 }}>
      <Stack sx={{ mb: 1, gap: '12px' }}>
        {!loading && (
          <Stack>
            <Typography
              variant="subtitle1"
              fontWeight={500}
              letterSpacing={0.15}
              lineHeight={1.42}
              fontSize={18}
            >
              {displayNameOnPlanOverview}
            </Typography>
            <Typography variant="body2" color="#666" lineHeight={1.45}>
              Outline {displayNameOnPlanOverview?.toLowerCase()} or generate one
              based on your inputs
            </Typography>
          </Stack>
        )}
        {!userResearchTasks ? (
          <StyledButton
            variant="contained"
            sx={{ pl: 2 }}
            startIcon={
              !isResearchTasksGenerating && (
                <AutoAwesomeRounded
                  fontSize="xsmall"
                  sx={{ verticalAlign: 'center' }}
                />
              )
            }
            disabled={isResearchTasksGenerating || editMode !== 'autoFill'}
            onClick={handleUpdateResearchTasks}
            data-ga-event="auto_fill_plan"
          >
            {isResearchTasksGenerating ? (
              <CircularProgress size={18} sx={{ color: '#BDBDBD' }} />
            ) : (
              'Auto-Fill Plan'
            )}
          </StyledButton>
        ) : (
          <ClickAwayListener onClickAway={() => setIsShowTooltip(false)}>
            <Tooltip
              placement="left"
              open={isShowTooltip}
              onMouseLeave={() => setIsShowTooltip(false)}
              arrow
              title={
                <Typography
                  display="block"
                  variant="caption"
                  textAlign="left"
                  lineHeight={1.37}
                >
                  Since the settings have been changed, it's important to
                  <br />
                  refresh the research task.
                </Typography>
              }
            >
              <StyledButton
                variant={isResearchTasksGenerating ? 'contained' : 'outlined'}
                startIcon={
                  !isResearchTasksGenerating && (
                    <RefreshRounded fontSize="xsmall" />
                  )
                }
                onClick={handleUpdateResearchTasks}
                disabled={isResearchTasksGenerating || editMode !== 'update'}
                data-ga-event="refresh_plan"
                sx={{
                  maxWidth: 100
                }}
              >
                {isResearchTasksGenerating ? (
                  <CircularProgress size={18} sx={{ color: '#BDBDBD' }} />
                ) : (
                  'Refresh'
                )}
              </StyledButton>
            </Tooltip>
          </ClickAwayListener>
        )}
      </Stack>
      {loading ? (
        <Stack sx={{ my: 4, width: '100%', alignItems: 'center' }}>
          <CircularProgress size={24} />
        </Stack>
      ) : (
        <CustomTextField
          multiline
          fullWidth
          placeholder="List key topics, propose research goals, or use the automated outline to tailor yor research needs."
          value={researchTasks ?? userResearchTasks}
          disabled={isResearchTasksGenerating}
          slotProps={{
            htmlInput: {
              'data-testid': 'research-tasks'
            },
            input: {
              sx: {
                display: 'block',
                p: '10px 24px 48px 16px',
                height: 'calc(100% - 50px)',
                textarea: {
                  height: '100% !important',
                  overflow: 'auto !important',
                  pr: 1.8,
                  fontSize: 14,
                  color: isResearchTasksGenerating
                    ? 'text.secondary'
                    : 'text.primary',
                  lineHeight: 1.45,
                  letterSpacing: 0.15,
                  zIndex: 1,
                  '&.Mui-disabled': {
                    color: 'text.disabled',
                    pointerEvents: 'none'
                  }
                }
              }
            }
          }}
          onChange={(e) => {
            const { value } = e.target;
            if (isResearchTasksGenerating) return;
            const researchTasks = value.trim() === '' ? '' : value;
            setResearchTasks(researchTasks);
            updateResearchTasks(researchTasks);
          }}
          sx={{
            flex: 1
          }}
        />
      )}
    </Stack>
  );
};

export default memo(ResearchTasks);
