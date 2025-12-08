import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, IconButton, Tooltip, InputAdornment,
  Grid, Card, CardContent, MenuItem
} from '@mui/material';
import { DataGrid, faIR } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { getExpirationColor } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';
import { useCurrentUser } from '../utils/useCurrentUser';
import { isWarehouseman } from '../utils/permissions';

function TransferList() {
  const { settings } = useSettings();
  const currentUser = useCurrentUser();
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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
    let filtered = transfers;
    
    // Apply search filter
    if (searchText.trim() !== '') {
      const lowercaseSearch = searchText.toLowerCase();
      filtered = filtered.filter(transfer =>
        transfer.drug?.name?.toLowerCase().includes(lowercaseSearch) ||
        transfer.source_warehouse?.name?.toLowerCase().includes(lowercaseSearch) ||
        transfer.destination_warehouse?.name?.toLowerCase().includes(lowercaseSearch) ||
        transfer.consumer?.name?.toLowerCase().includes(lowercaseSearch) ||
        transfer.status?.toLowerCase().includes(lowercaseSearch) ||
        transfer.expire_date?.includes(lowercaseSearch) ||
        transfer.quantity_sent?.toString().includes(lowercaseSearch) ||
        transfer.quantity_received?.toString().includes(lowercaseSearch)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transfer => transfer.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transfer => transfer.transfer_type === typeFilter);
    }
    
    setFilteredTransfers(filtered);
  }, [searchText, statusFilter, typeFilter, transfers]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: transfers.length,
      pending: transfers.filter(t => t.status === 'pending').length,
      confirmed: transfers.filter(t => t.status === 'confirmed').length,
      rejected: transfers.filter(t => t.status === 'rejected').length,
      mismatch: transfers.filter(t => t.status === 'mismatch').length,
      totalSent: transfers.reduce((sum, t) => sum + (t.quantity_sent || 0), 0),
      totalReceived: transfers.reduce((sum, t) => sum + (t.quantity_received || 0), 0)
    };
  }, [transfers]);

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
          color={getExpirationColor(params.value, settings.exp_warning_days)}
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
        
        // Check if user can confirm this transfer
        const canConfirm = !isWarehouseman(currentUser) || 
          (currentUser?.warehouses?.includes(params.row.destination_warehouse?.id));
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={canConfirm ? "تایید حواله" : "فقط حواله‌های به انبار شما قابل تایید است"}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleConfirm(params.row)}
                  disabled={!canConfirm}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'success.light',
                      color: 'white'
                    } 
                  }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </span>
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
            color={messageType === 'success' ? 'success' : messageType === 'warning' ? 'warning' : 'error'} 
            sx={{ mb: 2, width: '100%', justifyContent: 'center', height: 'auto', py: 1 }}
          />
        )}

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <LocalShippingIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="bold" color="primary">{stats.total}</Typography>
                  <Typography variant="caption" color="text.secondary">کل حواله‌ها</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PendingActionsIcon color="warning" sx={{ fontSize: 32, mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
                  <Typography variant="caption" color="text.secondary">در انتظار</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="bold" color="success.main">{stats.confirmed}</Typography>
                  <Typography variant="caption" color="text.secondary">تایید شده</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ErrorOutlineIcon color="error" sx={{ fontSize: 32, mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="bold" color="error.main">{stats.rejected}</Typography>
                  <Typography variant="caption" color="text.secondary">رد شده</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#f3e5f5', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <WarningAmberIcon sx={{ color: '#9c27b0', fontSize: 32, mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#9c27b0' }}>{stats.mismatch}</Typography>
                  <Typography variant="caption" color="text.secondary">عدم تطابق</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#e0f2f1', height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="info.main">📦</Typography>
                  <Typography variant="h6" fontWeight="bold" color="info.main">{stats.totalSent}</Typography>
                  <Typography variant="caption" color="text.secondary">کل ارسالی</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="جستجو بر اساس دارو، انبار، مصرف‌کننده، تاریخ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="وضعیت"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">همه</MenuItem>
              <MenuItem value="pending">در انتظار</MenuItem>
              <MenuItem value="confirmed">تایید شده</MenuItem>
              <MenuItem value="rejected">رد شده</MenuItem>
              <MenuItem value="mismatch">عدم تطابق</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="نوع حواله"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">همه</MenuItem>
              <MenuItem value="warehouse">بین انبار</MenuItem>
              <MenuItem value="consumer">مصرف‌کننده</MenuItem>
            </TextField>
          </Grid>
        </Grid>

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
