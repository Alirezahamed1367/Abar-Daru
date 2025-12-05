import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText, Paper, Avatar, Divider, Chip,
  IconButton, Collapse, Tooltip
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import { getLogs } from '../utils/api';

function OperationLogPanel() {
  const [logs, setLogs] = useState([]);
  const [expandedLogs, setExpandedLogs] = useState({});
  
  useEffect(() => {
    getLogs().then(res => {
        setLogs(res.data);
    }).catch(err => console.error(err));
  }, []);

  const toggleExpand = (logId) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getUserDisplay = (log) => {
    if (log.user) {
      return log.user.full_name || log.user.username;
    }
    return 'سیستم';
  };

  const getUserColor = (log) => {
    if (!log.user) return 'default';
    const username = log.user.username;
    if (username === 'superadmin') return 'error';
    if (username === 'admin') return 'warning';
    return 'primary';
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'start', minHeight: '80vh', bgcolor: '#f5f5f5', pt: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 900, width: '100%' }}>
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
            {logs.map((log, idx) => {
                const isExpanded = expandedLogs[log.id];
                const hasLongDetails = log.details && log.details.length > 60;
                
                return (
                <React.Fragment key={log.id || idx}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.2s'
                  }}
                >
                    <ListItemText
                    primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                  {log.action}
                              </Typography>
                              <Tooltip title={`کاربر: ${getUserDisplay(log)}`}>
                                <Chip 
                                  icon={<PersonIcon fontSize="small" />}
                                  label={getUserDisplay(log)} 
                                  size="small" 
                                  color={getUserColor(log)}
                                  variant="outlined"
                                />
                              </Tooltip>
                            </Box>
                            <Chip label={log.timestamp} size="small" variant="outlined" color="default" />
                        </Box>
                    }
                    secondary={
                        <React.Fragment>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {isExpanded ? log.details : truncateText(log.details, 60)}
                        </Typography>
                        {hasLongDetails && (
                          <IconButton 
                            size="small" 
                            onClick={() => toggleExpand(log.id)}
                            sx={{ mt: 0.5 }}
                          >
                            {isExpanded ? (
                              <>
                                <ExpandLessIcon fontSize="small" />
                                <Typography variant="caption" sx={{ ml: 0.5 }}>کمتر</Typography>
                              </>
                            ) : (
                              <>
                                <ExpandMoreIcon fontSize="small" />
                                <Typography variant="caption" sx={{ ml: 0.5 }}>بیشتر</Typography>
                              </>
                            )}
                          </IconButton>
                        )}
                        </React.Fragment>
                    }
                    />
                </ListItem>
                {idx < logs.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              );
            })}
            </List>
        )}
      </Paper>
    </Box>
  );
}

export default OperationLogPanel;
