import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Divider, Alert, Grid } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import SettingsIcon from '@mui/icons-material/Settings';
import { changePassword, backupDB, getSettings, updateSettings } from '../utils/api';
import { useCurrentUser } from '../utils/useCurrentUser';

function SettingsPanel() {
  const currentUser = useCurrentUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  
  // Expiration Settings (only for admin/superadmin)
  const [expWarningDays, setExpWarningDays] = useState(90); // Default 3 months
  
  const isAdminOrSuperAdmin = currentUser && (currentUser.access_level === 'admin' || currentUser.access_level === 'superadmin');

  useEffect(() => {
    if (isAdminOrSuperAdmin) {
      loadSettings();
    }
  }, [isAdminOrSuperAdmin]);

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data.exp_warning_days) setExpWarningDays(res.data.exp_warning_days);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        exp_warning_days: expWarningDays
      });
      setMessage('تنظیمات سیستم ذخیره شد');
      setSeverity('success');
    } catch (err) {
      setMessage('خطا در ذخیره تنظیمات');
      setSeverity('error');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setMessage('لطفا رمز عبور قبلی و جدید را وارد کنید');
      setSeverity('error');
      return;
    }
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setMessage('رمز عبور با موفقیت تغییر یافت');
      setSeverity('success');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      console.error('Error response:', err.response);
      let errorMsg = 'خطا در تغییر رمز عبور';
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data) {
        errorMsg = JSON.stringify(err.response.data);
      } else if (err.message) {
        errorMsg = `خطا: ${err.message}`;
      }
      setMessage(errorMsg);
      setSeverity('error');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await backupDB();
      setMessage(`بکاپ دیتابیس با موفقیت انجام شد: ${response.data.backup}`);
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

        {/* Admin/SuperAdmin Settings */}
        {isAdminOrSuperAdmin && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              🎨 تنظیمات رنگ‌بندی داروها بر اساس انقضا
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" component="div">
                <strong>رنگ قرمز:</strong> داروهای منقضی شده (تاریخ انقضا گذشته)<br/>
                <strong>رنگ زرد:</strong> داروهای در حال انقضا (کمتر از تعداد روز مشخص شده)<br/>
                <strong>رنگ سبز:</strong> داروهای سالم (بیشتر از تعداد روز مشخص شده)
              </Typography>
            </Alert>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <TextField
                  label="تعداد روز برای رنگ زرد (هشدار انقضا)"
                  type="number"
                  fullWidth
                  value={expWarningDays}
                  onChange={(e) => setExpWarningDays(e.target.value)}
                  helperText="مثال: ۹۰ روز - داروهایی که کمتر از ۹۰ روز به انقضا مانده زرد می‌شوند"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 2 }}>
                  💡 توجه: داروهایی که تاریخ انقضایشان گذشته باشد همیشه قرمز نمایش داده می‌شوند
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="primary" fullWidth onClick={handleSaveSettings}>
                  💾 ذخیره تنظیمات رنگ‌بندی
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
          </>
        )}

        {/* Password Change - Available to All Users */}
        <Typography variant="h6" gutterBottom>
          <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          تغییر رمز عبور
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          در این قسمت می‌توانید رمز عبور خود را تغییر دهید
        </Typography>
        <TextField 
          label="رمز عبور قبلی" 
          type="password" 
          fullWidth 
          margin="normal" 
          value={oldPassword} 
          onChange={e => setOldPassword(e.target.value)} 
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
          sx={{ mt: 2 }} 
          onClick={handleChangePassword}
        >
          تغییر رمز عبور
        </Button>

        {/* Backup - Only for Admin/SuperAdmin */}
        {isAdminOrSuperAdmin && (
          <>
            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              <BackupIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              نسخه پشتیبان
            </Typography>
            <Button 
              variant="contained" 
              color="secondary" 
              fullWidth 
              startIcon={<BackupIcon />}
              onClick={handleBackup}
            >
              تهیه بکاپ از دیتابیس
            </Button>
          </>
        )}

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
