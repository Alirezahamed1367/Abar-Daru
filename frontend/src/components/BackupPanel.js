import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';

function BackupPanel() {
  return (
    <Box sx={{ mt: 4, p: 2, border: '1px solid #1976d2', borderRadius: 2, boxShadow: 2, maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        بکاپ‌گیری خودکار دیتابیس
      </Typography>
      <Button variant="contained" color="primary" startIcon={<BackupIcon />} fullWidth>
        بکاپ‌گیری دستی
      </Button>
      <Typography variant="body2" sx={{ mt: 2 }}>
        بکاپ‌ها به صورت خودکار در پوشه db_backup ذخیره می‌شوند.
      </Typography>
    </Box>
  );
}

export default BackupPanel;
