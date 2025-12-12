import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Alert, Snackbar, Chip, Avatar, Tooltip, InputAdornment
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import ImageIcon from '@mui/icons-material/Image';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { canEdit, isAdmin } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function ToolManagement() {
  const currentUser = useCurrentUser();
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTool, setCurrentTool] = useState({ 
    name: '', 
    serial_number: '', 
    manufacturer: '', 
    description: '', 
    image: '' 
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [dialogImageUrl, setDialogImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    // Filter tools based on search text
    if (searchText.trim() === '') {
      setFilteredTools(tools);
    } else {
      const lowercaseSearch = searchText.toLowerCase();
      const filtered = tools.filter(tool =>
        tool.name?.toLowerCase().includes(lowercaseSearch) ||
        tool.serial_number?.toLowerCase().includes(lowercaseSearch) ||
        tool.manufacturer?.toLowerCase().includes(lowercaseSearch) ||
        tool.description?.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredTools(filtered);
    }
  }, [searchText, tools]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/tools`);
      setTools(response.data);
      setFilteredTools(response.data);
    } catch (error) {
      showSnackbar('خطا در بارگذاری ابزارها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentTool.name?.trim()) newErrors.name = 'نام ابزار الزامی است';
    if (!currentTool.serial_number?.trim()) newErrors.serial_number = 'شماره سریال الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        name: currentTool.name,
        serial_number: currentTool.serial_number,
        manufacturer: currentTool.manufacturer || '',
        description: currentTool.description || '',
        image_data: imageFile || ''
      };

      if (editMode) {
        await axios.put(`${API_BASE_URL}/tools/${currentTool.id}`, payload);
        showSnackbar('ابزار با موفقیت ویرایش شد', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/tools`, payload);
        showSnackbar('ابزار با موفقیت افزوده شد', 'success');
      }

      handleCloseDialog();
      loadTools();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'خطا در ذخیره ابزار';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این ابزار اطمینان دارید؟')) return;

    try {
      await axios.delete(`${API_BASE_URL}/tools/${id}`);
      showSnackbar('ابزار با موفقیت حذف شد', 'success');
      loadTools();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'خطا در حذف ابزار';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleOpenDialog = (tool = null) => {
    if (tool) {
      setEditMode(true);
      setCurrentTool(tool);
      if (tool.image) {
        setImagePreview(`${API_BASE_URL.replace('/api', '')}/${tool.image}`);
      }
    } else {
      setEditMode(false);
      setCurrentTool({ name: '', serial_number: '', manufacturer: '', description: '', image: '' });
      setImagePreview('');
    }
    setImageFile(null);
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTool({ name: '', serial_number: '', manufacturer: '', description: '', image: '' });
    setImageFile(null);
    setImagePreview('');
    setErrors({});
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleViewImage = (imageUrl) => {
    setDialogImageUrl(`${API_BASE_URL.replace('/api', '')}/${imageUrl}`);
    setOpenImageDialog(true);
  };

  const columns = [
    { 
      field: 'id', 
      headerName: 'شناسه', 
      flex: 0.3,
      minWidth: 70
    },
    { 
      field: 'name', 
      headerName: 'نام ابزار', 
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <BuildIcon color="primary" fontSize="small" />
          <Typography fontWeight="bold">{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: 'serial_number', 
      headerName: 'شماره سریال', 
      flex: 0.8,
      minWidth: 130,
      renderCell: (params) => (
        <Chip label={params.value} color="secondary" size="small" />
      )
    },
    { 
      field: 'manufacturer', 
      headerName: 'سازنده', 
      flex: 0.8,
      minWidth: 120
    },
    {
      field: 'image',
      headerName: 'تصویر',
      flex: 0.4,
      minWidth: 80,
      renderCell: (params) => (
        params.value ? (
          <IconButton size="small" onClick={() => handleViewImage(params.value)}>
            <ImageIcon color="primary" />
          </IconButton>
        ) : <Typography variant="body2" color="text.secondary">-</Typography>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      flex: 0.5,
      minWidth: 100,
      getActions: (params) => {
        const actions = [];
        
        if (canEdit(currentUser)) {
          actions.push(
            <GridActionsCellItem
              icon={<EditIcon />}
              label="ویرایش"
              onClick={() => handleOpenDialog(params.row)}
              color="primary"
            />
          );
        }
        
        if (isAdmin(currentUser)) {
          actions.push(
            <GridActionsCellItem
              icon={<DeleteIcon />}
              label="حذف"
              onClick={() => handleDelete(params.row.id)}
              color="error"
            />
          );
        }
        
        return actions;
      },
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <BuildIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              مدیریت ابزارها
            </Typography>
          </Box>
          {canEdit(currentUser) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              ابزار جدید
            </Button>
          )}
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="جستجو در ابزارها..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startIcon: <SearchIcon />
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredTools}
            columns={columns}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[25, 50, 100]}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
              }
            }}
          />
        </Box>
      </Paper>

      {/* Dialog for Add/Edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'ویرایش ابزار' : 'افزودن ابزار جدید'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="نام ابزار"
              fullWidth
              required
              value={currentTool.name}
              onChange={(e) => setCurrentTool({ ...currentTool, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
            />
            <TextField
              label="شماره سریال"
              fullWidth
              required
              value={currentTool.serial_number}
              onChange={(e) => setCurrentTool({ ...currentTool, serial_number: e.target.value })}
              error={!!errors.serial_number}
              helperText={errors.serial_number || 'شماره سریال باید منحصر به فرد باشد'}
              disabled={editMode}
            />
            <TextField
              label="سازنده"
              fullWidth
              value={currentTool.manufacturer}
              onChange={(e) => setCurrentTool({ ...currentTool, manufacturer: e.target.value })}
            />
            <TextField
              label="توضیحات"
              fullWidth
              multiline
              rows={3}
              value={currentTool.description}
              onChange={(e) => setCurrentTool({ ...currentTool, description: e.target.value })}
            />
            
            <Box>
              <Typography variant="body2" gutterBottom>تصویر ابزار</Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
              >
                انتخاب تصویر
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
              {imagePreview && (
                <Box mt={2}>
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image View Dialog */}
      <Dialog open={openImageDialog} onClose={() => setOpenImageDialog(false)} maxWidth="md">
        <DialogContent>
          <img src={dialogImageUrl} alt="Tool" style={{ width: '100%' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImageDialog(false)}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ToolManagement;
