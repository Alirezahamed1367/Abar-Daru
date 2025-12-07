import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Paper, TextField, MenuItem, Grid, 
  Card, CardContent, CardActions, Divider, Chip, Stack, Tab, Tabs,
  FormControl, InputLabel, Select
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataGrid } from '@mui/x-data-grid';
import { exportExcel, exportPDF, getWarehouses, getDrugs, getInventoryReport, getTransfers } from '../utils/api';
import { getExpirationColor, getDaysUntilExpiration } from '../utils/expirationUtils';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function ComprehensiveReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedDrug, setSelectedDrug] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const whRes = await getWarehouses();
      setWarehouses(whRes.data || []);
      
      const drugRes = await getDrugs();
      setDrugs(drugRes.data || []);
      
      const invRes = await getInventoryReport({});
      setReportData(invRes.data || []);
      
      try {
        const transRes = await getTransfers();
        setTransfers(transRes.data || []);
      } catch (transErr) {
        console.warn('Could not load transfers:', transErr);
        setTransfers([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'خطا در بارگذاری اطلاعات');
      setLoading(false);
    }
  };

  const getFilterParams = () => {
    const params = {};
    if (selectedWarehouse) params.warehouse_id = selectedWarehouse;
    if (selectedDrug) params.drug_id = selectedDrug;
    if (dateFrom) params.expire_date_from = dateFrom;
    if (dateTo) params.expire_date_to = dateTo;
    return params;
  };

  const handleSearch = async () => {
    try {
      const res = await getInventoryReport(getFilterParams());
      let data = Array.isArray(res.data) ? res.data : [];
      
      // Apply report type filter
      if (reportType === 'expired') {
        data = data.filter(item => {
          // Only show drugs that have expiry date (has_expiry_date = true)
          if (item.has_expiry_date !== true) return false;
          const days = getDaysUntilExpiration(item.expire_date);
          return days < 0;
        });
      } else if (reportType === 'expiring-soon') {
        data = data.filter(item => {
          // Only show drugs that have expiry date (has_expiry_date = true)
          if (item.has_expiry_date !== true) return false;
          const days = getDaysUntilExpiration(item.expire_date);
          return days >= 0 && days < 90;
        });
      } else if (reportType === 'low-stock') {
        data = data.filter(item => item.quantity < 50);
      }
      
      setReportData(data);
    } catch (err) {
      console.error('Error in handleSearch:', err);
      setReportData([]);
    }
  };

  const handleExportPDF = async () => {
    const res = await exportPDF(getFilterParams());
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_report.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = async () => {
    const res = await exportExcel(getFilterParams());
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_report.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Statistics - safe calculation with default empty array
  const safeReportData = Array.isArray(reportData) ? reportData : [];
  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const totalItems = safeReportData.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const uniqueDrugs = new Set(safeReportData.map(item => item.drug_id)).size;
  // Only count items with expiry dates for expiry-related statistics
  const expiredItems = safeReportData.filter(item => item.has_expiry_date === true && getDaysUntilExpiration(item.expire_date) < 0).length;
  const expiringSoon = safeReportData.filter(item => {
    if (item.has_expiry_date !== true) return false;
    const days = getDaysUntilExpiration(item.expire_date);
    return days >= 0 && days < 90;
  }).length;

  const inventoryColumns = [
    { 
      field: 'id', 
      headerName: 'ردیف', 
      flex: 0.3,
      minWidth: 70,
      resizable: true,
    },
    { 
      field: 'warehouse_name', 
      headerName: 'نام انبار', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        if (!params.row.warehouse_id) return '-';
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const wh = safeWarehouses.find(w => w.id === params.row.warehouse_id);
        return wh ? wh.name : `انبار ${params.row.warehouse_id}`;
      }
    },
    { 
      field: 'drug_name', 
      headerName: 'نام دارو', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        if (!params.row.drug_id) return '-';
        const safeDrugs = Array.isArray(drugs) ? drugs : [];
        const d = safeDrugs.find(d => d.id === params.row.drug_id);
        return d ? d.name : `دارو ${params.row.drug_id}`;
      }
    },
    { 
      field: 'expire_date', 
      headerName: 'تاریخ انقضا', 
      flex: 0.7,
      minWidth: 120,
      resizable: true,
      renderCell: (params) => {
        const color = getExpirationColor(params.value);
        return (
          <Typography sx={{ color }}>
            {params.value || '-'}
          </Typography>
        );
      }
    },
    { 
      field: 'quantity', 
      headerName: 'تعداد', 
      flex: 0.5,
      minWidth: 100,
      resizable: true,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value < 50 ? 'error' : 'success'}
          size="small"
        />
      )
    },
  ];

  const transferColumns = [
    { field: 'id', headerName: 'شناسه', flex: 0.3, minWidth: 70, resizable: true },
    { 
      field: 'from_warehouse', 
      headerName: 'از انبار', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        if (!params.row.from_warehouse_id) return '-';
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const wh = safeWarehouses.find(w => w.id === params.row.from_warehouse_id);
        return wh ? wh.name : `انبار ${params.row.from_warehouse_id}`;
      }
    },
    { 
      field: 'to_warehouse', 
      headerName: 'به انبار', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        if (!params.row.to_warehouse_id) return '-';
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const wh = safeWarehouses.find(w => w.id === params.row.to_warehouse_id);
        return wh ? wh.name : `انبار ${params.row.to_warehouse_id}`;
      }
    },
    { 
      field: 'drug', 
      headerName: 'دارو', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        if (!params.row.drug_id) return '-';
        const safeDrugs = Array.isArray(drugs) ? drugs : [];
        const d = safeDrugs.find(d => d.id === params.row.drug_id);
        return d ? d.name : `دارو ${params.row.drug_id}`;
      }
    },
    { field: 'quantity_sent', headerName: 'تعداد ارسالی', flex: 0.5, minWidth: 100, resizable: true },
    { field: 'quantity_received', headerName: 'تعداد دریافتی', flex: 0.5, minWidth: 100, resizable: true },
    { 
      field: 'status', 
      headerName: 'وضعیت', 
      flex: 0.7,
      minWidth: 120,
      resizable: true,
      renderCell: (params) => {
        const statusColors = {
          'pending': 'warning',
          'confirmed': 'success',
          'rejected': 'error',
          'mismatch': 'info'
        };
        const statusLabels = {
          'pending': 'در انتظار',
          'confirmed': 'تایید شده',
          'rejected': 'رد شده',
          'mismatch': 'عدم تطابق'
        };
        return (
          <Chip 
            label={statusLabels[params.value] || params.value} 
            color={statusColors[params.value] || 'default'}
            size="small"
          />
        );
      }
    },
  ];

  const reportTypes = [
    { value: 'all', label: 'همه موارد', icon: <InventoryIcon /> },
    { value: 'expired', label: 'منقضی شده', icon: <WarningIcon /> },
    { value: 'expiring-soon', label: 'نزدیک به انقضا', icon: <WarningIcon /> },
    { value: 'low-stock', label: 'موجودی کم', icon: <TrendingUpIcon /> },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="primary">در حال بارگذاری...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffebee' }}>
          <Typography variant="h6" color="error" gutterBottom>خطا در بارگذاری اطلاعات</Typography>
          <Typography variant="body2">{error}</Typography>
          <Button variant="contained" onClick={loadData} sx={{ mt: 2 }}>تلاش مجدد</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
          گزارشات جامع سیستم انبارداری
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          انتخاب نوع گزارش، اعمال فیلترها و دریافت خروجی
        </Typography>

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tab icon={<InventoryIcon />} label="گزارش موجودی" />
          <Tab icon={<CompareArrowsIcon />} label="گزارش حواله‌ها" />
          <Tab icon={<AssessmentIcon />} label="آمار و تحلیل" />
        </Tabs>

        {/* Tab 1: Inventory Report */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={2.4}>
              <FormControl fullWidth>
                <InputLabel>نوع گزارش</InputLabel>
                <Select
                  value={reportType}
                  label="نوع گزارش"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <TextField
                select
                label="انبار"
                fullWidth
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <MenuItem value="">همه</MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <TextField
                select
                label="دارو"
                fullWidth
                value={selectedDrug}
                onChange={(e) => setSelectedDrug(e.target.value)}
              >
                <MenuItem value="">همه</MenuItem>
                {drugs.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <TextField
                label="از تاریخ انقضا"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={2.4}>
              <TextField
                label="تا تاریخ انقضا"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />} 
              onClick={handleSearch}
            >
              نمایش گزارش
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<PictureAsPdfIcon />} 
              onClick={handleExportPDF}
            >
              دانلود PDF
            </Button>
            <Button 
              variant="outlined" 
              color="success" 
              startIcon={<TableViewIcon />} 
              onClick={handleExportExcel}
            >
              دانلود Excel
            </Button>
          </Stack>

          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography color="primary" variant="h6">{totalItems}</Typography>
                  <Typography variant="body2">مجموع موجودی</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#f3e5f5' }}>
                <CardContent>
                  <Typography color="secondary" variant="h6">{uniqueDrugs}</Typography>
                  <Typography variant="body2">تعداد داروهای منحصر به فرد</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#ffebee' }}>
                <CardContent>
                  <Typography color="error" variant="h6">{expiredItems}</Typography>
                  <Typography variant="body2">منقضی شده</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Typography sx={{ color: 'warning.main' }} variant="h6">{expiringSoon}</Typography>
                  <Typography variant="body2">نزدیک به انقضا</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <DataGrid
            rows={safeReportData}
            columns={inventoryColumns}
            autoHeight
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableSelectionOnClick
            sx={{ 
              bgcolor: 'white',
              '& .MuiDataGrid-columnSeparator': {
                visibility: 'visible',
              },
            }}
          />
        </TabPanel>

        {/* Tab 2: Transfer Report */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              گزارش حواله‌های انبار
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={loadData}
              size="small"
            >
              به‌روزرسانی
            </Button>
          </Box>
          <DataGrid
            rows={safeTransfers}
            columns={transferColumns}
            autoHeight
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{ 
              bgcolor: 'white',
              '& .MuiDataGrid-columnSeparator': {
                visibility: 'visible',
              },
            }}
          />
        </TabPanel>

        {/* Tab 3: Analytics */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={loadData}
              size="small"
            >
              به‌روزرسانی
            </Button>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <InventoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    تحلیل موجودی
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>تعداد کل اقلام:</Typography>
                      <Chip label={safeReportData.length} color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>مجموع موجودی:</Typography>
                      <Chip label={totalItems} color="info" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>تعداد انبارها:</Typography>
                      <Chip label={warehouses.length} color="secondary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>تعداد داروها:</Typography>
                      <Chip label={drugs.length} color="success" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    هشدارها
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>منقضی شده:</Typography>
                      <Chip label={expiredItems} color="error" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>نزدیک به انقضا (کمتر از 90 روز):</Typography>
                      <Chip label={expiringSoon} color="warning" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>موجودی کم (کمتر از 50):</Typography>
                      <Chip label={safeReportData.filter(i => i.quantity < 50).length} color="warning" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <CompareArrowsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    آمار حواله‌ها
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="warning.main">
                          {safeTransfers.filter(t => t.status === 'pending').length}
                        </Typography>
                        <Typography variant="body2">در انتظار تایید</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="success.main">
                          {safeTransfers.filter(t => t.status === 'confirmed').length}
                        </Typography>
                        <Typography variant="body2">تایید شده</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="error.main">
                          {safeTransfers.filter(t => t.status === 'rejected').length}
                        </Typography>
                        <Typography variant="body2">رد شده</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="info.main">
                          {safeTransfers.filter(t => t.status === 'mismatch').length}
                        </Typography>
                        <Typography variant="body2">عدم تطابق</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default ComprehensiveReports;
