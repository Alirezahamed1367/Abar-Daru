import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper, Avatar, Divider, Chip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { getLogs } from '../utils/api';

function OperationLogPanel() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    getLogs().then(res => {
        // Sort logs by id descending (newest first) if not already sorted
        const sortedLogs = res.data.sort((a, b) => b.id - a.id);
        setLogs(sortedLogs);
    }).catch(err => console.error(err));
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'start', minHeight: '80vh', bgcolor: '#f5f5f5', pt: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 800, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
            <HistoryIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
            تاریخچه عملیات سیستم
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لیست آخرین فعالیت‌های انجام شده توسط کاربران
          </Typography>
        </Box>
        
        {logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">هنوز هیچ عملیاتی ثبت نشده است.</Typography>
            </Box>
        ) : (
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {logs.map((log, idx) => (
                <React.Fragment key={log.id || idx}>
                <ListItem alignItems="flex-start">
                    <ListItemText
                    primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight="bold">
                                {log.action}
                            </Typography>
                            <Chip label={log.timestamp} size="small" variant="outlined" />
                        </Box>
                    }
                    secondary={
                        <React.Fragment>
                        <Typography
                            sx={{ display: 'inline', mt: 1 }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                        >
                            کاربر: {log.user ? log.user.username : 'سیستم'}
                        </Typography>
                        <br />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {log.details}
                        </Typography>
                        </React.Fragment>
                    }
                    />
                </ListItem>
                {idx < logs.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
            ))}
            </List>
        )}
      </Paper>
    </Box>
  );
}

export default OperationLogPanel;
