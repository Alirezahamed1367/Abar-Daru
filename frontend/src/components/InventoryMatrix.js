import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, MenuItem, Grid, Chip, Button, Autocomplete, Tabs, Tab } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import InventoryIcon from '@mui/icons-material/Inventory';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import BuildIcon from '@mui/icons-material/Build';
import { getWarehouses, getDrugs, getInventory } from '../utils/api';
import { getExpirationColor, getDaysUntilExpiration } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';
import jsPDF from 'jspdf';

function InventoryMatrix() {
  const { settings, loading: settingsLoading } = useSettings();
  const [tabValue, setTabValue] = useState(0); // 0 = داروها, 1 = ابزارها
  const [warehouses, setWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [tools, setTools] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [toolInventory, setToolInventory] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterDrug, setFilterDrug] = useState('');
  const [filterTool, setFilterTool] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, drugRes, invRes, toolRes, toolInvRes] = await Promise.all([
        getWarehouses(),
        getDrugs(),
        getInventory(),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/tools`).then(r => r.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/tool-inventory`).then(r => r.json())
      ]);
      setWarehouses(whRes.data);
      setDrugs(drugRes.data);
      setInventory(invRes.data);
      setTools(toolRes);
      setToolInventory(toolInvRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0 && drugs.length && warehouses.length) {
      // ماتریس داروها
      let data = drugs.map(drug => {
        const row = { id: drug.id, item_name: drug.name };
        let rowTotal = 0;
        
        // Find all inventory items for this drug
        const drugInventory = inventory.filter(inv => inv.drug_id === drug.id);
        
        // Find nearest expiration date
        let minExpire = null;
        drugInventory.forEach(inv => {
            if (inv.expire_date) {
                if (!minExpire || inv.expire_date < minExpire) {
                    minExpire = inv.expire_date;
                }
            }
        });
        row['min_expire'] = minExpire;

        warehouses.forEach(wh => {
          // Sum quantity for this drug in this warehouse (across all expiration dates)
          const totalQty = drugInventory
            .filter(inv => inv.warehouse_id === wh.id)
            .reduce((sum, inv) => sum + inv.quantity, 0);
          row[`wh_${wh.id}`] = totalQty;
          rowTotal += totalQty;
        });
        row['total'] = rowTotal;
        return row;
      });

      if (filterDrug) {
        data = data.filter(d => d.id === filterDrug);
      }

      // Calculate column totals
      const totalRow = { id: 'TOTAL', item_name: 'مجموع کل' };
      let grandTotal = 0;
      warehouses.forEach(wh => {
        const colTotal = data.reduce((sum, row) => sum + (row[`wh_${wh.id}`] || 0), 0);
        totalRow[`wh_${wh.id}`] = colTotal;
        grandTotal += colTotal;
      });
      totalRow['total'] = grandTotal;

      setMatrixData([...data, totalRow]);
    } else if (tabValue === 1 && tools.length && warehouses.length) {
      // ماتریس ابزارها
      let data = tools.map(tool => {
        const row = { id: tool.id, item_name: `${tool.name} (S/N: ${tool.serial_number})` };
        let rowTotal = 0;
        
        // Find all inventory items for this tool
        const currentToolInventory = toolInventory.filter(inv => inv.tool_id === tool.id);

        warehouses.forEach(wh => {
          // Sum quantity for this tool in this warehouse
          const totalQty = currentToolInventory
            .filter(inv => inv.warehouse_id === wh.id)
            .reduce((sum, inv) => sum + inv.quantity, 0);
          row[`wh_${wh.id}`] = totalQty;
          rowTotal += totalQty;
        });
        row['total'] = rowTotal;
        return row;
      });

      if (filterTool) {
        data = data.filter(d => d.id === filterTool);
      }

      // Calculate column totals
      const totalRow = { id: 'TOTAL', item_name: 'مجموع کل' };
      let grandTotal = 0;
      warehouses.forEach(wh => {
        const colTotal = data.reduce((sum, row) => sum + (row[`wh_${wh.id}`] || 0), 0);
        totalRow[`wh_${wh.id}`] = colTotal;
        grandTotal += colTotal;
      });
      totalRow['total'] = grandTotal;

      setMatrixData([...data, totalRow]);
    }
  }, [drugs, tools, warehouses, inventory, toolInventory, filterDrug, filterTool, tabValue]);

  const columns = [
    { 
        field: 'item_name', 
        headerName: tabValue === 0 ? 'نام دارو' : 'نام ابزار', 
        flex: 1,
        minWidth: 200,
        resizable: true,
        pinned: 'right',
        renderCell: (params) => {
            const expireDate = tabValue === 0 ? params.row.min_expire : null;
            const color = expireDate ? getExpirationColor(expireDate, settings.exp_warning_days) : 'inherit';
            return (
                <Typography 
                    fontWeight="bold" 
                    sx={{ color: color }}
                >
                    {params.value}
                </Typography>
            );
        }
    },
    ...warehouses.map(wh => ({
      field: `wh_${wh.id}`,
      headerName: wh.name,
      flex: 0.8,
      minWidth: 120,
      resizable: true,
      type: 'number',
      renderCell: (params) => (
        <Typography fontWeight={params.value > 0 ? 'bold' : 'normal'} color={params.value > 0 ? 'primary' : 'text.secondary'}>
          {params.value}
        </Typography>
      )
    })),
    {
      field: 'total',
      headerName: 'مجموع کل',
      flex: 0.8,
      minWidth: 120,
      resizable: true,
      type: 'number',
      renderCell: (params) => (
        <Typography fontWeight="bold" color="secondary">
          {params.value}
        </Typography>
      )
    }
  ];

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape mode

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    // Title
    doc.setFontSize(16);
    doc.text('Matrix Inventory Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Filter info
    doc.setFontSize(10);
    if (filterDrug) {
      const drugName = drugs.find(d => d.id === filterDrug)?.name || '';
      doc.text(`Drug: ${drugName}`, pageWidth - margin, y, { align: 'right' });
      y += 7;
    }
    
    doc.text(`Date: ${new Date().toLocaleDateString('fa-IR')}`, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // Table
    const dataForPDF = matrixData.filter(row => row.id !== 'TOTAL');
    const totalRow = matrixData.find(row => row.id === 'TOTAL');

    // Calculate column widths
    const availableWidth = pageWidth - 2 * margin;
    const drugColWidth = 60;
    const numCols = warehouses.length + 1; // warehouses + total
    const otherColWidth = (availableWidth - drugColWidth) / numCols;

    // Header
    doc.setFillColor(79, 70, 229); // Primary color
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    
    let x = pageWidth - margin;
    
    // Total column header
    doc.rect(x - otherColWidth, y, otherColWidth, 8, 'F');
    doc.text('Total', x - otherColWidth / 2, y + 5.5, { align: 'center' });
    x -= otherColWidth;
    
    // Warehouse columns headers
    warehouses.slice().reverse().forEach(wh => {
      doc.rect(x - otherColWidth, y, otherColWidth, 8, 'F');
      doc.text(wh.name, x - otherColWidth / 2, y + 5.5, { align: 'center' });
      x -= otherColWidth;
    });
    
    // Drug name header
    doc.rect(margin, y, drugColWidth, 8, 'F');
    doc.text('Drug Name', margin + drugColWidth / 2, y + 5.5, { align: 'center' });
    
    y += 8;

    // Data rows
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    dataForPDF.forEach((row, index) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
        
        // Repeat header on new page
        doc.setFillColor(79, 70, 229);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        
        x = pageWidth - margin;
        doc.rect(x - otherColWidth, y, otherColWidth, 8, 'F');
        doc.text('Total', x - otherColWidth / 2, y + 5.5, { align: 'center' });
        x -= otherColWidth;
        
        warehouses.slice().reverse().forEach(wh => {
          doc.rect(x - otherColWidth, y, otherColWidth, 8, 'F');
          doc.text(wh.name, x - otherColWidth / 2, y + 5.5, { align: 'center' });
          x -= otherColWidth;
        });
        
        doc.rect(margin, y, drugColWidth, 8, 'F');
        doc.text('Drug Name', margin + drugColWidth / 2, y + 5.5, { align: 'center' });
        
        y += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
      }

      // Row background (alternating)
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, availableWidth, 7, 'F');
      }

      x = pageWidth - margin;
      
      // Total
      doc.text(String(row.total || 0), x - otherColWidth / 2, y + 5, { align: 'center' });
      x -= otherColWidth;
      
      // Warehouse quantities
      warehouses.slice().reverse().forEach(wh => {
        const qty = row[`wh_${wh.id}`] || 0;
        doc.text(String(qty), x - otherColWidth / 2, y + 5, { align: 'center' });
        x -= otherColWidth;
      });
      
      // Drug name
      doc.text(row.item_name, margin + 2, y + 5);
      
      y += 7;
    });

    // Total row
    if (totalRow) {
      y += 2;
      doc.setFillColor(79, 70, 229);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.rect(margin, y, availableWidth, 8, 'F');
      
      x = pageWidth - margin;
      doc.text(String(totalRow.total || 0), x - otherColWidth / 2, y + 5.5, { align: 'center' });
      x -= otherColWidth;
      
      warehouses.slice().reverse().forEach(wh => {
        const qty = totalRow[`wh_${wh.id}`] || 0;
        doc.text(String(qty), x - otherColWidth / 2, y + 5.5, { align: 'center' });
        x -= otherColWidth;
      });
      
      doc.text('Grand Total', margin + drugColWidth / 2, y + 5.5, { align: 'center' });
    }

    doc.save(`matrix-inventory-${new Date().toLocaleDateString('fa-IR')}.pdf`);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
          <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            موجودی تجمیعی انبارها (ماتریسی)
          </Typography>
        </Box>

        {/* Tabs for Drug/Tool */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => { setTabValue(newValue); setFilterDrug(''); setFilterTool(''); }} aria-label="drug and tool inventory">
            <Tab 
              icon={<LocalPharmacyIcon />} 
              iconPosition="start" 
              label="موجودی داروها" 
              sx={{ fontWeight: 'bold' }}
            />
            <Tab 
              icon={<BuildIcon />} 
              iconPosition="start" 
              label="موجودی ابزارها" 
              sx={{ fontWeight: 'bold' }}
            />
          </Tabs>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            {tabValue === 0 ? (
              <Autocomplete
                options={drugs}
                getOptionLabel={(option) => option.name}
                value={drugs.find(d => d.id === filterDrug) || null}
                onChange={(event, newValue) => {
                  setFilterDrug(newValue ? newValue.id : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="فیلتر بر اساس دارو"
                    placeholder="جستجو..."
                  />
                )}
                noOptionsText="داروی یافت نشد"
                fullWidth
              />
            ) : (
              <Autocomplete
                options={tools}
                getOptionLabel={(option) => `${option.name} (S/N: ${option.serial_number})`}
                value={tools.find(t => t.id === filterTool) || null}
                onChange={(event, newValue) => {
                  setFilterTool(newValue ? newValue.id : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="فیلتر بر اساس ابزار"
                    placeholder="جستجو..."
                  />
                )}
                noOptionsText="ابزاری یافت نشد"
                fullWidth
              />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPDF}
              fullWidth
              sx={{ height: 56 }}
            >
              دریافت PDF
            </Button>
          </Grid>
        </Grid>

        <DataGrid
          rows={matrixData}
          columns={columns}
          loading={loading}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableSelectionOnClick
          columnVisibilityModel={{}}
          onColumnVisibilityModelChange={(newModel) => {
            // Save column visibility preferences
          }}
          sx={{ 
            direction: 'rtl',
            height: 600,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'primary.lighter',
              fontWeight: 'bold',
              position: 'sticky',
              top: 0,
              zIndex: 10
            },
            '& .MuiDataGrid-columnSeparator': {
              visibility: 'visible'
            }
          }}
          initialState={{
            columns: {
              columnVisibilityModel: {},
            },
          }}
        />
      </Paper>
    </Box>
  );
}

export default InventoryMatrix;
