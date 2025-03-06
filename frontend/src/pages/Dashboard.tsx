// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Description as DescriptionIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { FinancialModel } from '../types/model';
import { User } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';

// Queries
const GET_RECENT_MODELS = gql`
  query GetRecentModels($organizationId: ID!) {
    models(organizationId: $organizationId) {
      id
      name
      description
      updatedAt
      createdBy
    }
  }
`;

const GET_USER_SUMMARY = gql`
  query GetUserSummary($organizationId: ID!) {
    users(organizationId: $organizationId) {
      id
      firstName
      lastName
      email
      roles
    }
  }
`;

const Dashboard: React.FC = () => {
  const { state } = useAuth();
  const organizationId = state.user?.organizationId || '';
  
  // Fetch recent models
  const { 
    loading: loadingModels, 
    error: modelsError, 
    data: modelsData 
  } = useQuery(GET_RECENT_MODELS, {
    variables: { organizationId },
    skip: !organizationId,
  });
  
  // Fetch users summary
  const { 
    loading: loadingUsers, 
    error: usersError, 
    data: usersData 
  } = useQuery(GET_USER_SUMMARY, {
    variables: { organizationId },
    skip: !organizationId,
  });
  
  const [recentModels, setRecentModels] = useState<any[]>([]);
  const [userSummary, setUserSummary] = useState<User[]>([]);
  
  useEffect(() => {
    if (modelsData && modelsData.models) {
      setRecentModels(modelsData.models.slice(0, 5));
    }
  }, [modelsData]);
  
  useEffect(() => {
    if (usersData && usersData.users) {
      setUserSummary(usersData.users);
    }
  }, [usersData]);
  
  // Mock stats for demo
  const stats = {
    totalModels: recentModels.length,
    activeUsers: userSummary.length,
    recentChanges: 24,
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Welcome back, {state.user?.firstName}!
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6" component="div">
                  Financial Models
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {stats.totalModels}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total models in your organization
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                component={Link}
                to="/models"
              >
                View All Models
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6" component="div">
                  Team Members
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {stats.activeUsers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active users in your organization
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                component={Link}
                to="/users"
              >
                View All Users
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6" component="div">
                  Recent Activity
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {stats.recentChanges}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Changes in the last 7 days
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                component={Link}
                to="/activity"
              >
                View Activity
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Recent Models */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Recent Models
              </Typography>
              <Button 
                startIcon={<AddIcon />} 
                variant="contained" 
                color="primary"
                component={Link}
                to="/models/new"
                size="small"
              >
                New Model
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {loadingModels ? (
              <Typography>Loading...</Typography>
            ) : modelsError ? (
              <Typography color="error">Error loading models</Typography>
            ) : recentModels.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="textSecondary" gutterBottom>
                  No models yet
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  component={Link}
                  to="/models/new"
                  sx={{ mt: 2 }}
                >
                  Create Your First Model
                </Button>
              </Box>
            ) : (
              <List>
                {recentModels.map((model) => (
                  <React.Fragment key={model.id}>
                    <ListItem button component={Link} to={`/models/${model.id}`}>
                      <ListItemText
                        primary={model.name}
                        secondary={
                          <React.Fragment>
                            <Typography
                              component="span"
                              variant="body2"
                              color="textPrimary"
                              sx={{ display: 'inline' }}
                            >
                              {model.description || 'No description'}
                            </Typography>
                            {' — Updated '}
                            {new Date(model.updatedAt).toLocaleDateString()}
                          </React.Fragment>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="go to model">
                          <ArrowForwardIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Team Members */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Team Members
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {loadingUsers ? (
              <Typography>Loading...</Typography>
            ) : usersError ? (
              <Typography color="error">Error loading users</Typography>
            ) : userSummary.length === 0 ? (
              <Typography color="textSecondary">
                No team members found
              </Typography>
            ) : (
              <List>
                {userSummary.slice(0, 5).map((user) => (
                  <ListItem key={user.id}>
                    <ListItemText
                      primary={`${user.firstName} ${user.lastName}`}
                      secondary={user.email}
                    />
                    <Chip 
                      size="small" 
                      label={user.roles[0]} 
                      color={user.roles.includes('ADMIN') ? 'primary' : 'default'}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Dashboard;