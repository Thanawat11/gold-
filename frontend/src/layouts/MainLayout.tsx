import { useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Stack, Tooltip, useTheme
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
  Logout,
  ManageAccounts
} from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import shopLogo from '../assets/ek-hua-heng-logo.png';
import type { Role } from '../types';

const drawerWidth = 260;

const menuItems: Array<{ text: string; icon: ReactNode; path: string; roles: Role[] }> = [
  { text: 'หน้าหลัก', icon: <Dashboard />, path: '/', roles: ['OWNER', 'MANAGER', 'STAFF', 'ACCOUNT', 'CASHIER'] },
  { text: 'ระบบหน้าร้าน (POS)', icon: <PointOfSale />, path: '/pos', roles: ['OWNER', 'MANAGER', 'STAFF', 'CASHIER'] },
  { text: 'ระบบจำนำ', icon: <AccountBalanceWallet />, path: '/pawn', roles: ['OWNER', 'MANAGER', 'STAFF', 'CASHIER'] },
  { text: 'คลังสินค้า', icon: <Inventory />, path: '/inventory', roles: ['OWNER', 'MANAGER'] },
  { text: 'ฐานข้อมูลลูกค้า', icon: <People />, path: '/customers', roles: ['OWNER', 'MANAGER', 'STAFF', 'CASHIER'] },
  { text: 'รายงาน', icon: <Assessment />, path: '/reports', roles: ['OWNER', 'MANAGER', 'ACCOUNT'] },
  { text: 'ผู้ใช้งาน', icon: <ManageAccounts />, path: '/users', roles: ['OWNER'] },
  { text: 'ตั้งค่า', icon: <Settings />, path: '/settings', roles: ['OWNER'] },
];

const roleLabel: Record<Role, string> = {
  OWNER: 'เจ้าของร้าน',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงาน',
  ACCOUNT: 'บัญชี',
  CASHIER: 'พนักงานหน้าร้าน',
};

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

  const visibleMenuItems = menuItems.filter((item) => user?.role && item.roles.includes(user.role));
  const pageTitle = menuItems.find(i => i.path === location.pathname)?.text || 'ห้างทองเอกฮั่วเฮง';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
        <Box
          component="img"
          src={shopLogo}
          alt="ห้างทองเอกฮั่วเฮง"
          sx={{
            width: 96,
            height: 96,
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 18px rgba(212, 175, 55, 0.28))',
          }}
        />
        <Typography variant="h6" sx={{ color: theme.palette.secondary.main, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.25 }}>
          ห้างทองเอกฮั่วเฮง
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ flexGrow: 1, px: 2 }}>
        {visibleMenuItems.map((item) => {
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
          <Box
            component="img"
            src={shopLogo}
            alt=""
            sx={{ width: 34, height: 34, objectFit: 'contain', mr: 1.25, display: { xs: 'block', sm: 'none' } }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {pageTitle}
          </Typography>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', ml: 2 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', minWidth: 120 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {user?.fullName || 'Guest'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role ? roleLabel[user.role] : '-'}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 38, height: 38 }}>
              {user?.fullName?.charAt(0) || 'U'}
            </Avatar>
            <Tooltip title="ออกจากระบบ">
              <IconButton color="primary" onClick={handleLogout} aria-label="ออกจากระบบ">
                <Logout />
              </IconButton>
            </Tooltip>
          </Stack>
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
