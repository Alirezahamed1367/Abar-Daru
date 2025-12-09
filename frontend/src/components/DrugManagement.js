import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Alert, Snackbar, Chip, Avatar, Tooltip, InputAdornment,
  FormControlLabel, Checkbox
} from '@mui/material';
import { DataGrid, GridActionsCellItem, GridToolbarQuickFilter } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import ImageIcon from '@mui/icons-material/Image';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { canEdit, isAdmin } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function DrugManagement() {
  const currentUser = useCurrentUser();
  const [drugs, setDrugs] = useState([]);
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDrug, setCurrentDrug] = useState({ name: '', dose: '', package_type: '', description: '', image: '', has_expiry_date: true });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [dialogImageUrl, setDialogImageUrl] = useState('');
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadDrugs();
  }, []);

  useEffect(() => {
    // Filter drugs based on search text
    if (searchText.trim() === '') {
      setFilteredDrugs(drugs);
    } else {
      const lowercaseSearch = searchText.toLowerCase();
      const filtered = drugs.filter(drug =>
        drug.name?.toLowerCase().includes(lowercaseSearch) ||
        drug.dose?.toLowerCase().includes(lowercaseSearch) ||
        drug.package_type?.toLowerCase().includes(lowercaseSearch) ||
        drug.description?.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredDrugs(filtered);
    }
  }, [searchText, drugs]);

  const loadDrugs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/drugs`);
      setDrugs(response.data);
      setFilteredDrugs(response.data);
    } catch (error) {
      showSnackbar('خطا در بارگذاری داروها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentDrug.name?.trim()) newErrors.name = 'نام دارو الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // First send JSON payload to create/update drug
      const payload = {
        name: currentDrug.name,
        dose: currentDrug.dose,
        package_type: currentDrug.package_type,
        description: currentDrug.description,
        has_expiry_date: currentDrug.has_expiry_date !== false
      };
      let res;
      if (editMode) {
        res = await axios.put(`${API_BASE_URL}/drugs/${currentDrug.id}`, payload);
      } else {
        res = await axios.post(`${API_BASE_URL}/drugs`, payload);
      }
      
      // Get drug ID from response - handle different response structures
      let drugId;
      if (editMode) {
        drugId = currentDrug.id;
      } else {
        // Try to get ID from different possible locations in response
        drugId = res.data?.id || res.data?.data?.id || res.id;
        
        // Additional logging for debugging
        if (!drugId) {
          console.error('Failed to extract drug ID. Full response:', {
            data: res.data,
            status: res.status,
            headers: res.headers
          });
        }
      }
      
      // Validate drugId before proceeding
      if (!drugId) {
        throw new Error('خطا در دریافت شناسه دارو از سرور');
      }

      // If there's an image, upload it separately to the upload endpoint
      if (imageFile) {
        try {
          // کمپرس تصویر قبل از ارسال
          const compressed = await compressImage(imageFile, 600, 600, 0.7);
          const fd = new FormData();
          fd.append('file', compressed, imageFile.name);
          await axios.post(`${API_BASE_URL}/upload-drug-image?drug_id=${drugId}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (imgError) {
          console.error('Image upload error:', imgError);
          // Don't fail the whole operation if image upload fails
          showSnackbar('دارو ثبت شد اما آپلود تصویر با خطا مواجه شد', 'warning');
          loadDrugs();
          handleCloseDialog();
          setImageFile(null);
          setImagePreview('');
          return;
        }
      }
      
      showSnackbar(editMode ? 'دارو با موفقیت ویرایش شد' : 'دارو با موفقیت ثبت شد', 'success');
      loadDrugs();
      handleCloseDialog();
      setImageFile(null);
      setImagePreview('');
    } catch (error) {
      console.error('Save drug error:', error);
      let errorMessage = 'خطا در ذخیره‌سازی';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(e => e.msg || e).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  // کمپرس تصویر با canvas
  const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = function () {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((maxHeight / height) * width);
          height = maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این دارو اطمینان دارید؟')) return;

    try {
      await axios.delete(`${API_BASE_URL}/drugs/${id}`);
      showSnackbar('دارو با موفقیت حذف شد', 'success');
      loadDrugs();
    } catch (error) {
      console.error('Delete drug error:', error);
      let errorMessage = 'خطا در حذف دارو';
      if (error.response?.data?.detail && typeof error.response.data.detail === 'string') {
        errorMessage = error.response.data.detail;
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleEdit = (drug) => {
    setCurrentDrug(drug);
    setEditMode(true);
    setOpenDialog(true);
  };

  const handleAdd = () => {
    setCurrentDrug({ name: '', dose: '', package_type: '', description: '' });
    setEditMode(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentDrug({ name: '', dose: '', package_type: '', description: '' });
    setErrors({});
  };

  const handleShowDetails = (drug) => {
    setSelectedDrug(drug);
    setOpenDetailDialog(true);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { 
      field: 'rowNumber', 
      headerName: 'ردیف', 
      width: 80,
      valueGetter: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
    },
    {
      field: 'name',
      headerName: 'نام دارو',
      width: 250,
      renderCell: (params) => {
        // Use new drug-image endpoint for better fallback support
        const imageUrl = params.row.image ? `${API_BASE_URL}/drug-image/${params.row.id}` : null;
        
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <LocalPharmacyIcon fontSize="small" />
            </Avatar>
            {imageUrl ? (
              <Tooltip
                title={<img src={imageUrl} alt="تصویر دارو" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }} />}
                placement="top"
                arrow
              >
                <Typography
                  fontWeight="bold"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setDialogImageUrl(imageUrl);
                    setOpenImageDialog(true);
                  }}
                >
                  {params.value}
                </Typography>
              </Tooltip>
            ) : (
              <Typography fontWeight="bold">{params.value}</Typography>
            )}
          </Box>
        );
      }
    },
    { 
      field: 'dose', 
      headerName: 'دوز', 
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value || '-'} size="small" color="primary" variant="outlined" />
      )
    },
    { 
      field: 'package_type', 
      headerName: 'نوع بسته‌بندی', 
      width: 180,
      renderCell: (params) => (
        <Chip label={params.value || '-'} size="small" color="secondary" variant="outlined" />
      )
    },
    {
      field: 'description',
      headerName: 'توضیحات',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'عملیات',
      width: 150,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<InfoIcon color="info" />}
            label="جزئیات"
            onClick={() => handleShowDetails(params.row)}
          />
        ];
        
        // Only admin can edit/delete drugs
        if (isAdmin(currentUser)) {
          actions.push(
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
          );
        }
        
        return actions;
      }
    }
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, direction: 'rtl' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, direction: 'rtl' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexDirection="row-reverse" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1} flexDirection="row-reverse">
            <LocalPharmacyIcon color="secondary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="secondary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              مدیریت داروها
            </Typography>
          </Box>
          {isAdmin(currentUser) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ fontWeight: 'bold' }}
            >
              افزودن دارو جدید
            </Button>
          )}
        </Box>

        {/* Search Field */}
        <Box mb={2}>
          <TextField
            fullWidth
            placeholder="جستجو بر اساس نام، دوز، نوع بسته‌بندی یا توضیحات..."
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
          rows={filteredDrugs}
          columns={columns}
          loading={loading}
          autoHeight
          pagination
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 }
            }
          }}
          pageSizeOptions={[25, 50, 100]}
          paginationMode="client"
          rowCount={filteredDrugs.length}
          getRowId={(row) => row.id}
          disableSelectionOnClick
          sx={{
            direction: 'rtl',
            '& .MuiDataGrid-root': { direction: 'rtl' },
            '& .MuiDataGrid-cell': { textAlign: 'right', direction: 'rtl' },
            '& .MuiDataGrid-columnHeader': { textAlign: 'right', direction: 'rtl' }
          }}
        />
      </Paper>

      {/* Dialog افزودن/ویرایش */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ direction: 'rtl', textAlign: 'right' }}>
          {editMode ? '✏️ ویرایش دارو' : '➕ افزودن دارو جدید'}
        </DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <TextField
            label="نام دارو *"
            fullWidth
            margin="normal"
            value={currentDrug.name}
            onChange={e => setCurrentDrug({ ...currentDrug, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ direction: 'rtl', textAlign: 'right' }}
            inputProps={{ style: { textAlign: 'right' } }}
          />
          <TextField
            label="دوز دارو"
            fullWidth
            margin="normal"
            value={currentDrug.dose}
            onChange={e => setCurrentDrug({ ...currentDrug, dose: e.target.value })}
            placeholder="مثال: 500mg"
            sx={{ direction: 'rtl', textAlign: 'right' }}
            inputProps={{ style: { textAlign: 'right' } }}
          />
          <TextField
            label="نوع بسته‌بندی"
            fullWidth
            margin="normal"
            value={currentDrug.package_type}
            onChange={e => setCurrentDrug({ ...currentDrug, package_type: e.target.value })}
            placeholder="مثال: بسته 10 عددی"
            sx={{ direction: 'rtl', textAlign: 'right' }}
            inputProps={{ style: { textAlign: 'right' } }}
          />
          <TextField
            label="توضیحات"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={currentDrug.description}
            onChange={e => setCurrentDrug({ ...currentDrug, description: e.target.value })}
            sx={{ direction: 'rtl', textAlign: 'right' }}
            inputProps={{ style: { textAlign: 'right' } }}
          />
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentDrug.has_expiry_date !== false}
                  onChange={e => setCurrentDrug({ ...currentDrug, has_expiry_date: e.target.checked })}
                  color="primary"
                />
              }
              label="کالای دارای تاریخ انقضا"
              sx={{ direction: 'rtl' }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4, mb: 1 }}>
              در صورت تیک زدن این گزینه، هنگام رسید انبار باید تاریخ انقضا وارد شود
            </Typography>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>تصویر دارو:</Typography>
            <Button variant="outlined" component="label" sx={{ mr: 2 }}>
              انتخاب تصویر
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
            </Button>
            {imagePreview && (
              <Box sx={{ display: 'inline-block', verticalAlign: 'middle', ml: 2 }}>
                <img src={imagePreview} alt="پیش‌نمایش" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl', justifyContent: 'flex-start' }}>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" color="secondary">
            {editMode ? 'ذخیره تغییرات' : 'ثبت دارو'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog جزئیات */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ direction: 'rtl', textAlign: 'right' }}>
          💊 جزئیات دارو
        </DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          {selectedDrug && (
            <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
              <Typography variant="h6" gutterBottom color="primary">
                {selectedDrug.name}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">دوز:</Typography>
                <Typography variant="body1" gutterBottom>{selectedDrug.dose || '-'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>نوع بسته‌بندی:</Typography>
                <Typography variant="body1" gutterBottom>{selectedDrug.package_type || '-'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>توضیحات:</Typography>
                <Typography variant="body1" gutterBottom>{selectedDrug.description || '-'}</Typography>
                
                <Box sx={{ mt: 3, p: 2, bgcolor: selectedDrug.has_expiry_date !== false ? '#e3f2fd' : '#fff3e0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>وضعیت تاریخ انقضا:</Typography>
                  {selectedDrug.has_expiry_date !== false ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" color="primary.main" fontWeight="bold">✅ دارای تاریخ انقضا</Typography>
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" color="warning.main" fontWeight="bold">⚠️ کالای بدون تاریخ انقضا</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl', justifyContent: 'flex-start' }}>
          <Button onClick={() => setOpenDetailDialog(false)}>بستن</Button>
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
    {/* Dialog نمایش تصویر بزرگ */}
    <Dialog open={openImageDialog} onClose={() => setOpenImageDialog(false)} maxWidth="md">
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#fff' }}>
        <img src={dialogImageUrl} alt="تصویر دارو" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, boxShadow: '0 2px 8px #aaa' }} />
      </Box>
    </Dialog>
    </Box>
  );
}

export default DrugManagement;
