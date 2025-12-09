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
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { API_BASE_URL } from '../utils/api';
import { isAdmin } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function ConsumerManagement() {
  const currentUser = useCurrentUser();
  const [consumers, setConsumers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentConsumer, setCurrentConsumer] = useState({
    id: null,
    name: '',
    address: '',
    description: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/consumers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setConsumers(data);
    } catch (error) {
      showSnackbar('خطا در دریافت اطلاعات مصرف‌کنندگان', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (consumer = null) => {
    if (consumer) {
      setCurrentConsumer(consumer);
      setEditMode(true);
    } else {
      setCurrentConsumer({
        id: null,
        name: '',
        address: '',
        description: ''
      });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentConsumer({
      id: null,
      name: '',
      address: '',
      description: ''
    });
  };

  const handleSave = async () => {
    // Validation
    if (!currentConsumer.name?.trim()) {
      showSnackbar('نام مصرف‌کننده الزامی است', 'error');
      return;
    }

    try {
      const url = editMode
        ? `${API_BASE_URL}/consumers/${currentConsumer.id}`
        : `${API_BASE_URL}/consumers`;

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentConsumer.name,
          address: currentConsumer.address || '',
          description: currentConsumer.description || ''
        })
      });

      if (response.ok) {
        showSnackbar(
          editMode ? 'مصرف‌کننده با موفقیت ویرایش شد' : 'مصرف‌کننده با موفقیت ثبت شد',
          'success'
        );
        handleCloseDialog();
        fetchConsumers();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'خطا در ثبت اطلاعات', 'error');
      }
    } catch (error) {
      showSnackbar('خطا در ارتباط با سرور', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این مصرف‌کننده اطمینان دارید?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/consumers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showSnackbar('مصرف‌کننده با موفقیت حذف شد', 'success');
        fetchConsumers();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'خطا در حذف مصرف‌کننده', 'error');
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
      headerName: 'نام مصرف‌کننده',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalHospitalIcon color="secondary" fontSize="small" />
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
        </Box>
      )
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
      field: 'description',
      headerName: 'توضیحات',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value ? (
        <Typography variant="body2" noWrap>
          {params.value}
        </Typography>
      ) : '-'
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      width: 120,
      getActions: (params) => {
        if (!isAdmin(currentUser)) return [];
        return [
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
        ];
      }
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="secondary">
            مدیریت مصرف‌کنندگان
          </Typography>
          {isAdmin(currentUser) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)',
                boxShadow: '0 3px 5px 2px rgba(156, 39, 176, .3)'
              }}
            >
              افزودن مصرف‌کننده
            </Button>
          )}
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={consumers}
            columns={columns}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold'
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f0f0f0'
              }
            }}
          />
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)', color: 'white' }}>
          {editMode ? 'ویرایش مصرف‌کننده' : 'افزودن مصرف‌کننده جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="نام مصرف‌کننده"
            value={currentConsumer.name}
            onChange={(e) => setCurrentConsumer({ ...currentConsumer, name: e.target.value })}
            margin="normal"
            required
            InputProps={{
              startAdornment: <LocalHospitalIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <TextField
            fullWidth
            label="آدرس"
            value={currentConsumer.address}
            onChange={(e) => setCurrentConsumer({ ...currentConsumer, address: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            InputProps={{
              startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 1 }} />
            }}
          />
          <TextField
            fullWidth
            label="توضیحات"
            value={currentConsumer.description}
            onChange={(e) => setCurrentConsumer({ ...currentConsumer, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" color="secondary">
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

export default ConsumerManagement;
