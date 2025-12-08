import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Button, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { DataGrid, faIR } from '@mui/x-data-grid';
import axios from 'axios';
import { API_BASE_URL, getWarehouses, getDrugs, getInventory, getConsumers } from '../utils/api';
import moment from 'jalali-moment';
import TransferDialog from './TransferDialog';
import { getExpirationColor } from '../utils/expirationUtils';
import { canEdit, filterWarehousesByAccess } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';
import { useSettings } from '../utils/SettingsContext';

function TransferForm() {
  const currentUser = useCurrentUser();
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
    fetchTransfers(); // Load transfers first (most important)
    fetchBasicData(); // Load warehouses and drugs in background
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const transRes = await axios.get(`${API_BASE_URL}/transfer/all`);
      setTransfers(transRes.data);
    } catch (err) {
      console.error("Error fetching transfers", err);
    }
    setLoading(false);
  };

  const fetchBasicData = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const [whRes, drugRes] = await Promise.all([
        getWarehouses(),
        getDrugs()
      ]);
      
      setAllWarehouses(whRes.data); // ذخیره همه انبارها برای TransferDialog
      setWarehouses(filterWarehousesByAccess(whRes.data, storedUser)); // فیلتر شده برای نمایش
      setDrugs(drugRes.data);
    } catch (err) {
      console.error("Error fetching basic data", err);
    }
  };

  const fetchData = async () => {
    // Only load heavy data when dialog opens
    try {
      const [invRes, consRes] = await Promise.all([
        getInventory(),
        getConsumers()
      ]);
      setInventory(invRes.data);
      setConsumers(consRes.data);
    } catch (err) {
      console.error("Error fetching inventory data", err);
    }
  };

  const handleOpenNewDialog = () => {
    setEditingTransfer(null);
    setDialogOpen(true);
    // Load inventory and consumers only when dialog opens
    if (inventory.length === 0 || consumers.length === 0) {
      fetchData();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTransfer(null);
  };

  const handleSubmitDialog = async (data) => {
    try {
      await axios.post(`${API_BASE_URL}/transfer/create`, null, { params: data });
      setMessage('حواله با موفقیت ثبت شد');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchTransfers(); // Only refresh transfers, not all data
      handleCloseDialog();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'خطا در ثبت حواله');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('آیا از تایید این حواله اطمینان دارید؟')) return;
    try {
      await axios.put(`${API_BASE_URL}/transfer/${id}/confirm`);
      setMessage('حواله با موفقیت تایید شد');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchTransfers();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'خطا در تایید حواله');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('آیا از رد این حواله اطمینان دارید؟')) return;
    try {
      await axios.put(`${API_BASE_URL}/transfer/${id}/reject`);
      setMessage('حواله با موفقیت رد شد');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchTransfers();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'خطا در رد حواله');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async (id) => {
    const transfer = transfers.find(t => t.id === id);
    if (transfer && (transfer.status === 'confirmed' || transfer.status === 'rejected')) {
      setMessage('حواله تایید یا رد شده قابل حذف نیست');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    if (!window.confirm('آیا از حذف این حواله اطمینان دارید؟')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/transfer/${id}`);
      setMessage('حواله با موفقیت حذف شد');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchTransfers();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'خطا در حذف حواله');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', width: 70 },
    { 
      field: 'drug_name', 
      headerName: 'نام دارو', 
      flex: 1,
      minWidth: 150, 
      valueGetter: (params) => {
        return params.row.drug?.name || '-';
      }
    },
    { 
      field: 'source', 
      headerName: 'مبدا', 
      flex: 1,
      minWidth: 120, 
      valueGetter: (params) => {
        return params.row.source_warehouse?.name || '-';
      }
    },
    { 
      field: 'destination', 
      headerName: 'مقصد', 
      flex: 1,
      minWidth: 120, 
      valueGetter: (params) => {
        if (params.row.transfer_type === 'warehouse') {
          return params.row.destination_warehouse?.name || '-';
        } else {
          return params.row.consumer?.name || '-';
        }
      }
    },
    { field: 'quantity_sent', headerName: 'تعداد', width: 90 },
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
    { field: 'transfer_date', headerName: 'تاریخ', width: 110 },
    { 
      field: 'status', 
      headerName: 'وضعیت', 
      width: 120,
      renderCell: (params) => {
        const statusMap = {
          'pending': { label: 'در انتظار', color: 'warning' },
          'confirmed': { label: 'تایید شده', color: 'success' },
          'rejected': { label: 'رد شده', color: 'error' },
          'delivered': { label: 'تحویل شده', color: 'info' }
        };
        const status = statusMap[params.value] || { label: params.value, color: 'default' };
        return <Chip label={status.label} color={status.color} size="small" />;
      }
    },
    {
      field: 'actions',
      headerName: 'عملیات',
      width: 180,
      renderCell: (params) => {
        if (!canEdit(currentUser)) return null;
        
        const isPending = params.row.status === 'pending';
        const isWarehouseTransfer = params.row.transfer_type === 'warehouse';
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isPending && isWarehouseTransfer && (
              <>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleConfirm(params.row.id)}
                  title="تایید حواله"
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleReject(params.row.id)}
                  title="رد حواله"
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </>
            )}
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
              disabled={params.row.status === 'confirmed' || params.row.status === 'rejected'}
              title={params.row.status === 'confirmed' || params.row.status === 'rejected' ? 'حواله تایید/رد شده قابل حذف نیست' : 'حذف'}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="secondary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            📤 مدیریت حواله‌های خروجی
          </Typography>
          {canEdit(currentUser) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleOpenNewDialog}
              sx={{ fontWeight: 'bold' }}
            >
              ثبت حواله جدید
            </Button>
          )}
        </Box>
        
        {message && (
          <Chip 
            label={message} 
            color={messageType === 'success' ? 'success' : 'error'} 
            sx={{ mb: 2, width: '100%', justifyContent: 'center', height: 'auto', py: 1 }}
          />
        )}

        <Box sx={{ height: { xs: 500, sm: 600 }, width: '100%' }}>
          <DataGrid
            rows={transfers}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            loading={loading}
            getRowId={row => row.id}
            localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
            sx={{
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          />
        </Box>
      </Paper>

      <TransferDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        warehouses={allWarehouses}
        drugs={drugs}
        inventory={inventory}
        consumers={consumers}
        onSubmit={handleSubmitDialog}
        editData={editingTransfer}
        currentUser={currentUser}
      />
    </Box>
  );
}

export default TransferForm;
