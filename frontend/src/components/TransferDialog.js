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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Chip
} from '@mui/material';
import moment from 'jalali-moment';
import { getDaysUntilExpiration, getExpirationColor } from '../utils/expirationUtils';
import { filterWarehousesByAccess } from '../utils/permissions';
import { useSettings } from '../utils/SettingsContext';

function TransferDialog({ 
  open, 
  onClose, 
  warehouses, 
  drugs, 
  inventory, 
  consumers, 
  onSubmit,
  editData = null,
  currentUser = null
}) {
  const { settings } = useSettings();
  const [transferType, setTransferType] = useState(editData?.transfer_type || 'warehouse');
  const [sourceWarehouse, setSourceWarehouse] = useState(editData?.source_warehouse_id || '');
  const [destWarehouse, setDestWarehouse] = useState(editData?.destination_warehouse_id || '');
  const [consumerId, setConsumerId] = useState(editData?.consumer_id || '');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState(editData?.quantity_sent || '');
  const [transferDate, setTransferDate] = useState(editData?.transfer_date || moment().locale('fa').format('YYYY/MM/DD'));
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (editData) {
      setTransferType(editData.transfer_type || 'warehouse');
      setSourceWarehouse(editData.source_warehouse_id || '');
      setDestWarehouse(editData.destination_warehouse_id || '');
      setConsumerId(editData.consumer_id || '');
      setQuantity(editData.quantity_sent || '');
      setTransferDate(editData.transfer_date || moment().locale('fa').format('YYYY/MM/DD'));
      
      // Find matching inventory item
      const matchingInv = inventory.find(inv => 
        inv.warehouse_id === editData.source_warehouse_id &&
        inv.drug_id === editData.drug_id &&
        inv.expire_date === editData.expire_date
      );
      if (matchingInv) {
        setSelectedInventoryId(matchingInv.id);
      }
    } else {
      setTransferType('warehouse');
      setSourceWarehouse('');
      setDestWarehouse('');
      setConsumerId('');
      setSelectedInventoryId('');
      setQuantity('');
      setTransferDate(moment().locale('fa').format('YYYY/MM/DD'));
    }
    setError('');
  }, [editData, open, inventory]);

  const availableInventory = inventory.filter(
    inv => inv.warehouse_id === parseInt(sourceWarehouse) && inv.quantity > 0
  ).sort((a, b) => {
    // Sort by expiration date: closest to expiry (or expired) first
    const daysA = getDaysUntilExpiration(a.expire_date);
    const daysB = getDaysUntilExpiration(b.expire_date);
    if (daysA === null) return 1; // Items without expiry date go to end
    if (daysB === null) return -1;
    return daysA - daysB; // Ascending: expired/closest first
  });

  // DEBUG: Log filtering
  React.useEffect(() => {
    if (sourceWarehouse) {
      console.log('=== INVENTORY FILTER DEBUG ===');
      console.log('Source warehouse:', sourceWarehouse, typeof sourceWarehouse);
      console.log('Total inventory items:', inventory.length);
      console.log('Filtered available inventory:', availableInventory.length);
      if (availableInventory.length > 0) {
        console.log('Sample available item:', availableInventory[0]);
      }
    }
  }, [sourceWarehouse, inventory]);

  // DEBUG: Log inventory filtering
  React.useEffect(() => {
    if (sourceWarehouse) {
      console.log('=== TransferDialog DEBUG ===');
      console.log('Source Warehouse ID:', sourceWarehouse, 'Type:', typeof sourceWarehouse);
      console.log('All inventory count:', inventory.length);
      console.log('Available inventory count:', availableInventory.length);
      console.log('Available inventory:', availableInventory.map(inv => ({
        id: inv.id,
        warehouse_id: inv.warehouse_id,
        drug_id: inv.drug_id,
        quantity: inv.quantity,
        expire_date: inv.expire_date
      })));
    }
  }, [sourceWarehouse, inventory, availableInventory]);

  console.log('DEBUG - Source Warehouse ID:', sourceWarehouse);
  console.log('DEBUG - Available Inventory:', availableInventory);

  // Get total inventory across all warehouses for selected drug + expire_date
  const getTotalInventoryInfo = (drugId, expireDate) => {
    const allInventories = inventory.filter(
      inv => inv.drug_id === drugId && inv.expire_date === expireDate
    );
    
    const byWarehouse = allInventories.map(inv => {
      const wh = warehouses.find(w => w.id === inv.warehouse_id);
      return {
        warehouseName: wh?.name || 'نامشخص',
        quantity: inv.quantity
      };
    }).filter(item => item.quantity > 0);
    
    const totalQty = byWarehouse.reduce((sum, item) => sum + item.quantity, 0);
    
    return { byWarehouse, totalQty };
  };

  const handleSubmit = () => {
    if (!selectedInventoryId || !quantity || !sourceWarehouse) {
      setError('لطفا تمام فیلدها را پر کنید');
      return;
    }

    if (transferType === 'warehouse' && !destWarehouse) {
      setError('لطفا انبار مقصد را انتخاب کنید');
      return;
    }

    if (transferType === 'consumer' && !consumerId) {
      setError('لطفا مصرف‌کننده را انتخاب کنید');
      return;
    }
    
    // Disposal transfers don't need destination
    if (transferType === 'disposal') {
      // Optional: Add confirmation dialog
      if (!window.confirm('آیا از معدوم سازی این دارو اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
        return;
      }
    }

    const selectedInv = availableInventory.find(inv => inv.id === parseInt(selectedInventoryId));
    if (!selectedInv) {
      console.error('=== ERROR: Selected inventory not found ===');
      console.error('Selected inventory ID:', selectedInventoryId);
      console.error('Available inventory IDs:', availableInventory.map(inv => inv.id));
      console.error('Source warehouse:', sourceWarehouse);
      setError('موجودی انتخاب‌شده یافت نشد');
      return;
    }

    console.log('=== DEBUG TRANSFER ===');
    console.log('Selected inventory:', selectedInv);
    console.log('Selected inventory ID:', selectedInventoryId);
    console.log('Source warehouse ID:', sourceWarehouse);
    console.log('Selected inv warehouse_id:', selectedInv.warehouse_id);
    console.log('Quantity requested:', quantity);
    console.log('Available quantity:', selectedInv.quantity);
    console.log('Warehouse ID in selectedInv:', selectedInv.warehouse_id);
    console.log('Source Warehouse ID:', sourceWarehouse);
    console.log('Quantity in selectedInv:', selectedInv.quantity);
    console.log('Requested quantity:', quantity);
    console.log('Expire date:', selectedInv.expire_date);

    if (parseInt(quantity) > selectedInv.quantity) {
      const sourceWh = warehouses.find(w => w.id === parseInt(sourceWarehouse));
      const drug = drugs.find(d => d.id === selectedInv.drug_id);
      setError(`تعداد درخواستی (${quantity}) بیشتر از موجودی ${sourceWh?.name || 'انبار مبدا'} است (موجودی: ${selectedInv.quantity} ${drug?.name || 'عدد'})`);
      return;
    }

    if (parseInt(quantity) <= 0) {
      setError('تعداد باید بیشتر از صفر باشد');
      return;
    }

    // For drugs without expiry date, send undefined (will be omitted from params)
    // Backend will treat missing expire_date as None
    const expireDate = selectedInv.expire_date || undefined;

    const data = {
      source_warehouse_id: sourceWarehouse,
      destination_warehouse_id: transferType === 'warehouse' ? destWarehouse : undefined,
      consumer_id: transferType === 'consumer' ? consumerId : undefined,
      drug_id: selectedInv.drug_id,
      expire_date: expireDate, // undefined if null
      quantity: parseInt(quantity),
      transfer_type: transferType,
      transfer_date: transferDate
    };

    console.log('Transfer data to submit:', data);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: 'secondary.main', color: 'white', fontWeight: 'bold' }}>
        {editData ? 'ویرایش حواله' : 'ثبت حواله جدید'}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">نوع حواله</FormLabel>
              <RadioGroup 
                row 
                value={transferType} 
                onChange={(e) => setTransferType(e.target.value)}
                disabled={!!editData}
              >
                <FormControlLabel value="warehouse" control={<Radio />} label="انتقال بین انبار" />
                <FormControlLabel value="consumer" control={<Radio />} label="تحویل به مصرف‌کننده" />
                <FormControlLabel 
                  value="disposal" 
                  control={<Radio />} 
                  label="معدوم سازی دارو" 
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: 'error.main',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </RadioGroup>
              {transferType === 'disposal' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  توجه: با تایید این حواله، داروی انتخابی از موجودی و گزارشات حذف می‌شود.
                </Alert>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="تاریخ حواله"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              fullWidth
              helperText="فرمت: YYYY/MM/DD"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              label="انبار مبدا"
              value={sourceWarehouse}
              onChange={(e) => setSourceWarehouse(e.target.value)}
              fullWidth
              disabled={!!editData}
            >
              {filterWarehousesByAccess(warehouses, currentUser).map((wh) => (
                <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            {transferType === 'warehouse' ? (
              <TextField
                select
                label="انبار مقصد"
                value={destWarehouse}
                onChange={(e) => setDestWarehouse(e.target.value)}
                fullWidth
                disabled={!!editData}
              >
                {warehouses.filter(w => !sourceWarehouse || w.id !== parseInt(sourceWarehouse)).map((wh) => (
                  <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>
                ))}
              </TextField>
            ) : transferType === 'consumer' ? (
              <TextField
                select
                label="مصرف‌کننده"
                value={consumerId}
                onChange={(e) => setConsumerId(e.target.value)}
                fullWidth
                disabled={!!editData}
              >
                {consumers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="info">
                داروی معدومی نیاز به مقصد ندارد
              </Alert>
            )}
          </Grid>

          <Grid item xs={12} md={8}>
            <Autocomplete
              options={availableInventory}
              getOptionLabel={(option) => {
                const drug = drugs.find(d => d.id === option.drug_id);
                const dose = drug?.dose ? `(${drug.dose})` : '';
                const expiryLabel = option.expire_date || 'بدون انقضا';
                const sourceWh = warehouses.find(w => w.id === parseInt(sourceWarehouse));
                return drug ? `${drug.name} ${dose} - انقضا: ${expiryLabel} - موجودی ${sourceWh?.name || 'انبار'}: ${option.quantity}` : 'Unknown';
              }}
              value={availableInventory.find(inv => inv.id === parseInt(selectedInventoryId)) || null}
              onChange={(event, newValue) => {
                setSelectedInventoryId(newValue ? newValue.id : '');
              }}
              disabled={!sourceWarehouse || !!editData}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                const searchTerm = inputValue.toLowerCase();
                return options.filter(option => {
                  const drug = drugs.find(d => d.id === option.drug_id);
                  return drug && drug.name.toLowerCase().includes(searchTerm);
                });
              }}
              renderOption={(props, option) => {
                const drug = drugs.find(d => d.id === option.drug_id);
                const dose = drug?.dose ? `(${drug.dose})` : '';
                const chipColor = getExpirationColor(option.expire_date, settings.exp_warning_days);
                const inventoryInfo = getTotalInventoryInfo(option.drug_id, option.expire_date);
                const sourceWh = warehouses.find(w => w.id === parseInt(sourceWarehouse));
                
                return (
                  <li {...props} key={option.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>{drug?.name || 'Unknown'}</strong> {dose}</span>
                        <Chip 
                          label={`موجودی این انبار: ${option.quantity}`} 
                          size="small" 
                          color="success" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Chip label={`انقضا: ${option.expire_date || 'ندارد'}`} size="small" color={chipColor} />
                        {inventoryInfo.totalQty > option.quantity && (
                          <Chip 
                            label={`کل موجودی: ${inventoryInfo.totalQty}`} 
                            size="small" 
                            color="default" 
                            variant="outlined"
                            title={inventoryInfo.byWarehouse.map(w => `${w.warehouseName}: ${w.quantity}`).join('\n')}
                          />
                        )}
                      </div>
                      {inventoryInfo.byWarehouse.length > 1 && (
                        <div style={{ fontSize: '0.75rem', color: '#666', paddingLeft: '8px' }}>
                          {inventoryInfo.byWarehouse.map((wh, idx) => (
                            <span key={idx} style={{ 
                              marginRight: '8px',
                              fontWeight: wh.warehouseName === sourceWh?.name ? 'bold' : 'normal',
                              color: wh.warehouseName === sourceWh?.name ? '#2e7d32' : '#666'
                            }}>
                              {wh.warehouseName}: {wh.quantity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={sourceWarehouse ? `انتخاب دارو (فقط موجودی ${warehouses.find(w => w.id === parseInt(sourceWarehouse))?.name || 'انبار مبدا'})` : "ابتدا انبار مبدا را انتخاب کنید"}
                  placeholder="حداقل 3 حرف وارد کنید..."
                  helperText={sourceWarehouse ? "داروهای منقضی/نزدیک به انقضا اول نمایش داده می‌شوند" : ""}
                />
              )}
              noOptionsText="دارویی در موجودی یافت نشد"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="تعداد"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} color="inherit">
          انصراف
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          {editData ? 'ویرایش' : 'ثبت حواله'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TransferDialog;
