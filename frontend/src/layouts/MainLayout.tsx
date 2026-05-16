import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  PointOfSale,
  AccountBalanceWallet,
  Inventory,
  People,
  Assessment,
  Settings,
  Logout
} from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

const drawerWidth = 260;

const menuItems = [
  { text: 'หน้าหลัก', icon: <Dashboard />, path: '/' },
  { text: 'ระบบหน้าร้าน (POS)', icon: <PointOfSale />, path: '/pos' },
  { text: 'ระบบจำนำ', icon: <AccountBalanceWallet />, path: '/pawn' },
  { text: 'คลังสินค้า', icon: <Inventory />, path: '/inventory' },
  { text: 'ฐานข้อมูลลูกค้า', icon: <People />, path: '/customers' },
  { text: 'รายงาน', icon: <Assessment />, path: '/reports' },
  { text: 'ตั้งค่า', icon: <Settings />, path: '/settings' },
];

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h5" sx={{ color: theme.palette.secondary.main, fontWeight: 'bold' }}>
          ห้างทองเอกฮั่วเฮง
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 1,
                  backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? theme.palette.primary.main : 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiTypography-root': { 
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontWeight: isActive ? 600 : 400
                    } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 2 }}>
            {user?.fullName?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
              {user?.fullName || 'Guest'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {user?.role === 'OWNER' ? 'เจ้าของร้าน' : 'พนักงาน'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            <Logout fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {menuItems.find(i => i.path === location.pathname)?.text || 'ห้างทองเอกฮั่วเฮง'}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  );
};
