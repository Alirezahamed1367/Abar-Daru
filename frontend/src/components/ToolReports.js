import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Grid, Chip
} from '@mui/material';
import { DataGrid, faIR } from '@mui/x-data-grid';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BuildIcon from '@mui/icons-material/Build';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

function ToolReports() {
  const [tools, setTools] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterTool, setFilterTool] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  useEffect(() => {
    fetchBasicData();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filterWarehouse, filterTool, filterSupplier]);

  const fetchBasicData = async () => {
    try {
      const [toolsRes, whRes, supplierRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tools`),
        axios.get(`${API_BASE_URL}/warehouses`),
        axios.get(`${API_BASE_URL}/suppliers`)
      ]);
      setTools(toolsRes.data);
      setWarehouses(whRes.data);
      setSuppliers(supplierRes.data);
    } catch (err) {
      console.error('Error fetching basic data:', err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterWarehouse) params.warehouse_id = filterWarehouse;
      if (filterTool) params.tool_id = filterTool;
      if (filterSupplier) params.supplier_id = filterSupplier;

      const res = await axios.get(`${API_BASE_URL}/tool-inventory/report`, { params });
      setReportData(res.data);
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = {};
      if (filterWarehouse) params.warehouse_id = filterWarehouse;
      if (filterTool) params.tool_id = filterTool;
      if (filterSupplier) params.supplier_id = filterSupplier;

      const response = await axios.get(`${API_BASE_URL}/export-pdf`, {
        params: { ...params, item_type: 'tool' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tool-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('خطا در دریافت گزارش PDF');
    }
  };

  const columns = [
    {
      field: 'tool',
      headerName: 'ابزار',
      flex: 1,
      minWidth: 180,
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
    {
      field: 'warehouse_id',
      headerName: 'انبار',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const wh = warehouses.find(w => w.id === params.row.warehouse_id);
        return wh ? wh.name : '-';
      }
    },
    {
      field: 'supplier_id',
      headerName: 'تامین‌کننده',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const sup = suppliers.find(s => s.id === params.row.supplier_id);
        return sup ? sup.name : '-';
      }
    },
    {
      field: 'quantity',
      headerName: 'موجودی',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value > 0 ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      )
    }
  ];

  const totalQuantity = reportData.reduce((sum, row) => sum + (row.quantity || 0), 0);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <BuildIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            گزارش جامع ابزارها
          </Typography>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="فیلتر انبار"
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
            >
              <MenuItem value="">همه انبارها</MenuItem>
              {warehouses.map(wh => (
                <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="فیلتر ابزار"
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
            >
              <MenuItem value="">همه ابزارها</MenuItem>
              {tools.map(tool => (
                <MenuItem key={tool.id} value={tool.id}>
                  {tool.name} (S/N: {tool.serial_number})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="فیلتر تامین‌کننده"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <MenuItem value="">همه تامین‌کنندگان</MenuItem>
              {suppliers.map(sup => (
                <MenuItem key={sup.id} value={sup.id}>{sup.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* Export Button */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            مجموع موجودی: <Chip label={totalQuantity} color="primary" size="medium" sx={{ fontWeight: 'bold', fontSize: '1rem' }} />
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
          >
            دریافت PDF
          </Button>
        </Box>

        {/* Data Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={reportData}
            columns={columns}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[25, 50, 100]}
            disableSelectionOnClick
            localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
              }
            }}
            getRowId={(row) => `${row.warehouse_id}-${row.tool_id}-${row.supplier_id}`}
          />
        </Box>
      </Paper>
    </Box>
  );
}

export default ToolReports;
