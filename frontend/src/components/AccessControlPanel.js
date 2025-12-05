import React from 'react';
import { Box, Typography, FormGroup, FormControlLabel, Checkbox, Button } from '@mui/material';

function AccessControlPanel() {
  return (
    <Box sx={{ mt: 4, p: 2, border: '1px solid #7b1fa2', borderRadius: 2, boxShadow: 2, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom align="center">
        تنظیم سطح دسترسی کاربران
      </Typography>
      <FormGroup>
        <FormControlLabel control={<Checkbox />} label="مشاهده داروها" />
        <FormControlLabel control={<Checkbox />} label="ثبت رسید انبار" />
        <FormControlLabel control={<Checkbox />} label="ثبت حواله انبار" />
        <FormControlLabel control={<Checkbox />} label="مدیریت مصرف‌کننده" />
        <FormControlLabel control={<Checkbox />} label="مدیریت تامین‌کننده" />
        <FormControlLabel control={<Checkbox />} label="گزارشات و خروجی" />
      </FormGroup>
      <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}>
        ثبت دسترسی‌ها
      </Button>
    </Box>
  );
}

export default AccessControlPanel;
