import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Avatar, Typography, IconButton, Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SendIcon from '@mui/icons-material/Send';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import BackupIcon from '@mui/icons-material/Backup';
import HistoryIcon from '@mui/icons-material/History';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import BuildIcon from '@mui/icons-material/Build';
import { useNavigate } from 'react-router-dom';

function ProfessionalSidebar({ user, mobileOpen, handleDrawerToggle, handleDrawerTransitionEnd, handleDrawerClose, drawerWidth, collapsed, setCollapsed, onLogout }) {
  const [expandedMenus, setExpandedMenus] = useState({});
  const navigate = useNavigate();

  const handleMenuClick = (menu) => {
    if (collapsed) {
        setCollapsed(false);
        setTimeout(() => {
            setExpandedMenus({ ...expandedMenus, [menu]: !expandedMenus[menu] });
        }, 200);
    } else {
        setExpandedMenus({ ...expandedMenus, [menu]: !expandedMenus[menu] });
    }
  };

  const toggleCollapse = () => {
      setCollapsed(!collapsed);
      // Close all menus when collapsing
      if (!collapsed) {
          setExpandedMenus({});
      }
  };

  const menuItems = [
    {
      title: 'داشبورد',
      icon: <DashboardIcon />,
      path: '/',
      color: '#1976d2'
    },
    {
      title: 'مدیریت انبار',
      icon: <WarehouseIcon />,
      color: '#7b1fa2',
      submenu: [
        { title: 'لیست انبارها', icon: <ListAltIcon />, path: '/warehouses' },
        { title: 'رسید انبار', icon: <ReceiptIcon />, path: '/inventory' },
        { title: 'حواله انبار', icon: <SendIcon />, path: '/transfer' },
        { title: 'مدیریت حواله‌ها', icon: <LocalShippingIcon />, path: '/transfer-list' },
        { title: 'کالاهای مغایرت‌دار', icon: <ErrorOutlineIcon />, path: '/mismatches', access: 'admin' }
      ]
    },
    {
      title: 'مدیریت داروها',
      icon: <LocalPharmacyIcon />,
      color: '#388e3c',
      submenu: [
        { title: 'لیست داروها', icon: <ListAltIcon />, path: '/drugs' },
        { title: 'موجودی انبار (ماتریسی)', icon: <InventoryIcon />, path: '/inventory-matrix' }
      ]
    },
    {
      title: 'مدیریت ابزارها',
      icon: <BuildIcon />,
      color: '#f57c00',
      submenu: [
        { title: 'لیست ابزارها', icon: <ListAltIcon />, path: '/tools' },
        { title: 'رسید ابزار', icon: <ReceiptIcon />, path: '/tool-inventory' },
        { title: 'حواله ابزار', icon: <SendIcon />, path: '/tool-transfer' }
      ]
    },
    {
      title: 'طرف‌های تجاری',
      icon: <BusinessIcon />,
      color: '#f57c00',
      submenu: [
        { title: 'تامین‌کنندگان', icon: <BusinessIcon />, path: '/suppliers' },
        { title: 'مصرف‌کنندگان', icon: <PersonIcon />, path: '/consumers' }
      ]
    },
    {
      title: 'گزارشات',
      icon: <AssessmentIcon />,
      color: '#d32f2f',
      submenu: [
        { title: 'گزارشات جامع', icon: <AssessmentIcon />, path: '/report' },
        { title: 'داروهای منقضی شده', icon: <ReceiptIcon />, path: '/report-expired' },
        { title: 'داروهای معدوم شده', icon: <DeleteForeverIcon />, path: '/disposed', access: 'admin' }
      ]
    },
    {
      title: 'سیستم',
      icon: <SettingsIcon />,
      color: '#0288d1',
      submenu: [
        { title: 'کاربران و دسترسی', icon: <PeopleIcon />, path: '/users', access: 'admin' },
        { title: 'تاریخچه عملیات', icon: <HistoryIcon />, path: '/logs', access: 'admin' },
        { title: 'بکاپ دیتابیس', icon: <BackupIcon />, path: '/backup', access: 'admin' },
        { title: 'تنظیمات', icon: <SettingsIcon />, path: '/settings' }
      ]
    }
  ];

  const filterMenuByAccess = (item) => {
    if (!item.access) return true; // No restriction
    
    // superadmin has access to everything
    if (user?.access_level === 'superadmin') return true;
    
    // Check specific access level
    if (item.access === 'admin') {
      return user?.access_level === 'admin' || user?.access_level === 'superadmin';
    }
    
    return user?.access_level === item.access;
  };

  const drawerContent = (
    <>
      <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          bgcolor: 'primary.main', 
          color: 'white' 
        }}>
        {!collapsed && (
            <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                <LocalPharmacyIcon />
            </Avatar>
            <Box>
                <Typography variant="subtitle1" fontWeight="bold">انبار دارو</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>نسخه ۱.۰</Typography>
            </Box>
            </Box>
        )}
        {collapsed && (
             <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                <LocalPharmacyIcon />
            </Avatar>
        )}
        
        {/* Collapse Button (Desktop only) */}
        <IconButton 
            onClick={toggleCollapse} 
            sx={{ color: 'white', display: { xs: 'none', sm: 'flex' } }}
        >
            {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      
      {/* User Info Section */}
      {!collapsed && user && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.100', 
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <PersonIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {user.full_name || user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.access_level === 'superadmin' && 'مدیر کل'}
                {user.access_level === 'admin' && 'مدیر'}
                {user.access_level === 'warehouseman' && 'انباردار'}
                {user.access_level === 'viewer' && 'مشاهده‌گر'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      
      <Divider />
      
      <List component="nav" sx={{ px: 1 }}>
        {menuItems.filter(filterMenuByAccess).map((item, index) => (
          <React.Fragment key={index}>
            {item.submenu ? (
              <>
                <ListItemButton 
                  onClick={() => handleMenuClick(item.title)}
                  sx={{ 
                    borderRadius: 2, 
                    mb: 0.5,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: 2.5
                  }}
                >
                  <ListItemIcon sx={{ 
                      color: item.color,
                      minWidth: 0,
                      mr: collapsed ? 0 : 3,
                      justifyContent: 'center',
                    }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                      <>
                        <ListItemText primary={item.title} />
                        {expandedMenus[item.title] ? <ExpandLess /> : <ExpandMore />}
                      </>
                  )}
                </ListItemButton>
                <Collapse in={expandedMenus[item.title] && !collapsed} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.filter(filterMenuByAccess).map((subItem, subIndex) => (
                      <ListItemButton
                        key={subIndex}
                        sx={{ pl: 4, borderRadius: 2, mb: 0.5 }}
                        onClick={() => navigate(subItem.path)}
                      >
                        <ListItemIcon sx={{ minWidth: 35 }}>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={subItem.title} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItemButton 
                onClick={() => navigate(item.path)}
                sx={{ 
                    borderRadius: 2, 
                    mb: 0.5,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: 2.5
                }}
              >
                <ListItemIcon sx={{ 
                    color: item.color,
                    minWidth: 0,
                    mr: collapsed ? 0 : 3,
                    justifyContent: 'center',
                }}>
                    {item.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.title} />}
              </ListItemButton>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Logout Button */}
      <Divider sx={{ my: 2 }} />
      <List>
        <ListItemButton
          onClick={() => {
            if (window.confirm('آیا از خروج از سیستم اطمینان دارید؟')) {
              onLogout && onLogout();
            }
          }}
          sx={{
            minHeight: 48,
            justifyContent: collapsed ? 'center' : 'initial',
            px: 2.5,
            bgcolor: 'error.lighter',
            '&:hover': {
              bgcolor: 'error.light',
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: 'error.main',
              minWidth: 0,
              mr: collapsed ? 0 : 3,
              justifyContent: 'center',
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          {!collapsed && (
            <ListItemText 
              primary="خروج از سیستم" 
              sx={{ color: 'error.main', fontWeight: 'bold' }} 
            />
          )}
        </ListItemButton>
      </List>

      {/* Footer - Developer Info */}
      {!collapsed && (
        <Box sx={{ 
          mt: 'auto', 
          p: 2, 
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            طراح و توسعه‌دهنده
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main">
            علیرضا حامد
          </Typography>
          <Typography variant="caption" color="text.secondary">
            پاییز ۱۴۰۴
          </Typography>
        </Box>
      )}
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: collapsed ? 80 : drawerWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s' }}
      aria-label="mailbox folders"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onTransitionEnd={handleDrawerTransitionEnd}
        onClose={handleDrawerClose}
        ModalProps={{ keepMounted: true }}
        anchor="right"
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: collapsed ? 80 : drawerWidth,
              transition: 'width 0.3s',
              overflowX: 'hidden'
            },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export default ProfessionalSidebar;
