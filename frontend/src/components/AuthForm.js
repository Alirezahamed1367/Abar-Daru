import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Avatar, Paper } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { login } from '../utils/api';

function AuthForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      // Convert username to lowercase for case-insensitive login
      const usernameLower = username.toLowerCase().trim();
      console.log('Attempting login with:', usernameLower, password);
      const res = await login({ username: usernameLower, password });
      console.log('Login response:', res.data);
      if (onLogin) onLogin(res.data);
      setError('');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError('نام کاربری یا رمز عبور اشتباه است');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 400, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mb: 2, width: 56, height: 56 }}>
            <LockOutlinedIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            ورود به سامانه مدیریت انبار دارو
          </Typography>
        </Box>
        <TextField label="نام کاربری" fullWidth margin="normal" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <TextField label="رمز عبور" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <Typography color="error" align="center" sx={{ mt: 1 }}>{error}</Typography>}
        <Button variant="contained" color="primary" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: 'bold', fontSize: 18 }} onClick={handleLogin}>
          ورود
        </Button>
      </Paper>
    </Box>
  );
}

export default AuthForm;
