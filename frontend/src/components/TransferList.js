import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, IconButton, Tooltip, InputAdornment
} from '@mui/material';
import { DataGrid, faIR } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { getExpirationColor } from '../utils/expirationUtils';

function TransferList() {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    loadTransfers();
  }, []);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredTransfers(transfers);
    } else {
      const lowercaseSearch = searchText.toLowerCase();
      const filtered = transfers.filter(transfer =>
        transfer.drug_name?.toLowerCase().includes(lowercaseSearch) ||
        transfer.source_warehouse?.toLowerCase().includes(lowercaseSearch) ||
        transfer.dest_warehouse?.toLowerCase().includes(lowercaseSearch) ||
        transfer.status?.toLowerCase().includes(lowercaseSearch) ||
        transfer.expire_date?.includes(lowercaseSearch) ||
        transfer.quantity_sent?.toString().includes(lowercaseSearch) ||
        transfer.quantity_received?.toString().includes(lowercaseSearch)
      );
      setFilteredTransfers(filtered);
    }
  }, [searchText, transfers]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/transfer/all`);
      setTransfers(res.data);
      setFilteredTransfers(res.data);
    } catch (err) {
      showMessage('خطا در بارگذاری حواله‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleConfirm = (transfer) => {
    setSelectedTransfer(transfer);
    setReceivedQty(transfer.quantity_sent);
    setOpenDialog(true);
  };

  const handleReject = async (transferId) => {
    if (!window.confirm('آیا از رد این حواله اطمینان دارید؟')) return;

    try {
      await axios.put(`${API_BASE_URL}/transfer/${transferId}/reject`);
      showMessage('حواله با موفقیت رد شد', 'success');
      loadTransfers();
    } catch (err) {
      showMessage(err.response?.data?.detail || 'خطا در رد حواله', 'error');
    }
  };

  const submitConfirm = async () => {
    if (!receivedQty || receivedQty <= 0) {
      showMessage('تعداد دریافتی باید بیشتر از صفر باشد', 'error');
      return;
    }

    if (receivedQty > selectedTransfer.quantity_sent) {
      showMessage('تعداد دریافتی نمی‌تواند بیشتر از تعداد ارسالی باشد', 'error');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/transfer/${selectedTransfer.id}/confirm`,
        null,
        { params: { quantity_received: parseInt(receivedQty) } }
      );
      setOpenDialog(false);
      
      // Show appropriate message based on quantity match
      if (parseInt(receivedQty) === selectedTransfer.quantity_sent) {
        showMessage('حواله با موفقیت تایید شد', 'success');
      } else {
        showMessage('حواله ثبت شد - عدم تطابق در لیست مغایرت‌ها قابل مشاهده است', 'warning');
      }
      
      loadTransfers();
      setReceivedQty('');
      setSelectedTransfer(null);
    } catch (err) {
      showMessage(err.response?.data?.detail || 'خطا در تایید حواله', 'error');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setReceivedQty('');
    setSelectedTransfer(null);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { label: 'در انتظار تایید', color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
      confirmed: { label: 'تایید شده', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
      delivered: { label: 'تحویل شده', color: 'info', icon: <LocalShippingIcon fontSize="small" /> },
      mismatch: { label: 'عدم تطابق', color: 'error', icon: <CancelIcon fontSize="small" /> },
      rejected: { label: 'رد شده', color: 'error', icon: <CancelIcon fontSize="small" /> }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        icon={config.icon}
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', width: 70 },
    {
      field: 'transfer_type',
      headerName: 'نوع',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value === 'warehouse' ? 'بین انبار' : 'مصرف‌کننده'} 
          color={params.value === 'warehouse' ? 'primary' : 'secondary'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'source_warehouse',
      headerName: 'انبار مبدا',
      flex: 1,
      minWidth: 130,
      valueGetter: (params) => params.row.source_warehouse?.name || '-'
    },
    {
      field: 'destination',
      headerName: 'مقصد',
      flex: 1,
      minWidth: 130,
      valueGetter: (params) => {
        if (params.row.transfer_type === 'warehouse') {
          return params.row.destination_warehouse?.name || '-';
        } else {
          return params.row.consumer?.name || '-';
        }
      }
    },
    {
      field: 'drug',
      headerName: 'دارو',
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => params.row.drug?.name || '-'
    },
    { 
      field: 'expire_date', 
      headerName: 'انقضا', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getExpirationColor(params.value)}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      )
    },
    { 
      field: 'quantity_sent', 
      headerName: 'تعداد ارسالی', 
      width: 110,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="primary">
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'quantity_received', 
      headerName: 'تعداد دریافتی', 
      width: 120,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          fontWeight="bold" 
          color={params.value > 0 ? 'success.main' : 'text.secondary'}
        >
          {params.value || '-'}
        </Typography>
      )
    },
    { 
      field: 'transfer_date', 
      headerName: 'تاریخ ثبت', 
      width: 110,
      valueGetter: (params) => params.row.transfer_date || '-'
    },
    {
      field: 'status',
      headerName: 'وضعیت',
      width: 150,
      renderCell: (params) => getStatusChip(params.value)
    },
    {
      field: 'actions',
      headerName: 'عملیات',
      width: 130,
      renderCell: (params) => {
        const isPending = params.row.status === 'pending';
        const isWarehouseTransfer = params.row.transfer_type === 'warehouse';
        
        if (!isPending || !isWarehouseTransfer) return null;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="تایید حواله">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleConfirm(params.row)}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'success.light',
                    color: 'white'
                  } 
                }}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رد حواله">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleReject(params.row.id)}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'error.light',
                    color: 'white'
                  } 
                }}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              مدیریت حواله‌ها و کالاهای در راه
            </Typography>
          </Box>
          <Tooltip title="بروزرسانی لیست">
            <IconButton 
              color="primary" 
              onClick={loadTransfers}
              sx={{ 
                border: '2px solid',
                borderColor: 'primary.main',
                '&:hover': { 
                  backgroundColor: 'primary.main',
                  color: 'white'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {message && (
          <Chip 
            label={message} 
            color={messageType === 'success' ? 'success' : 'error'} 
            sx={{ mb: 2, width: '100%', justifyContent: 'center', height: 'auto', py: 1 }}
          />
        )}

        {/* Search Field */}
        <Box mb={2}>
          <TextField
            fullWidth
            placeholder="جستجو بر اساس دارو، انبار مبدا، انبار مقصد، وضعیت، تاریخ یا مقدار..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </Box>

        <Box sx={{ height: { xs: 500, sm: 600 }, width: '100%' }}>
          <DataGrid
            rows={filteredTransfers}
            columns={columns}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            getRowId={(row) => row.id}
            localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
            sx={{
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 0.4)',
              },
            }}
          />
        </Box>
      </Paper>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle 
          sx={{ 
            backgroundColor: 'success.main', 
            color: 'white', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CheckCircleIcon />
          تایید دریافت حواله
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTransfer && (
            <Box>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  backgroundColor: 'info.lighter',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'info.main'
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>🏥 دارو:</strong> {selectedTransfer.drug?.name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>📅 تاریخ انقضا:</strong> {selectedTransfer.expire_date}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>📦 تعداد ارسال شده:</strong>{' '}
                  <Chip 
                    label={selectedTransfer.quantity_sent} 
                    color="primary" 
                    size="small" 
                    sx={{ fontWeight: 'bold' }}
                  />
                </Typography>
                <Typography variant="body2">
                  <strong>🏭 از انبار:</strong> {selectedTransfer.source_warehouse?.name}
                </Typography>
              </Paper>
              
              <TextField
                label="تعداد دریافتی"
                type="number"
                fullWidth
                value={receivedQty}
                onChange={e => setReceivedQty(e.target.value)}
                helperText="در صورت عدم تطابق، تعداد واقعی دریافتی را وارد کنید"
                sx={{ mb: 2 }}
                autoFocus
              />
              
              <Paper 
                elevation={0}
                sx={{ 
                  p: 1.5, 
                  backgroundColor: 'warning.lighter',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Typography variant="caption" color="warning.dark">
                  ⚠️ پس از تایید، موجودی انبار مقصد به‌روزرسانی خواهد شد
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            انصراف
          </Button>
          <Button 
            onClick={submitConfirm} 
            variant="contained" 
            color="success"
            startIcon={<CheckCircleIcon />}
            sx={{ fontWeight: 'bold' }}
          >
            تایید نهایی
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TransferList;
