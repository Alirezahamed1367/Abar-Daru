import React, { useState } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

function BackupPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/backup-db`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setMessage(response.data.message);
      
      // Show backup file name in console
      if (response.data.backup) {
        console.log('Backup created:', response.data.backup);
      }
    } catch (err) {
      console.error('Backup error:', err);
      setError(err.response?.data?.detail || err.message || 'خطا در ایجاد بکاپ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, p: 2, border: '1px solid #1976d2', borderRadius: 2, boxShadow: 2, maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        بکاپ‌گیری خودکار دیتابیس
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
        fullWidth
        onClick={handleBackup}
        disabled={loading}
      >
        {loading ? 'در حال ایجاد بکاپ...' : 'بکاپ‌گیری دستی'}
      </Button>
      
      {message && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="body2" sx={{ mt: 2 }}>
        بکاپ‌ها به صورت خودکار در پوشه db_backup ذخیره می‌شوند.
      </Typography>
    </Box>
  );
}

export default BackupPanel;
