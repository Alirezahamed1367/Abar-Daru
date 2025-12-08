import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, IconButton, Chip, Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { getExpirationColor } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';

function MismatchPanel() {
  const { settings } = useSettings();
  const [mismatches, setMismatches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMismatch, setSelectedMismatch] = useState(null);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mismatchRes, whRes, drugRes, consRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transfer/mismatches`),
        axios.get(`${API_BASE_URL}/warehouses`),
        axios.get(`${API_BASE_URL}/drugs`),
        axios.get(`${API_BASE_URL}/consumers`)
      ]);
      
      setMismatches(mismatchRes.data);
      setWarehouses(whRes.data);
      setDrugs(drugRes.data);
      setConsumers(consRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      showMessage('خطا در بارگذاری داده‌ها', 'error');
    }
    setLoading(false);
  };

  const showMessage = (msg, sev = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleOpenDialog = (mismatch, actionType) => {
    setSelectedMismatch(mismatch);
    setAction(actionType);
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMismatch(null);
    setAction('');
    setNotes('');
  };

  const handleResolve = async () => {
    if (!selectedMismatch || !action) return;
    
    if (!notes.trim()) {
      showMessage('لطفا توضیحات را وارد کنید', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/mismatch/resolve`, null, {
        params: {
          transfer_id: selectedMismatch.id,
          action: action,
          notes: notes
        }
      });
      
      showMessage('مغایرت با موفقیت حل شد', 'success');
      handleCloseDialog();
      loadData();
    } catch (err) {
      showMessage(err.response?.data?.detail || 'خطا در حل مغایرت', 'error');
    }
  };

  const getDrugName = (drugId) => {
    const drug = drugs.find(d => d.id === drugId);
    return drug ? drug.name : '-';
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : '-';
  };

  const getConsumerName = (consumerId) => {
    const consumer = consumers.find(c => c.id === consumerId);
    return consumer ? consumer.name : '-';
  };

  const getMismatchQuantity = (row) => {
    return row.quantity_sent - row.quantity_received;
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', width: 70 },
    {
      field: 'drug_name',
      headerName: 'نام دارو',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => getDrugName(params.row.drug_id)
    },
    {
      field: 'expire_date',
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
      field: 'source',
      headerName: 'مبدا',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => getWarehouseName(params.row.source_warehouse_id)
    },
    {
      field: 'destination',
      headerName: 'مقصد',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        if (params.row.transfer_type === 'warehouse') {
          return getWarehouseName(params.row.destination_warehouse_id);
        } else {
          return getConsumerName(params.row.consumer_id);
        }
      }
    },
    {
      field: 'quantity_sent',
      headerName: 'ارسالی',
      width: 90,
      renderCell: (params) => (
        <Typography color="primary" fontWeight="bold">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'quantity_received',
      headerName: 'دریافتی',
      width: 90,
      renderCell: (params) => (
        <Typography color="success.main" fontWeight="bold">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'mismatch_qty',
      headerName: 'مغایرت',
      width: 90,
      valueGetter: (params) => getMismatchQuantity(params.row),
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color="error" 
          size="small"
          icon={<ErrorOutlineIcon />}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'عملیات',
      width: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="حذف از موجودی">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleOpenDialog(params.row, 'delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="عودت به انبار مبدا">
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleOpenDialog(params.row, 'return_source')}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {params.row.transfer_type === 'warehouse' && (
            <Tooltip title="اضافه به انبار مقصد">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleOpenDialog(params.row, 'add_destination')}
              >
                <AddCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  const getActionLabel = () => {
    switch (action) {
      case 'delete':
        return 'حذف از موجودی';
      case 'return_source':
        return 'عودت به انبار مبدا';
      case 'add_destination':
        return 'اضافه به انبار مقصد';
      default:
        return '';
    }
  };

  const getActionDescription = () => {
    if (!selectedMismatch) return '';
    const mismatchQty = getMismatchQuantity(selectedMismatch);
    const drugName = getDrugName(selectedMismatch.drug_id);
    
    switch (action) {
      case 'delete':
        return `${mismatchQty} عدد از ${drugName} از موجودی کل سیستم حذف می‌شود.`;
      case 'return_source':
        return `${mismatchQty} عدد از ${drugName} به انبار ${getWarehouseName(selectedMismatch.source_warehouse_id)} برگردانده می‌شود.`;
      case 'add_destination':
        return `${mismatchQty} عدد از ${drugName} به انبار ${getWarehouseName(selectedMismatch.destination_warehouse_id)} اضافه می‌شود.`;
      default:
        return '';
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="error">
              مدیریت کالاهای مغایرت‌دار
            </Typography>
          </Box>
          
          <Tooltip title="بروزرسانی لیست">
            <IconButton
              color="primary"
              onClick={loadData}
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

        {/* Alert Message */}
        {message && (
          <Alert severity={severity} sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {/* Info Card */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'warning.lighter', 
            border: '1px solid',
            borderColor: 'warning.main'
          }}
        >
          <Typography variant="body2" color="warning.dark">
            ⚠️ <strong>توجه:</strong> کالاهای مغایرت‌دار در انبار کالای در راه نگهداری می‌شوند. 
            برای هر مغایرت می‌توانید یکی از عملیات زیر را انجام دهید:
          </Typography>
          <Box sx={{ mt: 1, ml: 3 }}>
            <Typography variant="body2">🗑️ <strong>حذف از موجودی:</strong> کالا کامل از سیستم حذف شود</Typography>
            <Typography variant="body2">↩️ <strong>عودت به مبدا:</strong> کالا به انبار فرستنده برگردد</Typography>
            <Typography variant="body2">➕ <strong>اضافه به مقصد:</strong> کالا به انبار گیرنده اضافه شود</Typography>
          </Box>
        </Paper>

        {/* DataGrid */}
        <DataGrid
          rows={mismatches}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          autoHeight
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold'
            }
          }}
        />

        {mismatches.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              ✅ هیچ مغایرتی وجود ندارد
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Resolve Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 
            action === 'delete' ? 'error.main' :
            action === 'return_source' ? 'warning.main' :
            'success.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {action === 'delete' && <DeleteIcon />}
          {action === 'return_source' && <UndoIcon />}
          {action === 'add_destination' && <AddCircleIcon />}
          {getActionLabel()}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {selectedMismatch && (
            <>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
                <Typography variant="body2" gutterBottom>
                  <strong>دارو:</strong> {getDrugName(selectedMismatch.drug_id)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>تاریخ انقضا:</strong> {selectedMismatch.expire_date}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>تعداد ارسالی:</strong> {selectedMismatch.quantity_sent}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>تعداد دریافتی:</strong> {selectedMismatch.quantity_received}
                </Typography>
                <Typography variant="body2" color="error" fontWeight="bold">
                  <strong>مقدار مغایرت:</strong> {getMismatchQuantity(selectedMismatch)}
                </Typography>
              </Paper>

              <Alert severity="warning" sx={{ mb: 2 }}>
                {getActionDescription()}
              </Alert>

              <TextField
                label="توضیحات (الزامی)"
                fullWidth
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="دلیل این تصمیم را وارد کنید..."
                required
              />
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            انصراف
          </Button>
          <Button 
            onClick={handleResolve} 
            variant="contained"
            color={
              action === 'delete' ? 'error' :
              action === 'return_source' ? 'warning' :
              'success'
            }
            disabled={!notes.trim()}
          >
            تایید و اجرا
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MismatchPanel;
