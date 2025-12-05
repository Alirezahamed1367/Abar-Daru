import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Divider, Alert, Grid } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import SettingsIcon from '@mui/icons-material/Settings';
import { changePassword, backupDB, getSettings, updateSettings } from '../utils/api';

function SettingsPanel() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  
  // Expiration Settings
  const [expWarningDays, setExpWarningDays] = useState(90); // Default 3 months
  const [expDangerDays, setExpDangerDays] = useState(30);   // Default 1 month

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data.exp_warning_days) setExpWarningDays(res.data.exp_warning_days);
      if (res.data.exp_danger_days) setExpDangerDays(res.data.exp_danger_days);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        exp_warning_days: expWarningDays,
        exp_danger_days: expDangerDays
      });
      setMessage('تنظیمات سیستم ذخیره شد');
      setSeverity('success');
    } catch (err) {
      setMessage('خطا در ذخیره تنظیمات');
      setSeverity('error');
    }
  };

  const handleChangePassword = async () => {
    if (!username || !newPassword) {
      setMessage('لطفا نام کاربری و رمز عبور جدید را وارد کنید');
      setSeverity('error');
      return;
    }
    try {
      await changePassword({ username, new_password: newPassword });
      setMessage('رمز عبور با موفقیت تغییر یافت');
      setSeverity('success');
      setNewPassword('');
    } catch (err) {
      setMessage('خطا در تغییر رمز عبور');
      setSeverity('error');
    }
  };

  const handleBackup = async () => {
    try {
      await backupDB();
      setMessage('بکاپ دیتابیس با موفقیت انجام شد');
      setSeverity('success');
    } catch (err) {
      setMessage('خطا در تهیه بکاپ');
      setSeverity('error');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: '#f5f5f5', p: 2 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 600, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <SettingsIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            تنظیمات سیستم
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom>تنظیمات هشدارهای انقضا (روز)</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6}>
            <TextField
              label="هشدار زرد (روز مانده)"
              type="number"
              fullWidth
              value={expWarningDays}
              onChange={(e) => setExpWarningDays(e.target.value)}
              helperText="مثلا ۹۰ روز (۳ ماه)"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="هشدار قرمز (روز مانده)"
              type="number"
              fullWidth
              value={expDangerDays}
              onChange={(e) => setExpDangerDays(e.target.value)}
              helperText="مثلا ۳۰ روز (۱ ماه)"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth onClick={handleSaveSettings}>
              ذخیره تنظیمات انقضا
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>تغییر رمز عبور</Typography>
        <TextField 
          label="نام کاربری" 
          fullWidth 
          margin="normal" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <TextField 
          label="رمز عبور جدید" 
          type="password" 
          fullWidth 
          margin="normal" 
          value={newPassword} 
          onChange={e => setNewPassword(e.target.value)} 
        />
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          sx={{ mt: 2, mb: 4 }} 
          onClick={handleChangePassword}
        >
          تغییر رمز عبور
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>نسخه پشتیبان</Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          fullWidth 
          startIcon={<BackupIcon />}
          onClick={handleBackup}
        >
          تهیه بکاپ از دیتابیس
        </Button>

        {message && (
          <Alert severity={severity} sx={{ mt: 3 }}>
            {message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default SettingsPanel;
