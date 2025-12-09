import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Alert, Snackbar, Chip, InputAdornment
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { isAdmin } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function WarehouseManagement() {
  const currentUser = useCurrentUser();
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState({ name: '', code: '', address: '', manager: '' });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredWarehouses(warehouses);
    } else {
      const lowercaseSearch = searchText.toLowerCase();
      const filtered = warehouses.filter(wh =>
        wh.name?.toLowerCase().includes(lowercaseSearch) ||
        wh.code?.toLowerCase().includes(lowercaseSearch) ||
        wh.address?.toLowerCase().includes(lowercaseSearch) ||
        wh.manager?.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredWarehouses(filtered);
    }
  }, [searchText, warehouses]);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouses`);
      setWarehouses(response.data);
      setFilteredWarehouses(response.data);
    } catch (error) {
      showSnackbar('خطا در بارگذاری انبارها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentWarehouse.name?.trim()) newErrors.name = 'نام انبار الزامی است';
    if (!currentWarehouse.code?.trim()) newErrors.code = 'کد انبار الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editMode) {
        await axios.put(`${API_BASE_URL}/warehouses/${currentWarehouse.id}`, currentWarehouse);
        showSnackbar('انبار با موفقیت ویرایش شد', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/warehouses`, currentWarehouse);
        showSnackbar('انبار با موفقیت ثبت شد', 'success');
      }
      loadWarehouses();
      handleCloseDialog();
    } catch (error) {
      console.error('Save warehouse error:', error);
      let errorMessage = 'خطا در ذخیره‌سازی';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(e => e.msg || e).join(', ');
        }
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این انبار اطمینان دارید؟')) return;

    try {
      await axios.delete(`${API_BASE_URL}/warehouses/${id}`);
      showSnackbar('انبار با موفقیت حذف شد', 'success');
      loadWarehouses();
    } catch (error) {
      console.error('Delete warehouse error:', error);
      let errorMessage = 'خطا در حذف انبار';
      if (error.response?.data?.detail && typeof error.response.data.detail === 'string') {
        errorMessage = error.response.data.detail;
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleEdit = (warehouse) => {
    setCurrentWarehouse(warehouse);
    setEditMode(true);
    setOpenDialog(true);
  };

  const handleAdd = () => {
    setCurrentWarehouse({ name: '', code: '', address: '', manager: '' });
    setEditMode(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentWarehouse({ name: '', code: '', address: '', manager: '' });
    setErrors({});
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', width: 80 },
    { field: 'name', headerName: 'نام انبار', width: 200, editable: false },
    { field: 'code', headerName: 'کد انبار', width: 150 },
    { field: 'address', headerName: 'آدرس', width: 300 },
    { field: 'manager', headerName: 'انباردار', width: 150 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      width: 120,
      getActions: (params) => {
        if (!isAdmin(currentUser)) return [];
        return [
          <GridActionsCellItem
            icon={<EditIcon color="primary" />}
            label="ویرایش"
            onClick={() => handleEdit(params.row)}
          />,
          <GridActionsCellItem
            icon={<DeleteIcon color="error" />}
            label="حذف"
            onClick={() => handleDelete(params.row.id)}
          />
        ];
      }
    }
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarehouseIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              مدیریت انبارها
            </Typography>
          </Box>
          {isAdmin(currentUser) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ fontWeight: 'bold' }}
            >
              افزودن انبار جدید
            </Button>
          )}
        </Box>

        {/* Search Field */}
        <Box mb={2}>
          <TextField
            fullWidth
            placeholder="جستجو بر اساس نام، کد، آدرس یا مسئول انبار..."
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

        <DataGrid
          rows={filteredWarehouses}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': { direction: 'rtl' },
            '& .MuiDataGrid-cell': { textAlign: 'right' },
            '& .MuiDataGrid-columnHeader': { textAlign: 'right' }
          }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? '✏️ ویرایش انبار' : '➕ افزودن انبار جدید'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="نام انبار *"
            fullWidth
            margin="normal"
            value={currentWarehouse.name}
            onChange={e => setCurrentWarehouse({ ...currentWarehouse, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            label="کد انبار *"
            fullWidth
            margin="normal"
            value={currentWarehouse.code}
            onChange={e => setCurrentWarehouse({ ...currentWarehouse, code: e.target.value })}
            error={!!errors.code}
            helperText={errors.code}
          />
          <TextField
            label="آدرس"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={currentWarehouse.address}
            onChange={e => setCurrentWarehouse({ ...currentWarehouse, address: e.target.value })}
          />
          <TextField
            label="نام انباردار"
            fullWidth
            margin="normal"
            value={currentWarehouse.manager}
            onChange={e => setCurrentWarehouse({ ...currentWarehouse, manager: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained">
            {editMode ? 'ذخیره تغییرات' : 'ثبت انبار'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default WarehouseManagement;
