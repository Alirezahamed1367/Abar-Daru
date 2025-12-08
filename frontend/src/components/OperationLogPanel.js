import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText, Paper, Avatar, Divider, Chip,
  IconButton, Collapse, Tooltip, TextField, Button, Grid, MenuItem, FormControl,
  InputLabel, Select
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getLogs, getUsers } from '../utils/api';
import moment from 'jalali-moment';

function OperationLogPanel() {
  const [allLogs, setAllLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedLogs, setExpandedLogs] = useState({});
  
  // Filter states
  const [showFilters, setShowFilters] = useState(true);
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  useEffect(() => {
    // Load users for filter dropdown
    getUsers().then(res => {
      setUsers(res.data);
    }).catch(err => console.error(err));
  }, []);

  const handleSearch = async () => {
    try {
      const res = await getLogs();
      let filtered = res.data;
      
      // Filter by date range - Convert Gregorian to Jalali for comparison
      if (filterFromDate) {
        filtered = filtered.filter(log => {
          // Convert log timestamp (Gregorian) to Jalali
          const logDateJalali = moment(log.timestamp, 'YYYY-MM-DD HH:mm:ss').locale('fa').format('YYYY/MM/DD');
          return logDateJalali >= filterFromDate;
        });
      }
      
      if (filterToDate) {
        filtered = filtered.filter(log => {
          // Convert log timestamp (Gregorian) to Jalali
          const logDateJalali = moment(log.timestamp, 'YYYY-MM-DD HH:mm:ss').locale('fa').format('YYYY/MM/DD');
          return logDateJalali <= filterToDate;
        });
      }
      
      // Filter by user
      if (filterUser) {
        filtered = filtered.filter(log => log.user_id === parseInt(filterUser));
      }
      
      // Filter by action
      if (filterAction) {
        filtered = filtered.filter(log => log.action.includes(filterAction));
      }
      
      setAllLogs(res.data);
      setFilteredLogs(filtered);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilterFromDate('');
    setFilterToDate('');
    setFilterUser('');
    setFilterAction('');
    setFilteredLogs([]);
    setHasSearched(false);
  };

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

  const formatTimestamp = (timestamp) => {
    // Convert Gregorian timestamp to Jalali
    return moment(timestamp, 'YYYY-MM-DD HH:mm:ss').locale('fa').format('YYYY/MM/DD HH:mm:ss');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'start', minHeight: '80vh', bgcolor: '#f5f5f5', pt: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, maxWidth: 1200, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
            <HistoryIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
            تاریخچه عملیات سیستم
          </Typography>
          <Typography variant="body2" color="text.secondary">
            فیلتر کنید و گزارش بگیرید
          </Typography>
        </Box>
        
        {/* Filter Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" color="primary">فیلترها</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="از تاریخ"
                placeholder="1403/09/15"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                helperText="فرمت: YYYY/MM/DD"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="تا تاریخ"
                placeholder="1403/09/20"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                helperText="فرمت: YYYY/MM/DD"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>کاربر</InputLabel>
                <Select
                  value={filterUser}
                  label="کاربر"
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <MenuItem value="">همه</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع عملیات</InputLabel>
                <Select
                  value={filterAction}
                  label="نوع عملیات"
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <MenuItem value="">همه</MenuItem>
                  <MenuItem value="Add">افزودن (Add)</MenuItem>
                  <MenuItem value="Update">ویرایش (Update)</MenuItem>
                  <MenuItem value="Delete">حذف (Delete)</MenuItem>
                  <MenuItem value="Create">ایجاد (Create)</MenuItem>
                  <MenuItem value="Confirm">تایید (Confirm)</MenuItem>
                  <MenuItem value="Reject">رد (Reject)</MenuItem>
                  <MenuItem value="Transfer">انتقال (Transfer)</MenuItem>
                  <MenuItem value="Login">ورود (Login)</MenuItem>
                  <MenuItem value="Logout">خروج (Logout)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={clearFilters}
                  disabled={!hasSearched}
                >
                  پاک کردن فیلترها
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                >
                  نمایش گزارش
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Results Section */}
        {!hasSearched ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              برای مشاهده گزارش، فیلترها را تنظیم کنید و دکمه "نمایش گزارش" را بزنید
            </Typography>
            <Typography variant="body2" color="text.disabled">
              اگر فیلتری انتخاب نکنید، تمام عملیات نمایش داده می‌شود
            </Typography>
          </Box>
        ) : filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">هیچ عملیاتی با فیلترهای انتخابی یافت نشد.</Typography>
            </Box>
        ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  تعداد نتایج: {filteredLogs.length} عملیات
                </Typography>
              </Box>
              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {filteredLogs.map((log, idx) => {
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
                            <Chip label={formatTimestamp(log.timestamp)} size="small" variant="outlined" color="default" />
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
                {idx < filteredLogs.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              );
            })}
            </List>
            </Box>
        )}
      </Paper>
    </Box>
  );
}

export default OperationLogPanel;
