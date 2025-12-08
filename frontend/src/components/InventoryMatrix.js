import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, MenuItem, Grid, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import InventoryIcon from '@mui/icons-material/Inventory';
import { getWarehouses, getDrugs, getInventory } from '../utils/api';
import { getExpirationColor, getDaysUntilExpiration } from '../utils/expirationUtils';
import { useSettings } from '../utils/SettingsContext';

function InventoryMatrix() {
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterDrug, setFilterDrug] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, drugRes, invRes] = await Promise.all([
        getWarehouses(),
        getDrugs(),
        getInventory()
      ]);
      setWarehouses(whRes.data);
      setDrugs(drugRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (drugs.length && warehouses.length) {
      let data = drugs.map(drug => {
        const row = { id: drug.id, drug_name: drug.name };
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
      const totalRow = { id: 'TOTAL', drug_name: 'مجموع کل' };
      let grandTotal = 0;
      warehouses.forEach(wh => {
        const colTotal = data.reduce((sum, row) => sum + (row[`wh_${wh.id}`] || 0), 0);
        totalRow[`wh_${wh.id}`] = colTotal;
        grandTotal += colTotal;
      });
      totalRow['total'] = grandTotal;

      setMatrixData([...data, totalRow]);
    }
  }, [drugs, warehouses, inventory, filterDrug]);

  const columns = [
    { 
        field: 'drug_name', 
        headerName: 'نام دارو', 
        flex: 1,
        minWidth: 200,
        resizable: true,
        pinned: 'right',
        renderCell: (params) => {
            const expireDate = params.row.min_expire;
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

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={3} flexWrap="wrap">
          <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            موجودی تجمیعی انبارها (ماتریسی)
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="فیلتر بر اساس دارو"
              fullWidth
              value={filterDrug}
              onChange={(e) => setFilterDrug(e.target.value)}
            >
              <MenuItem value="">همه داروها</MenuItem>
              {drugs.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <DataGrid
          rows={matrixData}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableSelectionOnClick
          columnVisibilityModel={{}}
          onColumnVisibilityModelChange={(newModel) => {
            // Save column visibility preferences
          }}
          sx={{ 
            direction: 'rtl',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'primary.lighter',
              fontWeight: 'bold'
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
