import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import { addSupplier } from '../utils/api';

function SupplierForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      await addSupplier({ name, phone, address });
      setMessage('تامین‌کننده با موفقیت ثبت شد');
    } catch (err) {
      console.error('Supplier creation error:', err.response?.data);
      let errorMessage = 'خطا در ثبت تامین‌کننده';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg || e).join(', ');
        }
      }
      setMessage(errorMessage);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: '#f5f5f5' }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 420, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <StoreIcon color="warning" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main" gutterBottom>
            ثبت تامین‌کننده
          </Typography>
        </Box>
        <TextField label="نام تامین‌کننده" fullWidth margin="normal" required value={name} onChange={e => setName(e.target.value)} />
        <TextField label="شماره تماس" fullWidth margin="normal" value={phone} onChange={e => setPhone(e.target.value)} />
        <TextField label="آدرس" fullWidth margin="normal" value={address} onChange={e => setAddress(e.target.value)} />
        {message && <Typography color="success.main" align="center" sx={{ mt: 2 }}>{message}</Typography>}
        <Button variant="contained" color="warning" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: 'bold', fontSize: 18 }} onClick={handleSubmit}>
          ثبت تامین‌کننده
        </Button>
      </Paper>
    </Box>
  );
}

export default SupplierForm;
