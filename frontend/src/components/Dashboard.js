import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Fade, CircularProgress } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import dayjs from 'dayjs';
import jalaali from 'jalaali-js';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalDrugs: 0,
    totalInventory: 0,
    pendingTransfers: 0,
    warehouses: 0,
    suppliers: 0,
    consumers: 0,
    expiredDrugs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [inventory, transfers, warehouses, drugs, suppliers, consumers, expired] = await Promise.all([
        axios.get(`${API_BASE_URL}/inventory`),
        axios.get(`${API_BASE_URL}/transfer/pending`),
        axios.get(`${API_BASE_URL}/warehouses`),
        axios.get(`${API_BASE_URL}/drugs`),
        axios.get(`${API_BASE_URL}/suppliers`),
        axios.get(`${API_BASE_URL}/consumers`),
        axios.get(`${API_BASE_URL}/expiring-drugs`)
      ]);
      const totalQty = inventory.data.reduce((sum, inv) => sum + inv.quantity, 0);
      setStats({
        totalDrugs: drugs.data.length,
        totalInventory: totalQty,
        pendingTransfers: transfers.data.length,
        warehouses: warehouses.data.length,
        suppliers: suppliers.data.length,
        consumers: consumers.data.length,
        expiredDrugs: expired.data.length
      });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // تاریخ و ساعت و روز هفته (لایو)
  const [dateInfo, setDateInfo] = useState({
    jalali: '',
    gregorian: '',
    weekDay: '',
    time: ''
  });

  const weekDaysFa = {
    Saturday: 'شنبه',
    Sunday: 'یک‌شنبه',
    Monday: 'دوشنبه',
    Tuesday: 'سه‌شنبه',
    Wednesday: 'چهارشنبه',
    Thursday: 'پنج‌شنبه',
    Friday: 'جمعه'
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = dayjs();
      const gYear = now.year();
      const gMonth = now.month() + 1;
      const gDay = now.date();
      const jDate = jalaali.toJalaali(gYear, gMonth, gDay);
      const weekDayEn = now.format('dddd');
      setDateInfo({
        jalali: `${jDate.jy}/${String(jDate.jm).padStart(2, '0')}/${String(jDate.jd).padStart(2, '0')}`,
        gregorian: now.format('YYYY/MM/DD'),
        weekDay: weekDayEn,
        weekDayFa: weekDaysFa[weekDayEn] || '',
        time: now.format('HH:mm:ss')
      });
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={700}>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" align="center" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
          📊 داشبورد مدیریت انبار دارو
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {/* کارت‌های اطلاعاتی */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <LocalPharmacyIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>تعداد داروها</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.totalDrugs}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', boxShadow: '0 8px 16px rgba(240, 147, 251, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <InventoryIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>موجودی کل</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.totalInventory}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 8px 16px rgba(79, 172, 254, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <LocalShippingIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>حواله در انتظار</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.pendingTransfers}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', boxShadow: '0 8px 16px rgba(67, 233, 123, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <WarningAmberIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>تعداد انبارها</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.warehouses}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* کارت‌های جدید */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)', boxShadow: '0 8px 16px rgba(255, 179, 71, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <BusinessIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>تأمین‌کنندگان</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.suppliers}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', boxShadow: '0 8px 16px rgba(161, 196, 253, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <PersonIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>مصرف‌کنندگان</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.consumers}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', boxShadow: '0 8px 16px rgba(247, 151, 30, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <WarningIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>داروهای منقضی</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>{stats.expiredDrugs}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* کارت تاریخ و ساعت */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)', boxShadow: '0 8px 16px rgba(67, 206, 162, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' }, height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <EventAvailableIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>تاریخ امروز</Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', direction: 'ltr' }}>{dateInfo.jalali}</Typography>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>{dateInfo.weekDayFa}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)', boxShadow: '0 8px 16px rgba(255, 106, 0, 0.4)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' }, height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                    <AccessTimeIcon fontSize="large" sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>ساعت فعلی</Typography>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', direction: 'ltr' }}>{dateInfo.time}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
}

export default Dashboard;
