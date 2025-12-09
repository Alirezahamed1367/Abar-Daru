import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import './assets/fonts/Vazirmatn.css';
import axios from 'axios';

// Logging system for debugging
const log = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString('fa-IR');
  console.log(`[${timestamp}] 🔍 ${message}`, data || '');
};

console.log('================================');
console.log('🚀 Application Starting...');
console.log('================================');

// Setup axios interceptors globally
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    log('📤 Axios Request', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
      hasUser: !!user,
      headers: config.headers
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      log('✅ Token added to request');
    } else {
      log('⚠️ NO TOKEN - Request without authentication!');
    }
    
    return config;
  },
  (error) => {
    log('❌ Request Error', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    log('📥 Response Success', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    log('❌ Response Error', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.detail || error.message
    });
    
    if (error.response?.status === 401) {
      log('🚪 401 Unauthorized - Logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Log initial state
log('💾 Initial localStorage', {
  hasToken: !!localStorage.getItem('token'),
  hasUser: !!localStorage.getItem('user'),
  tokenLength: localStorage.getItem('token')?.length || 0
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
