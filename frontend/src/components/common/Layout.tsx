// frontend/src/components/common/Layout.tsx

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  InsertChart as ChartIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };
  
  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };
  
  const getInitials = () => {
    if (!state.user) return '?';
    return `${state.user.firstName.charAt(0)}${state.user.lastName.charAt(0)}`;
  };
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Sidebar links
  const sidebarLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Models', icon: <ChartIcon />, path: '/models' },
    ...(hasRole(UserRole.ADMIN) || hasRole(UserRole.MANAGER) ? [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' }
    ] : []),
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  const drawer = (
    <div>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          FinanceForge
        </Typography>
      </Box>
      <Divider />
      <List>
        {sidebarLinks.map((link) => (
          <ListItem
            button
            key={link.text}
            component={Link}
            to={link.path}
            selected={isActive(link.path)}
            onClick={() => isMobile && setDrawerOpen(false)}
            sx={{
              bgcolor: isActive(link.path) ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              borderLeft: isActive(link.path) ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
              paddingLeft: isActive(link.path) ? 2 : 3,
            }}
          >
            <ListItemIcon
              sx={{
                color: isActive(link.path) ? 'primary.main' : 'inherit',
              }}
            >
              {link.icon}
            </ListItemIcon>
            <ListItemText primary={link.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );
  
  if (!state.isAuthenticated) {
    return (
      <Container>
        {children}
      </Container>
    );
  }
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ display: { xs: 'none', md: 'block' } }}>
            FinanceForge
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={() => navigate('/models/new')}
            sx={{ mr: 2 }}
          >
            New Model
          </Button>
          <IconButton
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {getInitials()}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            {state.user && (
              <MenuItem disabled>
                <Typography variant="body2" color="textSecondary">
                  {state.user.firstName} {state.user.lastName}
                </Typography>
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon>
                <AccountIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 240px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;