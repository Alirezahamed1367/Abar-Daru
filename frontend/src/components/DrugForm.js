import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import MedicationIcon from '@mui/icons-material/Medication';
import { addDrug } from '../utils/api';

function DrugForm() {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [packageType, setPackageType] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      await addDrug({ name, dose, package_type: packageType, description });
      setMessage('دارو با موفقیت ثبت شد');
    } catch {
      setMessage('خطا در ثبت دارو');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: '#f5f5f5' }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 420, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <MedicationIcon color="secondary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="secondary" gutterBottom>
            ثبت دارو
          </Typography>
        </Box>
        <TextField label="نام دارو" fullWidth margin="normal" required value={name} onChange={e => setName(e.target.value)} />
        <TextField label="دوز دارو" fullWidth margin="normal" value={dose} onChange={e => setDose(e.target.value)} />
        <TextField label="نوع بسته‌بندی" fullWidth margin="normal" value={packageType} onChange={e => setPackageType(e.target.value)} />
        <TextField label="توضیحات" fullWidth margin="normal" value={description} onChange={e => setDescription(e.target.value)} />
        {message && <Typography color="success.main" align="center" sx={{ mt: 2 }}>{message}</Typography>}
        <Button variant="contained" color="secondary" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: 'bold', fontSize: 18 }} onClick={handleSubmit}>
          ثبت دارو
        </Button>
      </Paper>
    </Box>
  );
}

export default DrugForm;
