import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, TextField, MenuItem, Grid } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import BackupIcon from '@mui/icons-material/Backup';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import { exportExcel, exportPDF, backupDB, getWarehouses, getDrugs, getSuppliers, getInventoryReport } from '../utils/api';
import { getDaysUntilExpiration } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';

function ReportExport() {
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [reportData, setReportData] = useState([]);
  
  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedDrug, setSelectedDrug] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    getWarehouses().then(res => setWarehouses(res.data));
    getDrugs().then(res => setDrugs(res.data));
    getSuppliers().then(res => setSuppliers(res.data));
  }, []);

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
      setReportData(res.data);
    } catch (err) {
      console.error(err);
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

  const handleBackup = async () => {
    await backupDB();
    alert('بکاپ دیتابیس انجام شد');
  };

  const columns = [
    { field: 'id', headerName: 'شناسه', flex: 0.3, minWidth: 70, resizable: true },
    { 
      field: 'warehouse_id', 
      headerName: 'انبار', 
      flex: 1,
      minWidth: 150,
      resizable: true,
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
      resizable: true,
      valueGetter: (params) => {
        const d = drugs.find(d => d.id === params.row.drug_id);
        return d ? d.name : params.row.drug_id;
      }
    },
    { 
      field: 'supplier_id', 
      headerName: 'تامین کننده', 
      flex: 1,
      minWidth: 150,
      resizable: true,
      valueGetter: (params) => {
        const s = suppliers.find(s => s.id === params.row.supplier_id);
        return s ? s.name : (params.row.supplier_id || '-');
      }
    },
    { field: 'expire_date', headerName: 'تاریخ انقضا', flex: 0.7, minWidth: 120, resizable: true },
    { field: 'quantity', headerName: 'تعداد', flex: 0.5, minWidth: 100, resizable: true },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '80vh' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
          گزارشات پیشرفته و خروجی
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={2}>
            <TextField
              label="از تاریخ انقضا"
              placeholder="YYYY/MM"
              fullWidth
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="تا تاریخ انقضا"
              placeholder="YYYY/MM"
              fullWidth
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />} 
              fullWidth 
              onClick={handleSearch}
              sx={{ height: '56px' }}
            >
              نمایش گزارش
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="error" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF}>
            دانلود PDF
          </Button>
          <Button variant="outlined" color="success" startIcon={<TableViewIcon />} onClick={handleExportExcel}>
            دانلود Excel
          </Button>
          <Button variant="contained" color="secondary" startIcon={<BackupIcon />} onClick={handleBackup}>
            بکاپ دیتابیس
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <DataGrid
          rows={reportData}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          getRowClassName={(params) => {
            if (!params.row.expire_date) return '';
            const days = getDaysUntilExpiration(params.row.expire_date);
            if (days === null) return '';
            if (days < 0) return 'row-expired';
            if (days < 30) return 'row-critical';
            if (days < settings.exp_warning_days) return 'row-warning';
            return '';
          }}
          sx={{ 
            direction: 'rtl',
            '& .row-expired': {
              bgcolor: '#ffebee',
              '&:hover': { bgcolor: '#ffcdd2' }
            },
            '& .row-critical': {
              bgcolor: '#ffe0b2',
              '&:hover': { bgcolor: '#ffcc80' }
            },
            '& .row-warning': {
              bgcolor: '#fff9c4',
              '&:hover': { bgcolor: '#fff59d' }
            },
          }}
        />
      </Paper>
    </Box>
  );
}

export default ReportExport;
