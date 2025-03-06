// frontend/src/components/data-visualization/MetricsGrid.tsx

import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  CircularProgress,
  Chip,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  InfoOutlined,
  ArrowDropUp,
  ArrowDropDown,
} from '@mui/icons-material';

export interface MetricData {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage';
  description?: string;
  status?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}

interface MetricsGridProps {
  metrics: MetricData[];
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  columns = 4,
}) => {
  // Calculate grid size based on columns
  const gridSize = 12 / columns as 12 | 6 | 4 | 3 | 2 | 1;
  
  // Format the value based on the specified format
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
        
      case 'percentage':
        return `${value.toFixed(1)}%`;
        
      default:
        return value.toLocaleString();
    }
  };
  
  // Calculate the change percentage
  const calculateChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return change;
  };
  
  // Determine the status based on change
  const getStatusFromChange = (change: number | null, customStatus?: string) => {
    if (customStatus) return customStatus;
    if (change === null) return 'neutral';
    return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  };
  
  // Get the appropriate icon based on status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'positive':
        return <TrendingUp fontSize="small" color="success" />;
      case 'negative':
        return <TrendingDown fontSize="small" color="error" />;
      default:
        return <TrendingFlat fontSize="small" color="action" />;
    }
  };
  
  return (
    <Grid container spacing={2}>
      {metrics.map((metric) => {
        const change = calculateChange(metric.value, metric.previousValue);
        const status = getStatusFromChange(change, metric.status);
        const icon = getStatusIcon(status);
        
        return (
          <Grid item xs={12} sm={6} md={gridSize} key={metric.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {metric.label}
                  </Typography>
                  {metric.description && (
                    <Tooltip title={metric.description}>
                      <IconButton size="small">
                        <InfoOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 1 }}>
                  {metric.loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Typography variant="h4" component="div">
                      {formatValue(metric.value, metric.format)}
                    </Typography>
                  )}
                </Box>
                
                {change !== null && !metric.loading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip
                      icon={change > 0 ? <ArrowDropUp /> : <ArrowDropDown />}
                      label={`${Math.abs(change).toFixed(1)}%`}
                      size="small"
                      color={status === 'positive' ? 'success' : status === 'negative' ? 'error' : 'default'}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                      vs previous
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MetricsGrid;