import React, { useEffect } from 'react';
import { DataGrid, faIR } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import { Box, Button, Typography, Paper, IconButton, Chip, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { API_BASE_URL } from '../utils/api';
import axios from 'axios';
import moment from 'jalali-moment';
import { canEdit, filterWarehousesByAccess } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function ToolInventoryForm() {
  const currentUser = useCurrentUser();
  const [receipts, setReceipts] = React.useState([]);
  const [filteredReceipts, setFilteredReceipts] = React.useState([]);
  const [searchText, setSearchText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tools, setTools] = React.useState([]);
  const [warehouses, setWarehouses] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [user, setUser] = React.useState(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    tool_id: '',
    warehouse_id: '',
    supplier_id: '',
    quantity: 1,
    entry_date: moment().format('YYYY-MM-DD')
  });
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });

  // دریافت لیست رسیدهای ثبت‌شده و اطلاعات اولیه
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);

        const [receiptsRes, toolsRes, warehousesRes, suppliersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/tool-inventory`),
          axios.get(`${API_BASE_URL}/tools`),
          axios.get(`${API_BASE_URL}/warehouses`),
          axios.get(`${API_BASE_URL}/suppliers`),
        ]);
        
        setReceipts(receiptsRes.data);
        setFilteredReceipts(receiptsRes.data);
        setTools(toolsRes.data);
        setWarehouses(filterWarehousesByAccess(warehousesRes.data, storedUser));
        setSuppliers(suppliersRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setReceipts([]);
        setFilteredReceipts([]);
        setTools([]);
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
        const tool = tools.find(t => t.id === receipt.tool_id);
        const warehouse = warehouses.find(w => w.id === receipt.warehouse_id);
        const supplier = suppliers.find(s => s.id === receipt.supplier_id);
        
        return (
          tool?.name?.toLowerCase().includes(lowercaseSearch) ||
          tool?.serial_number?.toLowerCase().includes(lowercaseSearch) ||
          warehouse?.name?.toLowerCase().includes(lowercaseSearch) ||
          supplier?.name?.toLowerCase().includes(lowercaseSearch) ||
          receipt.entry_date?.includes(lowercaseSearch) ||
          receipt.quantity?.toString().includes(lowercaseSearch)
        );
      });
      setFilteredReceipts(filtered);
    }
  }, [searchText, receipts, tools, warehouses, suppliers]);

  // حذف رسید
  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این رسید اطمینان دارید؟')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/tool-inventory/${id}`);
      showSnackbar('رسید با موفقیت حذف شد', 'success');
      fetchReceipts();
    } catch (err) {
      console.error('Receipt deletion error:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 'خطا در حذف رسید';
      showSnackbar(errorMessage, 'error');
    }
  };

  // باز کردن دیالوگ برای ثبت جدید
  const handleOpenNewDialog = () => {
    setFormData({
      tool_id: '',
      warehouse_id: '',
      supplier_id: '',
      quantity: 1,
      entry_date: moment().format('YYYY-MM-DD')
    });
    setDialogOpen(true);
  };

  // بستن دیالوگ
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // ثبت رسید جدید
  const handleSubmitDialog = async () => {
    if (!formData.tool_id || !formData.warehouse_id || !formData.supplier_id || !formData.quantity) {
      showSnackbar('لطفا تمام فیلدهای الزامی را پر کنید', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/tool-inventory`, formData);
      showSnackbar('رسید با موفقیت ثبت شد', 'success');
      fetchReceipts();
      handleCloseDialog();
    } catch (err) {
      console.error('Receipt submit error:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 'خطا در ثبت رسید';
      showSnackbar(errorMessage, 'error');
    }
  };

  // دریافت مجدد رسیدها
  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/tool-inventory`);
      setReceipts(res.data);
    } catch {
      setReceipts([]);
    }
    setLoading(false);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <BuildIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              رسید ابزار
            </Typography>
          </Box>
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

        {/* Search Field */}
        <Box mb={2}>
          <TextField
            fullWidth
            placeholder="جستجو بر اساس ابزار، شماره سریال، انبار، تامین‌کننده..."
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
                field: 'tool_id',
                headerName: 'ابزار',
                flex: 1,
                minWidth: 150,
                renderCell: (params) => {
                  const tool = tools.find(t => t.id === params.row.tool_id);
                  return (
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {tool?.name || params.row.tool_id}
                      </Typography>
                      {tool?.serial_number && (
                        <Typography variant="caption" color="text.secondary">
                          S/N: {tool.serial_number}
                        </Typography>
                      )}
                    </Box>
                  );
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
                field: 'entry_date', 
                headerName: 'تاریخ ثبت', 
                width: 130,
                valueGetter: (params) => {
                  return params.row.entry_date ? moment(params.row.entry_date).format('YYYY/MM/DD') : '-';
                }
              },
              ...(canEdit(currentUser) ? [{
                field: 'actions',
                headerName: 'عملیات',
                width: 100,
                renderCell: (params) => (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(params.row.id)}
                    title="حذف"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ),
              }] : []),
            ]}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            getRowId={row => row.id}
            localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          />
        </Box>
      </Paper>
      
      {/* Dialog for adding new receipt */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>ثبت رسید ابزار جدید</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>ابزار</InputLabel>
              <Select
                value={formData.tool_id}
                label="ابزار"
                onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
              >
                {tools.map(tool => (
                  <MenuItem key={tool.id} value={tool.id}>
                    {tool.name} (S/N: {tool.serial_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>انبار مقصد</InputLabel>
              <Select
                value={formData.warehouse_id}
                label="انبار مقصد"
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              >
                {warehouses.map(wh => (
                  <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>تامین‌کننده</InputLabel>
              <Select
                value={formData.supplier_id}
                label="تامین‌کننده"
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              >
                {suppliers.map(sup => (
                  <MenuItem key={sup.id} value={sup.id}>{sup.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              type="number"
              label="تعداد"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              type="date"
              label="تاریخ ورود"
              value={formData.entry_date}
              onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSubmitDialog} variant="contained" color="primary">
            ثبت
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default ToolInventoryForm;
