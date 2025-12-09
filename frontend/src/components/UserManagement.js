import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Alert, Snackbar, Select, InputLabel, FormControl, OutlinedInput, Chip
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import { getUsers, addUser, updateUser, deleteUser, getWarehouses } from '../utils/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({ username: '', password: '', full_name: '', access_level: 'viewer', warehouses: [] });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Get logged-in user
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = loggedInUser.username === 'superadmin';

  useEffect(() => {
    loadUsers();
    loadWarehouses();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      // Convert username to lowercase for case-insensitive storage
      const userData = {
        ...currentUser,
        username: currentUser.username.toLowerCase().trim()
      };
      
      if (editMode) {
        await updateUser(userData.id, userData);
        showSnackbar('کاربر با موفقیت ویرایش شد', 'success');
      } else {
        await addUser(userData);
        showSnackbar('کاربر با موفقیت ایجاد شد', 'success');
      }
      setOpenDialog(false);
      loadUsers();
    } catch (err) {
      console.error('Save user error:', err);
      let errorMessage = 'خطا در ذخیره کاربر';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg || e).join(', ');
        }
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    try {
      await deleteUser(id);
      showSnackbar('کاربر حذف شد', 'success');
      loadUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      let errorMessage = 'خطا در حذف کاربر';
      if (err.response?.data?.detail && typeof err.response.data.detail === 'string') {
        errorMessage = err.response.data.detail;
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', width: 70 },
    { field: 'username', headerName: 'نام کاربری', width: 150 },
    { field: 'full_name', headerName: 'نام کامل', width: 200 },
    { field: 'access_level', headerName: 'سطح دسترسی', width: 150 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      width: 100,
      getActions: (params) => {
        const isSuperAdmin = params.row.username === 'superadmin';
        const isAdmin = params.row.username === 'admin';
        const cannotDelete = isSuperAdmin || isAdmin;
        
        return [
          <GridActionsCellItem
            icon={<EditIcon color={isSuperAdmin ? "disabled" : "primary"} />}
            label={isSuperAdmin ? "غیرقابل ویرایش" : "ویرایش"}
            onClick={() => {
              if (!isSuperAdmin) {
                setCurrentUser({ ...params.row, password: '' });
                setEditMode(true);
                setOpenDialog(true);
              }
            }}
            disabled={isSuperAdmin}
          />,
          <GridActionsCellItem
            icon={<DeleteIcon color={cannotDelete ? "disabled" : "error"} />}
            label={cannotDelete ? (isAdmin ? "ادمین قابل حذف نیست" : "غیرقابل حذف") : "حذف"}
            onClick={() => !cannotDelete && handleDelete(params.row.id)}
            disabled={cannotDelete}
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
            <PeopleIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              مدیریت کاربران
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentUser({ username: '', password: '', full_name: '', access_level: 'viewer' });
              setEditMode(false);
              setOpenDialog(true);
            }}
          >
            افزودن کاربر جدید
          </Button>
        </Box>
        <DataGrid
          rows={users}
          columns={columns}
          autoHeight
          pageSize={10}
          disableSelectionOnClick
          sx={{ 
            direction: 'rtl',
            '& .MuiDataGrid-columnHeaders': {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'ویرایش کاربر' : 'افزودن کاربر'}</DialogTitle>
        <DialogContent>
          <TextField
            label="نام کاربری"
            fullWidth
            margin="normal"
            value={currentUser.username}
            onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })}
            disabled={editMode}
          />
          <TextField
            label={editMode ? "رمز عبور جدید (خالی بگذارید اگر تغییر نمی‌کند)" : "رمز عبور"}
            type="password"
            fullWidth
            margin="normal"
            value={currentUser.password}
            onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
            disabled={
              (editMode && currentUser.username === 'superadmin') || 
              (editMode && currentUser.username === 'admin' && !isSuperAdmin && loggedInUser.username !== 'admin')
            }
            helperText={
              editMode && currentUser.username === 'superadmin' 
                ? "رمز عبور مدیر کل قابل تغییر نیست" 
                : editMode && currentUser.username === 'admin' && !isSuperAdmin && loggedInUser.username !== 'admin'
                ? "فقط سوپر ادمین یا خود ادمین می‌تواند رمز ادمین را تغییر دهد"
                : ""
            }
          />
          <TextField
            label="نام کامل"
            fullWidth
            margin="normal"
            value={currentUser.full_name}
            onChange={e => setCurrentUser({ ...currentUser, full_name: e.target.value })}
            disabled={editMode && currentUser.username === 'superadmin'}
          />
          <TextField
            select
            label="سطح دسترسی"
            fullWidth
            margin="normal"
            value={currentUser.access_level}
            onChange={e => setCurrentUser({ ...currentUser, access_level: e.target.value })}
            disabled={editMode && currentUser.username === 'superadmin'}
          >
            <MenuItem value="admin">مدیر (Admin)</MenuItem>
            <MenuItem value="warehouseman">انباردار</MenuItem>
            <MenuItem value="viewer">مشاهده‌گر</MenuItem>
          </TextField>

          {currentUser.access_level === 'warehouseman' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>انبارهای مجاز</InputLabel>
              <Select
                multiple
                value={currentUser.warehouses || []}
                onChange={(e) => setCurrentUser({ ...currentUser, warehouses: e.target.value })}
                input={<OutlinedInput label="انبارهای مجاز" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const wh = warehouses.find(w => w.id === value);
                      return <Chip key={value} label={wh ? wh.name : value} />;
                    })}
                  </Box>
                )}
              >
                {warehouses.map((wh) => (
                  <MenuItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            ذخیره
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

export default UserManagement;
