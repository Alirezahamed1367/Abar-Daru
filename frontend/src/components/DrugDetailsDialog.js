import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, Avatar, Chip } from '@mui/material';

function DrugDetailsDialog({ open, onClose, drug }) {
  if (!drug) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>جزئیات دارو</DialogTitle>
      <DialogContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={drug.image} sx={{ width: 80, height: 80 }} />
          <Box>
            <Typography variant="h6">{drug.name}</Typography>
            <Typography variant="body2">دوز: {drug.dose || '-'}</Typography>
            <Typography variant="body2">نوع بسته‌بندی: {drug.package_type || '-'}</Typography>
            <Typography variant="body2">توضیحات: {drug.description || '-'}</Typography>
            {drug.has_expiry_date === true ? (
              <Typography variant="body2" color="primary">✅ دارای تاریخ انقضا</Typography>
            ) : (
              <Chip label="کالای بدون تاریخ انقضا" color="warning" size="small" sx={{ mt: 1 }} />
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default DrugDetailsDialog;
