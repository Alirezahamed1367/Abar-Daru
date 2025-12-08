import React, { useEffect } from 'react';
import { DataGrid, faIR } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Typography, Paper, IconButton, Chip, TextField, InputAdornment } from '@mui/material';
import { getDrugs, addInventory, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import moment from 'jalali-moment';
import InventoryDialog from './InventoryDialog';
import { getExpirationColor, getExpirationBgColor, getExpirationLabel } from '../utils/expirationUtils';
import { canEdit, filterWarehousesByAccess } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';
import { useSettings } from '../utils/SettingsContext';

function InventoryForm() {
  const currentUser = useCurrentUser();
  const { settings } = useSettings();
  const [receipts, setReceipts] = React.useState([]);
  const [filteredReceipts, setFilteredReceipts] = React.useState([]);
  const [searchText, setSearchText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [drugs, setDrugs] = React.useState([]);
  const [warehouses, setWarehouses] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState('success');
  const [actionLoading, setActionLoading] = React.useState({});
  const [canEditMap, setCanEditMap] = React.useState({});
  const [user, setUser] = React.useState(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingReceipt, setEditingReceipt] = React.useState(null);

  // Helper to convert to Jalali
  const toJalali = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return moment(dateStr).locale('fa').format('YYYY/MM/DD');
    } catch (e) {
      return dateStr;
    }
  };

  // بررسی استفاده رسید در حواله
  const checkUsed = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory/${id}/used`);
      return res.data.used;
    } catch {
      return false;
    }
  };

  // دریافت لیست رسیدهای ثبت‌شده و اطلاعات اولیه
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Simulate getting current user (in real app, get from context/localstorage)
        // For now, we fetch all users and pick 'admin' or 'warehouseman' to simulate
        // But wait, the user is logged in. We should have user info.
        // Let's assume we store user info in localStorage on login.
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);

        const [receiptsRes, drugsRes, warehousesRes, suppliersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/inventory`),
          getDrugs(),
          axios.get(`${API_BASE_URL}/warehouses`),
          axios.get(`${API_BASE_URL}/suppliers`),
        ]);
        setReceipts(receiptsRes.data);
        setFilteredReceipts(receiptsRes.data);
        setDrugs(drugsRes.data);
        
        // Filter warehouses based on user access
        let allWarehouses = warehousesRes.data;
        setWarehouses(filterWarehousesByAccess(allWarehouses, storedUser));
        
        setSuppliers(suppliersRes.data);
      } catch {
        setReceipts([]);
        setFilteredReceipts([]);
        setDrugs([]);
        setWarehouses([]);
        setSuppliers([]);
      }
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  // Filter receipts based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredReceipts(receipts);
    } else {
      const lowercaseSearch = searchText.toLowerCase();
      const filtered = receipts.filter(receipt => {
        const drug = drugs.find(d => d.id === receipt.drug_id);
        const warehouse = warehouses.find(w => w.id === receipt.warehouse_id);
        const supplier = suppliers.find(s => s.id === receipt.supplier_id);
        
        return (
          drug?.name?.toLowerCase().includes(lowercaseSearch) ||
          warehouse?.name?.toLowerCase().includes(lowercaseSearch) ||
          supplier?.name?.toLowerCase().includes(lowercaseSearch) ||
          receipt.expire_date?.includes(lowercaseSearch) ||
          receipt.entry_date?.includes(lowercaseSearch) ||
          receipt.quantity?.toString().includes(lowercaseSearch)
        );
      });
      setFilteredReceipts(filtered);
    }
  }, [searchText, receipts, drugs, warehouses, suppliers]);

  // Update canEditMap after receipts change
  useEffect(() => {
    const fetchCanEditMap = async () => {
      const map = {};
      await Promise.all(receipts.map(async (r) => {
        const used = await checkUsed(r.id);
        map[r.id] = !used;
      }));
      setCanEditMap(map);
    };
    if (receipts.length > 0) fetchCanEditMap();
    else setCanEditMap({});
  }, [receipts]);

  // حذف رسید
  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این رسید اطمینان دارید?')) return;
    
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    const used = await checkUsed(id);
    if (used) {
      setMessage('این رسید در حواله استفاده شده و قابل حذف نیست');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      setActionLoading((prev) => ({ ...prev, [id]: false }));
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/inventory/${id}`);
      setMessage('رسید با موفقیت حذف شد');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchReceipts();
    } catch (e) {
      setMessage('خطا در حذف رسید');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
    setActionLoading((prev) => ({ ...prev, [id]: false }));
  };

  // ویرایش رسید
  const handleEdit = async (id) => {
    const used = await checkUsed(id);
    if (used) {
      setMessage('این رسید در حواله استفاده شده و قابل ویرایش نیست');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    const receipt = receipts.find(r => r.id === id);
    if (receipt) {
      setEditingReceipt(receipt);
      setDialogOpen(true);
    }
  };

  // باز کردن دیالوگ برای ثبت جدید
  const handleOpenNewDialog = () => {
    setEditingReceipt(null);
    setDialogOpen(true);
  };

  // بستن دیالوگ
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReceipt(null);
  };

  // ثبت یا ویرایش رسید
  const handleSubmitDialog = async (data) => {
    try {
      if (editingReceipt) {
        // Edit mode
        await axios.put(`${API_BASE_URL}/inventory/${editingReceipt.id}`, data);
        setMessage('رسید با موفقیت ویرایش شد');
      } else {
        // New mode
        await addInventory(data);
        setMessage('رسید با موفقیت ثبت شد');
      }
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      fetchReceipts();
      handleCloseDialog();
    } catch (e) {
      setMessage(editingReceipt ? 'خطا در ویرایش رسید' : 'خطا در ثبت رسید');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // دریافت مجدد رسیدها
  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory`);
      setReceipts(res.data);
    } catch {
      setReceipts([]);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            📦 مدیریت رسیدهای ورودی
          </Typography>
          {canEdit(currentUser) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenNewDialog}
              sx={{ fontWeight: 'bold' }}
            >
              ثبت رسید جدید
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

        {/* Search Field */}
        <Box mb={2}>
          <TextField
            fullWidth
            placeholder="جستجو بر اساس دارو، انبار، تامین‌کننده، تاریخ انقضا یا مقدار..."
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
            rows={filteredReceipts}
            columns={[
              { field: 'id', headerName: 'کد', width: 70 },
              {
                field: 'warehouse_id',
                headerName: 'انبار',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => {
                  const wh = warehouses.find(w => w.id === params.row.warehouse_id);
                  return wh ? wh.name : params.row.warehouse_id;
                }
              },
              {
                field: 'drug_id',
                headerName: 'دارو',
                flex: 1,
                minWidth: 150,
                valueGetter: (params) => {
                  const drug = drugs.find(d => d.id === params.row.drug_id);
                  return drug ? drug.name : params.row.drug_id;
                }
              },
              {
                field: 'supplier_id',
                headerName: 'تامین‌کننده',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => {
                  const sup = suppliers.find(s => s.id === params.row.supplier_id);
                  return sup ? sup.name : params.row.supplier_id;
                }
              },
              { field: 'quantity', headerName: 'تعداد', width: 100 },
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
              { field: 'entry_date', headerName: 'تاریخ ثبت', width: 110 },
              // Only show actions column if user can edit
              ...(canEdit(currentUser) ? [{
                field: 'actions',
                headerName: 'عملیات',
                width: 130,
                renderCell: (params) => {
                  const id = params.row.id;
                  const canEditRow = canEditMap[id];
                  return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        color="warning"
                        disabled={!canEditRow || actionLoading[id]}
                        onClick={() => handleEdit(id)}
                        title={canEditRow ? 'ویرایش' : 'استفاده شده - غیرقابل ویرایش'}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={!canEditRow || actionLoading[id]}
                        onClick={() => handleDelete(id)}
                        title={canEditRow ? 'حذف' : 'استفاده شده - غیرقابل حذف'}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                },
              }] : []),
            ]}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            getRowId={row => row.id}
            localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
            disableSelectionOnClick
            getRowClassName={(params) => {
              const color = getExpirationColor(params.row.expire_date, settings.exp_warning_days);
              return color === 'error' ? 'row-expired' : 
                     color === 'warning' ? 'row-expiring-soon' : 'row-normal';
            }}
            sx={{
              '& .row-expired': {
                backgroundColor: '#ffebee !important',
              },
              '& .row-expiring-soon': {
                backgroundColor: '#fff3e0 !important',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          />
        </Box>
      </Paper>
      
      <InventoryDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        warehouses={warehouses}
        drugs={drugs}
        suppliers={suppliers}
        onSubmit={handleSubmitDialog}
        editData={editingReceipt}
      />
    </Box>
  );
}

export default InventoryForm;
