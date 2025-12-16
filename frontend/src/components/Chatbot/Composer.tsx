import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MuiIconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CircularProgress from '@mui/material/CircularProgress';

type ComposerProps = {
  value: string;
  isChatCompleted?: boolean;
  isDraftGenerating?: boolean;
  minRows?: number;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
};

function Composer({
  value,
  isChatCompleted,
  isDraftGenerating,
  minRows = 1,
  onChange,
  onSend,
  onKeyDown
}: ComposerProps) {
  const disabled = !value.trim() || !isChatCompleted || isDraftGenerating;

  return (
    <Stack
      sx={{
        p: 1,
        alignItems: 'flex-end',
        border: '#BDBDBD',
        borderRadius: 4,
        gap: 1.75,
        boxShadow: '0 1px 4px 1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={minRows}
        maxRows={14}
        placeholder="Message DORA"
        value={value}
        disabled={isDraftGenerating}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        sx={{
          '& .MuiInputBase-root': {
            padding: '8px 0 0 8px',
            bgcolor: 'common.white',
            borderRadius: 2,
            lineHeight: 1.5,
            alignItems: 'flex-end'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
          },
          mr: -1,
          borderRadius: 4
        }}
        slotProps={{
          input: {
            style: { resize: 'none' },
            onKeyDown
          }
        }}
      />
      <MuiIconButton
        color="primary"
        onClick={onSend}
        aria-label="send"
        disabled={disabled}
        sx={{
          height: 32,
          width: 32,
          borderRadius: '9px',
          bgcolor: disabled ? '#EEE !important' : 'primary.main',
          '&:hover': {
            bgcolor: '#1A7F4D'
          }
        }}
      >
        {isDraftGenerating ? (
          <CircularProgress size={16} sx={{ color: '#BDBDBD' }} />
        ) : (
          <ArrowUpwardIcon
            sx={{ color: disabled ? 'grey.500' : 'white' }}
            fontSize="small"
          />
        )}
      </MuiIconButton>
    </Stack>
  );
}

export default Composer;
