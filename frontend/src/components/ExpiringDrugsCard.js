import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getExpiringDrugs, getSettings } from '../utils/api';

function ExpiringDrugsCard() {
  const [drugs, setDrugs] = useState([]);
  const [settings, setSettings] = useState({ exp_warning_days: 90, exp_danger_days: 30 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [drugsRes, settingsRes] = await Promise.all([
          getExpiringDrugs(),
          getSettings()
        ]);
        setDrugs(drugsRes.data);
        if (settingsRes.data.exp_warning_days) {
          setSettings({
            exp_warning_days: parseInt(settingsRes.data.exp_warning_days),
            exp_danger_days: parseInt(settingsRes.data.exp_danger_days)
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (expireDate) => {
    const today = new Date();
    const exp = new Date(expireDate);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'error'; // Expired
    if (diffDays <= settings.exp_danger_days) return 'error'; // Danger zone
    if (diffDays <= settings.exp_warning_days) return 'warning'; // Warning zone
    return 'success'; // Safe
  };

  const getStatusLabel = (expireDate) => {
    const today = new Date();
    const exp = new Date(expireDate);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'منقضی شده';
    if (diffDays <= settings.exp_danger_days) return 'بحرانی';
    if (diffDays <= settings.exp_warning_days) return 'هشدار';
    return 'سالم';
  };

  const columns = [
    { field: 'name', headerName: 'نام دارو', width: 200 },
    { field: 'warehouse', headerName: 'انبار', width: 150 },
    { field: 'quantity', headerName: 'تعداد', width: 100 },
    { field: 'expire', headerName: 'تاریخ انقضا', width: 120 },
    {
      field: 'status',
      headerName: 'وضعیت',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={getStatusLabel(params.row.expire)} 
          color={getStatusColor(params.row.expire)} 
          variant="outlined"
        />
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <WarningAmberIcon color="warning" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            گزارش داروهای منقضی شده و در آستانه انقضا
          </Typography>
        </Box>
        
        <DataGrid
          rows={drugs.map((d, i) => ({ ...d, id: i }))} // Ensure unique ID
          columns={columns}
          autoHeight
          pageSize={10}
          sx={{ direction: 'rtl' }}
        />
      </Paper>
    </Box>
  );
}

export default ExpiringDrugsCard;
