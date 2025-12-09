import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { addConsumer } from '../utils/api';

function ConsumerForm() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      await addConsumer({ name, address, description });
      setMessage('مصرف‌کننده با موفقیت ثبت شد');
    } catch (err) {
      console.error('Consumer creation error:', err.response?.data);
      let errorMessage = 'خطا در ثبت مصرف‌کننده';
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
          <PersonIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="info.main" gutterBottom>
            ثبت مصرف‌کننده
          </Typography>
        </Box>
        <TextField label="نام مصرف‌کننده" fullWidth margin="normal" required value={name} onChange={e => setName(e.target.value)} />
        <TextField label="آدرس" fullWidth margin="normal" value={address} onChange={e => setAddress(e.target.value)} />
        <TextField label="توضیحات" fullWidth margin="normal" value={description} onChange={e => setDescription(e.target.value)} />
        {message && <Typography color="success.main" align="center" sx={{ mt: 2 }}>{message}</Typography>}
        <Button variant="contained" color="info" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: 'bold', fontSize: 18 }} onClick={handleSubmit}>
          ثبت مصرف‌کننده
        </Button>
      </Paper>
    </Box>
  );
}

export default ConsumerForm;
