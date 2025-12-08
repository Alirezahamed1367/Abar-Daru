import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Avatar, Paper, Autocomplete } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import axios from 'axios';
import { login, API_BASE_URL } from '../utils/api';

function AuthForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    // Load users list for dropdown
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/login-list`);
      // Create options with full_name as label and username as value
      const usernames = res.data.map(user => ({
        label: user.full_name ? `${user.full_name} (${user.username})` : user.username,
        value: user.username
      }));
      setUsersList(usernames);
    } catch (err) {
      console.error('Error loading users:', err);
      // If API fails, allow manual entry
      setUsersList([]);
    }
  };

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
        
        <Autocomplete
          freeSolo
          options={usersList}
          getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
          value={usersList.find(u => u.value === username) || username}
          onChange={(event, newValue) => {
            if (typeof newValue === 'string') {
              setUsername(newValue);
            } else if (newValue && newValue.value) {
              setUsername(newValue.value);
            } else {
              setUsername('');
            }
          }}
          onInputChange={(event, newInputValue) => {
            setUsername(newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="نام کاربری"
              fullWidth
              margin="normal"
              autoFocus
              helperText="انتخاب از لیست یا تایپ مستقیم"
            />
          )}
          noOptionsText="کاربری یافت نشد"
        />
        
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
