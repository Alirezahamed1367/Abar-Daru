import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Typography,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { API_BASE_URL } from '../utils/api';

function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState({
    id: null,
    name: '',
    phone: '',
    address: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`);
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      showSnackbar('خطا در دریافت اطلاعات تأمین‌کنندگان', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setCurrentSupplier(supplier);
      setEditMode(true);
    } else {
      setCurrentSupplier({
        id: null,
        name: '',
        phone: '',
        address: ''
      });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentSupplier({
      id: null,
      name: '',
      phone: '',
      address: ''
    });
  };

  const handleSave = async () => {
    // Validation
    if (!currentSupplier.name?.trim()) {
      showSnackbar('نام تأمین‌کننده الزامی است', 'error');
      return;
    }

    try {
      const url = editMode
        ? `${API_BASE_URL}/suppliers/${currentSupplier.id}`
        : `${API_BASE_URL}/suppliers`;

      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentSupplier.name,
          phone: currentSupplier.phone || '',
          address: currentSupplier.address || ''
        })
      });
      
      if (response.ok) {
        showSnackbar(
          editMode ? 'تأمین‌کننده با موفقیت ویرایش شد' : 'تأمین‌کننده با موفقیت ثبت شد',
          'success'
        );
        handleCloseDialog();
        fetchSuppliers();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'خطا در ثبت اطلاعات', 'error');
      }
    } catch (error) {
      showSnackbar('خطا در ارتباط با سرور', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این تأمین‌کننده اطمینان دارید?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('تأمین‌کننده با موفقیت حذف شد', 'success');
        fetchSuppliers();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'خطا در حذف تأمین‌کننده', 'error');
      }
    } catch (error) {
      showSnackbar('خطا در ارتباط با سرور', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    {
      field: 'id',
      headerName: 'کد',
      width: 80,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'name',
      headerName: 'نام تأمین‌کننده',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'phone',
      headerName: 'تلفن',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => params.value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon fontSize="small" color="action" />
          {params.value}
        </Box>
      ) : '-'
    },
    {
      field: 'address',
      headerName: 'آدرس',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => params.value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon fontSize="small" color="action" />
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ) : '-'
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="ویرایش">
              <EditIcon />
            </Tooltip>
          }
          label="ویرایش"
          onClick={() => handleOpenDialog(params.row)}
          color="primary"
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="حذف">
              <DeleteIcon />
            </Tooltip>
          }
          label="حذف"
          onClick={() => handleDelete(params.id)}
          color="error"
        />
      ]
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            مدیریت تأمین‌کنندگان
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
            }}
          >
            افزودن تأمین‌کننده
          </Button>
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={suppliers}
            columns={columns}
            loading={loading}
            pagination
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25, page: 0 }
              }
            }}
            pageSizeOptions={[25, 50, 100]}
            paginationMode="client"
            rowCount={suppliers.length}
            getRowId={(row) => row.id}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f0f0f0'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold'
              }
            }}
          />
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', color: 'white' }}>
          {editMode ? 'ویرایش تأمین‌کننده' : 'افزودن تأمین‌کننده جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="نام تأمین‌کننده"
            value={currentSupplier.name}
            onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
            margin="normal"
            required
            InputProps={{
              startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <TextField
            fullWidth
            label="تلفن"
            value={currentSupplier.phone}
            onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })}
            margin="normal"
            InputProps={{
              startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <TextField
            fullWidth
            label="آدرس"
            value={currentSupplier.address}
            onChange={(e) => setCurrentSupplier({ ...currentSupplier, address: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            InputProps={{
              startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 1 }} />
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editMode ? 'ویرایش' : 'ثبت'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SupplierManagement;
