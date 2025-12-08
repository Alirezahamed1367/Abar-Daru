import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Avatar, Alert, Chip
} from '@mui/material';
import { DataGrid, faIR } from '@mui/x-data-grid';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

function DisposedDrugsPanel() {
  const [disposedDrugs, setDisposedDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchDisposedDrugs();
  }, []);

  const fetchDisposedDrugs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/disposed-drugs`);
      setDisposedDrugs(res.data);
    } catch (err) {
      console.error('Error fetching disposed drugs:', err);
    }
    setLoading(false);
  };

  const columns = [
    {
      field: 'name',
      headerName: 'نام دارو',
      flex: 1.5,
      minWidth: 200
    },
    {
      field: 'warehouse',
      headerName: 'انبار',
      flex: 1,
      minWidth: 150
    },
    {
      field: 'quantity',
      headerName: 'تعداد معدوم شده',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color="error" 
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'expire_date',
      headerName: 'تاریخ انقضا',
      width: 130,
      renderCell: (params) => {
        if (!params.value) return <Typography>-</Typography>;
        return <Chip label={params.value} size="small" color="default" />;
      }
    },
    {
      field: 'entry_date',
      headerName: 'تاریخ ورود',
      width: 130,
      renderCell: (params) => {
        if (!params.value) return <Typography>-</Typography>;
        return <Typography variant="body2">{params.value}</Typography>;
      }
    },
    {
      field: 'disposal_date',
      headerName: 'تاریخ معدومی',
      width: 180,
      renderCell: (params) => {
        if (!params.value) return <Typography>-</Typography>;
        return (
          <Chip 
            label={params.value} 
            size="small" 
            color="warning"
          />
        );
      }
    },
    {
      field: 'disposal_transfer_id',
      headerName: 'شماره حواله',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return <Typography>-</Typography>;
        return (
          <Chip 
            label={`#${params.value}`} 
            size="small" 
            color="primary"
            variant="outlined"
          />
        );
      }
    }
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'start', minHeight: '80vh', bgcolor: '#f5f5f5', pt: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 1400, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'error.main', width: 64, height: 64, mb: 2 }}>
            <DeleteForeverIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold" color="error.main" gutterBottom>
            گزارش داروهای معدوم شده
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لیست داروهایی که از طریق حواله معدومی خارج شده‌اند
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          ℹ️ این داروها از موجودی و گزارشات عادی حذف شده‌اند ولی تاریخچه آنها حفظ شده است.
        </Alert>

        {disposedDrugs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              هیچ دارویی معدوم نشده است
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={disposedDrugs}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              loading={loading}
              localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#ffebee'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0'
                }
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default DisposedDrugsPanel;
