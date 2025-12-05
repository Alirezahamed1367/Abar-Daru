import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Vazirmatn, Roboto, Arial',
  },
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#7b1fa2' },
    error: { main: '#d32f2f' },
    warning: { main: '#fbc02d' },
    info: { main: '#0288d1' },
    success: { main: '#388e3c' },
  },
});

export default theme;
