import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Autocomplete
} from '@mui/material';
import moment from 'jalali-moment';

function InventoryDialog({ open, onClose, warehouses, drugs, suppliers, onSubmit, editData = null }) {
  const [warehouseId, setWarehouseId] = useState(editData?.warehouse_id || '');
  const [drugId, setDrugId] = useState(editData?.drug_id || '');
  const [supplierId, setSupplierId] = useState(editData?.supplier_id || '');
  const [quantity, setQuantity] = useState(editData?.quantity || '');
  const [expire, setExpire] = useState(editData?.expire_date || '');
  const [entryDate, setEntryDate] = useState(editData?.entry_date || moment().locale('fa').format('YYYY/MM/DD'));
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (editData) {
      setWarehouseId(editData.warehouse_id || '');
      setDrugId(editData.drug_id || '');
      setSupplierId(editData.supplier_id || '');
      setQuantity(editData.quantity || '');
      setExpire(editData.expire_date || '');
      setEntryDate(editData.entry_date || moment().locale('fa').format('YYYY/MM/DD'));
    } else {
      // Reset for new entry
      setWarehouseId('');
      setDrugId('');
      setSupplierId('');
      setQuantity('');
      setExpire('');
      setEntryDate(moment().locale('fa').format('YYYY/MM/DD'));
    }
    setError('');
  }, [editData, open]);

  const handleSubmit = () => {
    // Get selected drug to check if it requires expiry date
    const selectedDrug = drugs.find(d => d.id === drugId);
    const requiresExpiry = selectedDrug?.has_expiry_date === true;
    
    // Validate fields
    if (!warehouseId || !drugId || !supplierId || !quantity || !entryDate) {
      setError('لطفا تمام فیلدها را پر کنید');
      return;
    }
    
    // Check expiry date only if drug requires it
    if (requiresExpiry && !expire) {
      setError('تاریخ انقضا برای این دارو الزامی است');
      return;
    }
    
    const data = {
      warehouse_id: warehouseId,
      drug_id: drugId,
      supplier_id: supplierId,
      quantity: parseInt(quantity),
      expire_date: expire || null,
      entry_date: entryDate,
    };
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
        {editData ? '✏️ ویرایش رسید' : '📦 ثبت رسید جدید'}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="انبار"
              fullWidth
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              disabled={!!editData}
            >
              {warehouses.map((wh) => (
                <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={drugs}
              getOptionLabel={(option) => option.name || ''}
              value={drugs.find(d => d.id === drugId) || null}
              onChange={(event, newValue) => {
                setDrugId(newValue ? newValue.id : '');
              }}
              disabled={!!editData}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                const searchTerm = inputValue.toLowerCase();
                return options.filter(option =>
                  option.name.toLowerCase().includes(searchTerm)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="نام دارو"
                  placeholder="حداقل 3 حرف وارد کنید..."
                  helperText="جستجو در هر قسمت از نام دارو"
                />
              )}
              noOptionsText="دارویی یافت نشد"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="تامین‌کننده"
              fullWidth
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
            >
              {suppliers.map((sup) => (
                <MenuItem key={sup.id} value={sup.id}>{sup.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField 
              label="تعداد" 
              type="number" 
              fullWidth
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField 
              label="تاریخ ثبت (شمسی)" 
              placeholder="1403/09/14"
              fullWidth
              value={entryDate} 
              onChange={e => setEntryDate(e.target.value)} 
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            {(() => {
              const selectedDrug = drugs.find(d => d.id === drugId);
              const requiresExpiry = selectedDrug?.has_expiry_date === true;
              
              return (
                <TextField 
                  label={requiresExpiry ? "تاریخ انقضا (YYYY-MM) *" : "تاریخ انقضا (YYYY-MM) - اختیاری"}
                  placeholder="2026-08"
                  fullWidth
                  value={expire} 
                  onChange={e => setExpire(e.target.value)}
                  disabled={!!editData || !requiresExpiry}
                  helperText={!requiresExpiry ? "این کالا نیازی به تاریخ انقضا ندارد" : ""}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: !requiresExpiry ? '#f5f5f5' : 'inherit'
                    }
                  }}
                />
              );
            })()}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} color="inherit">
          انصراف
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {editData ? 'ویرایش' : 'ثبت رسید'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InventoryDialog;
