import React, { useState, useEffect, useCallback } from 'react';
import { CssBaseline, Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import InventoryForm from './components/InventoryForm';
import DrugManagement from './components/DrugManagement';
import SupplierManagement from './components/SupplierManagement';
import ConsumerManagement from './components/ConsumerManagement';
import SettingsPanel from './components/SettingsPanel';
import ReportExport from './components/ReportExport';
import ComprehensiveReports from './components/ComprehensiveReports';
import OperationLogPanel from './components/OperationLogPanel';
import DisposedDrugsPanel from './components/DisposedDrugsPanel';
import UserManagement from './components/UserManagement';
import AuthForm from './components/AuthForm';
import BackupPanel from './components/BackupPanel';
import TransferForm from './components/TransferForm';
import TransferList from './components/TransferList';
import MismatchPanel from './components/MismatchPanel';
import ProfessionalSidebar from './components/ProfessionalSidebar';
import WarehouseManagement from './components/WarehouseManagement';
import InventoryMatrix from './components/InventoryMatrix';
import ExpiringDrugsCard from './components/ExpiringDrugsCard';
import { SettingsProvider } from './utils/SettingsContext';

const drawerWidth = 280;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

function App() {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogin = (loggedInUser) => {
    // Backend returns: { id, username, full_name, access_level, warehouses, token }
    // We need to save token separately and user without token
    console.log('Login successful:', loggedInUser);
    
    if (loggedInUser.token) {
      localStorage.setItem('token', loggedInUser.token);
      console.log('Token saved to localStorage');
    } else {
      console.error('No token in login response!');
    }
    
    // Save user data without token
    const userData = {
      id: loggedInUser.id,
      username: loggedInUser.username,
      full_name: loggedInUser.full_name,
      access_level: loggedInUser.access_level,
      warehouses: loggedInUser.warehouses || []
    };
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('User data saved:', userData);
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Auto logout timer
  useEffect(() => {
    if (!user) return;

    let inactivityTimer;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      inactivityTimer = setTimeout(() => {
        handleLogout();
        alert('به دلیل عدم فعالیت، از سیستم خارج شدید.');
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [user, handleLogout]);

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <SettingsProvider>
      <Router>
        <CssBaseline />
        <Box sx={{ display: 'flex', direction: 'rtl' }}>
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${collapsed ? 80 : drawerWidth}px)` },
              display: { sm: 'none' }, // Only show on mobile
              transition: 'width 0.3s, margin 0.3s',
            }}
          >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              سیستم مدیریت انبار دارو
            </Typography>
          </Toolbar>
        </AppBar>

        <ProfessionalSidebar 
          user={user} 
          mobileOpen={mobileOpen} 
          handleDrawerToggle={handleDrawerToggle}
          handleDrawerTransitionEnd={handleDrawerTransitionEnd}
          handleDrawerClose={handleDrawerClose}
          drawerWidth={drawerWidth}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onLogout={handleLogout}
        />
        
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            bgcolor: '#f5f5f5', 
            minHeight: '100vh', 
            p: 3,
            width: { sm: `calc(100% - ${collapsed ? 80 : drawerWidth}px)` },
            transition: 'width 0.3s'
          }}
        >
          <Toolbar sx={{ display: { sm: 'none' } }} /> {/* Spacer for mobile AppBar */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/warehouses" element={<WarehouseManagement />} />
            <Route path="/inventory" element={<InventoryForm />} />
            <Route path="/transfer" element={<TransferForm />} />
            <Route path="/transfer-list" element={<TransferList />} />
            <Route path="/mismatches" element={<MismatchPanel />} />
            <Route path="/drugs" element={<DrugManagement />} />
            <Route path="/inventory-matrix" element={<InventoryMatrix />} />
            <Route path="/suppliers" element={<SupplierManagement />} />
            <Route path="/consumers" element={<ConsumerManagement />} />
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="/report" element={<ComprehensiveReports />} />
            <Route path="/report-inventory" element={<ComprehensiveReports />} />
            <Route path="/report-export" element={<ReportExport />} />
            <Route path="/report-expired" element={<ExpiringDrugsCard />} />
            <Route path="/logs" element={<OperationLogPanel />} />
            <Route path="/disposed" element={<DisposedDrugsPanel />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/backup" element={<BackupPanel />} />
          </Routes>
        </Box>
      </Box>
    </Router>
    </SettingsProvider>
  );
}

export default App;
