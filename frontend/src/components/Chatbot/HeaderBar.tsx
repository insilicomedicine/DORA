import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type HeaderBarProps = {
  title?: string;
  subtitle?: string;
};

function HeaderBar({
  title = 'Chatbot',
  subtitle = 'Ask anything about your documents'
}: HeaderBarProps) {
  return (
    <Box sx={{ p: 1.5, pb: 1 }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, letterSpacing: 0.2 }}
      >
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}

export default HeaderBar;
