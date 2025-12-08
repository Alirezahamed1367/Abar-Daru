import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getExpiringDrugs } from '../utils/api';
import { getExpirationColor, getDaysUntilExpiration } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';

function ExpiringDrugsCard() {
  const [drugs, setDrugs] = useState([]);
  const { settings } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const drugsRes = await getExpiringDrugs();
        setDrugs(drugsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const getStatusLabel = (expireDate) => {
    const days = getDaysUntilExpiration(expireDate);
    
    if (days === null) return 'بدون تاریخ انقضا';
    if (days <= 0) return 'منقضی شده';
    if (days < settings.exp_warning_days) return 'در آستانه انقضا';
    return 'سالم';
  };

  const columns = [
    { field: 'name', headerName: 'نام دارو', flex: 1, minWidth: 180 },
    { field: 'warehouse', headerName: 'انبار', flex: 0.8, minWidth: 130 },
    { 
      field: 'quantity', 
      headerName: 'موجودی', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color="default"
          size="small"
        />
      )
    },
    { 
      field: 'expire', 
      headerName: 'تاریخ انقضا', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getExpirationColor(params.value, settings.exp_warning_days)}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      )
    },
    {
      field: 'status',
      headerName: 'وضعیت',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={getStatusLabel(params.row.expire)} 
          color={getExpirationColor(params.row.expire, settings.exp_warning_days)} 
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <WarningAmberIcon color="warning" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            گزارش داروهای منقضی شده و در آستانه انقضا
          </Typography>
        </Box>
        
        <DataGrid
          rows={drugs.map((d, i) => ({ ...d, id: i }))}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          disableSelectionOnClick
          sx={{ 
            direction: 'rtl',
            '& .MuiDataGrid-columnSeparator': {
              visibility: 'visible',
            },
          }}
        />
      </Paper>
    </Box>
  );
}

export default ExpiringDrugsCard;
