import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseRounded from '@mui/icons-material/CloseRounded';

interface ReconnectSnackbarProps {
  open: boolean;
  onClose: () => void;
}

const ReconnectSnackbar = ({ open, onClose }: ReconnectSnackbarProps) => {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 16, md: 24 } }}
    >
      <Alert
        icon={false}
        sx={{
          backgroundColor: '#E8A728',
          border: 'none',
          color: '#fff',
          borderRadius: 2,
          alignItems: 'center',
          padding: '6px 16px',
          '& .MuiAlert-action': {
            padding: 0,
            marginLeft: 2,
            alignItems: 'center'
          }
        }}
        action={
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Button
              color="inherit"
              onClick={() => window.location.reload()}
              sx={{
                fontWeight: 500,
                letterSpacing: 0.1,
                textTransform: 'none',
                minWidth: 'auto',
                padding: '5px 12px',
                '&:hover': {
                  color: '#fff',
                  backgroundColor: '#0000000a'
                }
              }}
            >
              Resume
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={onClose}
              sx={{ padding: '4px' }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>
        }
      >
        <Typography variant="body2" sx={{ width: 471, py: 1 }}>
          Automatic updates may be paused. Resume to continue receiving updates
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default ReconnectSnackbar;
