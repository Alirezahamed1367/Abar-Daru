import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, 
    DialogActions, FormControl, InputLabel, Select, MenuItem, TextField, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BuildIcon from '@mui/icons-material/Build';
import { DataGrid, faIR } from '@mui/x-data-grid';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import moment from 'jalali-moment';
import { canEdit, filterWarehousesByAccess } from '../utils/permissions';
import { useCurrentUser } from '../utils/useCurrentUser';

function ToolTransferForm() {
  const currentUser = useCurrentUser();
  const [warehouses, setWarehouses] = useState([]);
  const [tools, setTools] = useState([]);
  const [toolInventory, setToolInventory] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    tool_id: '',
    consumer_id: '',
    transfer_type: 'warehouse_to_warehouse',
    quantity: 1,
    transfer_date: moment().format('YYYY-MM-DD'),
    notes: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    fetchTransfers();
    fetchBasicData(storedUser);
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      // فیلتر حواله‌های مربوط به ابزارها (item_type='tool')
      const transRes = await axios.get(`${API_BASE_URL}/transfer/all`);
      const toolTransfers = transRes.data.filter(t => t.item_type === 'tool');
      setTransfers(toolTransfers);
    } catch (err) {
      console.error("Error fetching transfers", err);
    }
    setLoading(false);
  };

  const fetchBasicData = async (storedUser) => {
    try {
      const [whRes, toolRes, consRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/warehouses`),
        axios.get(`${API_BASE_URL}/tools`),
        axios.get(`${API_BASE_URL}/consumers`)
      ]);
      
      setWarehouses(filterWarehousesByAccess(whRes.data, storedUser));
      setTools(toolRes.data);
      setConsumers(consRes.data);
    } catch (err) {
      console.error("Error fetching basic data", err);
    }
  };

  const fetchToolInventory = async (warehouseId) => {
    if (!warehouseId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/tool-inventory/report`, {
        params: { warehouse_id: warehouseId }
      });
      setToolInventory(res.data);
    } catch (err) {
      console.error("Error fetching tool inventory", err);
      setToolInventory([]);
    }
  };

  const handleOpenNewDialog = () => {
    setFormData({
      source_warehouse_id: '',
      destination_warehouse_id: '',
      tool_id: '',
      consumer_id: '',
      transfer_type: 'warehouse_to_warehouse',
      quantity: 1,
      transfer_date: moment().format('YYYY-MM-DD'),
      notes: ''
    });
    setToolInventory([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmitDialog = async () => {
    if (!formData.source_warehouse_id || !formData.tool_id || !formData.quantity) {
      showSnackbar('لطفا فیلدهای الزامی را پر کنید', 'error');
      return;
    }

    if (formData.transfer_type === 'warehouse_to_warehouse' && !formData.destination_warehouse_id) {
      showSnackbar('لطفا انبار مقصد را انتخاب کنید', 'error');
      return;
    }

    if (formData.transfer_type === 'warehouse_to_consumer' && !formData.consumer_id) {
      showSnackbar('لطفا مصرف‌کننده را انتخاب کنید', 'error');
      return;
    }

    try {
      // ساخت payload مطابق با API
      const payload = {
        source_warehouse_id: formData.source_warehouse_id,
        tool_id: formData.tool_id,
        quantity: formData.quantity,
        transfer_date: formData.transfer_date,
        notes: formData.notes || '',
        item_type: 'tool'
      };

      if (formData.transfer_type === 'warehouse_to_warehouse') {
        payload.destination_warehouse_id = formData.destination_warehouse_id;
        payload.transfer_type = 'warehouse_to_warehouse';
      } else {
        payload.consumer_id = formData.consumer_id;
        payload.transfer_type = 'warehouse_to_consumer';
      }

      await axios.post(`${API_BASE_URL}/transfer/create`, null, { params: payload });
      showSnackbar('حواله با موفقیت ثبت شد', 'success');
      fetchTransfers();
      handleCloseDialog();
    } catch (err) {
      console.error('Transfer creation error:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 'خطا در ثبت حواله';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('آیا از تایید این حواله اطمینان دارید؟')) return;
    try {
      await axios.put(`${API_BASE_URL}/transfer/${id}/confirm`);
      showSnackbar('حواله با موفقیت تایید شد', 'success');
      fetchTransfers();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'خطا در تایید حواله';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('آیا از رد این حواله اطمینان دارید؟')) return;
    try {
      await axios.put(`${API_BASE_URL}/transfer/${id}/reject`);
      showSnackbar('حواله با موفقیت رد شد', 'success');
      fetchTransfers();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'خطا در رد حواله';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    const transfer = transfers.find(t => t.id === id);
    if (transfer && (transfer.status === 'confirmed' || transfer.status === 'rejected')) {
      showSnackbar('حواله تایید یا رد شده قابل حذف نیست', 'error');
      return;
    }

    if (!window.confirm('آیا از حذف این حواله اطمینان دارید؟')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/transfer/${id}`);
      showSnackbar('حواله با موفقیت حذف شد', 'success');
      fetchTransfers();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'خطا در حذف حواله';
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSourceWarehouseChange = (warehouseId) => {
    setFormData({ ...formData, source_warehouse_id: warehouseId, tool_id: '' });
    fetchToolInventory(warehouseId);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <BuildIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              حواله ابزار
            </Typography>
          </Box>
          {canEdit(currentUser) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenNewDialog}
            >
              ثبت حواله جدید
            </Button>
          )}
        </Box>

        <Box sx={{ height: { xs: 500, sm: 600 }, width: '100%' }}>
          <DataGrid
            rows={transfers}
            columns={[
              { field: 'id', headerName: 'کد', width: 70 },
              {
                field: 'source_warehouse_id',
                headerName: 'مبدا',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => {
                  const wh = warehouses.find(w => w.id === params.row.source_warehouse_id);
                  return wh ? wh.name : '-';
                }
              },
              {
                field: 'destination_warehouse_id',
                headerName: 'مقصد',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => {
                  if (params.row.transfer_type === 'warehouse_to_consumer') {
                    const cons = consumers.find(c => c.id === params.row.consumer_id);
                    return cons ? `👤 ${cons.name}` : 'مصرف‌کننده';
                  }
                  const wh = warehouses.find(w => w.id === params.row.destination_warehouse_id);
                  return wh ? wh.name : '-';
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
                        {tool?.name || '-'}
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
              { field: 'quantity', headerName: 'تعداد', width: 80 },
              { 
                field: 'transfer_date', 
                headerName: 'تاریخ', 
                width: 110,
                valueGetter: (params) => params.row.transfer_date || '-'
              },
              {
                field: 'status',
                headerName: 'وضعیت',
                width: 120,
                renderCell: (params) => {
                  const statusMap = {
                    pending: { label: 'در انتظار', color: 'warning' },
                    confirmed: { label: 'تایید شده', color: 'success' },
                    rejected: { label: 'رد شده', color: 'error' }
                  };
                  const status = statusMap[params.row.status] || { label: params.row.status, color: 'default' };
                  return <Chip label={status.label} color={status.color} size="small" />;
                }
              },
              {
                field: 'actions',
                headerName: 'عملیات',
                width: 150,
                renderCell: (params) => {
                  const transfer = params.row;
                  return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {transfer.status === 'pending' && canEdit(currentUser) && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleConfirm(transfer.id)}
                            title="تایید"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReject(transfer.id)}
                            title="رد"
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {transfer.status === 'pending' && canEdit(currentUser) && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(transfer.id)}
                          title="حذف"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                },
              },
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
            }}
          />
        </Box>
      </Paper>
      
      {/* Dialog for creating new transfer */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>ثبت حواله ابزار جدید</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>نوع حواله</InputLabel>
              <Select
                value={formData.transfer_type}
                label="نوع حواله"
                onChange={(e) => setFormData({ ...formData, transfer_type: e.target.value, destination_warehouse_id: '', consumer_id: '' })}
              >
                <MenuItem value="warehouse_to_warehouse">انبار به انبار</MenuItem>
                <MenuItem value="warehouse_to_consumer">انبار به مصرف‌کننده</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>انبار مبدا</InputLabel>
              <Select
                value={formData.source_warehouse_id}
                label="انبار مبدا"
                onChange={(e) => handleSourceWarehouseChange(e.target.value)}
              >
                {warehouses.map(wh => (
                  <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.transfer_type === 'warehouse_to_warehouse' && (
              <FormControl fullWidth required>
                <InputLabel>انبار مقصد</InputLabel>
                <Select
                  value={formData.destination_warehouse_id}
                  label="انبار مقصد"
                  onChange={(e) => setFormData({ ...formData, destination_warehouse_id: e.target.value })}
                >
                  {warehouses.filter(w => w.id !== formData.source_warehouse_id).map(wh => (
                    <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {formData.transfer_type === 'warehouse_to_consumer' && (
              <FormControl fullWidth required>
                <InputLabel>مصرف‌کننده</InputLabel>
                <Select
                  value={formData.consumer_id}
                  label="مصرف‌کننده"
                  onChange={(e) => setFormData({ ...formData, consumer_id: e.target.value })}
                >
                  {consumers.map(cons => (
                    <MenuItem key={cons.id} value={cons.id}>{cons.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth required disabled={!formData.source_warehouse_id}>
              <InputLabel>ابزار</InputLabel>
              <Select
                value={formData.tool_id}
                label="ابزار"
                onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
              >
                {toolInventory.filter(inv => inv.quantity > 0).map(inv => {
                  const tool = tools.find(t => t.id === inv.tool_id);
                  return (
                    <MenuItem key={inv.tool_id} value={inv.tool_id}>
                      {tool?.name} (S/N: {tool?.serial_number}) - موجودی: {inv.quantity}
                    </MenuItem>
                  );
                })}
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
              label="تاریخ حواله"
              value={formData.transfer_date}
              onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="یادداشت"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSubmitDialog} variant="contained" color="primary">
            ثبت حواله
          </Button>
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

export default ToolTransferForm;
