// frontend/src/components/data-visualization/TimeSeriesChart.tsx

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  BarChart,
  ComposedChart,
} from 'recharts';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Grid,
  Divider,
  Button,
  Toolbar,
  IconButton,
  Tooltip as MuiTooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { 
  BarChart as BarChartIcon, 
  ShowChart as LineChartIcon, 
  StackedLineChart as AreaChartIcon,
  ViewComfy as ComposedChartIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Chart type options
enum ChartType {
  LINE = 'LINE',
  AREA = 'AREA',
  BAR = 'BAR',
  COMPOSED = 'COMPOSED',
}

// Data format expected by the component
export interface TimeSeriesDataPoint {
  timestamp: string | Date;
  [key: string]: any;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  xAxisKey?: string;
  seriesKeys?: string[];
  chartType?: ChartType;
  stacked?: boolean;
  height?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

// Color palette for chart series
const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  xAxisKey = 'timestamp',
  seriesKeys,
  chartType: initialChartType = ChartType.LINE,
  stacked = false,
  height = 400,
  loading = false,
  onRefresh,
}) => {
  // Derive series keys from data if not provided
  const [availableSeriesKeys, setAvailableSeriesKeys] = useState<string[]>([]);
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  
  // Format the data for better display
  const [formattedData, setFormattedData] = useState<any[]>([]);
  
  // Extract all keys excluding the x-axis key
  useEffect(() => {
    if (data.length > 0) {
      const firstPoint = data[0];
      const keys = Object.keys(firstPoint).filter(key => key !== xAxisKey);
      setAvailableSeriesKeys(keys);
      
      // If seriesKeys prop is provided, use it, otherwise use all available keys
      if (seriesKeys) {
        setSelectedSeriesKeys(seriesKeys);
      } else {
        // Limit to first 5 series if many are available
        setSelectedSeriesKeys(keys.slice(0, 5));
      }
    } else {
      setAvailableSeriesKeys([]);
      setSelectedSeriesKeys([]);
    }
  }, [data, xAxisKey, seriesKeys]);
  
  // Format the data for display
  useEffect(() => {
    const formatted = data.map(point => {
      const formattedPoint: any = {};
      
      // Format timestamp for display if it's a Date object
      if (point[xAxisKey] instanceof Date) {
        formattedPoint[xAxisKey] = (point[xAxisKey] as Date).toLocaleDateString();
      } else if (typeof point[xAxisKey] === 'string' && !isNaN(Date.parse(point[xAxisKey] as string))) {
        // If it's a date string, format it
        formattedPoint[xAxisKey] = new Date(point[xAxisKey] as string).toLocaleDateString();
      } else {
        // Otherwise use as is
        formattedPoint[xAxisKey] = point[xAxisKey];
      }
      
      // Include only selected series
      selectedSeriesKeys.forEach(key => {
        formattedPoint[key] = point[key];
      });
      
      return formattedPoint;
    });
    
    setFormattedData(formatted);
  }, [data, xAxisKey, selectedSeriesKeys]);
  
  const handleSeriesChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedSeriesKeys(event.target.value as string[]);
  };
  
  const handleChartTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newChartType: ChartType | null
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };
  
  const handleDownload = () => {
    // Simple CSV export
    const headers = [xAxisKey, ...selectedSeriesKeys];
    const csvRows = [
      headers.join(','),
      ...data.map(point => {
        return headers.map(header => point[header]).join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Render the appropriate chart based on the selected type
  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };
    
    switch (chartType) {
      case ChartType.LINE:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedSeriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                activeDot={{ r: 8 }}
                dot={false}
              />
            ))}
          </LineChart>
        );
        
      case ChartType.AREA:
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedSeriesKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                stroke={COLORS[index % COLORS.length]}
                stackId={stacked ? "stack" : `stack-${index}`}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );
        
      case ChartType.BAR:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedSeriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        );
        
      case ChartType.COMPOSED:
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedSeriesKeys.map((key, index) => {
              // Alternate between different chart types
              const type = index % 3;
              if (type === 0) {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    dot={false}
                  />
                );
              } else if (type === 1) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                  />
                );
              } else {
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    fill={COLORS[index % COLORS.length]}
                    stroke={COLORS[index % COLORS.length]}
                    fillOpacity={0.4}
                  />
                );
              }
            })}
          </ComposedChart>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          component="div"
        >
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            aria-label="chart type"
            size="small"
            sx={{ mr: 1 }}
          >
            <ToggleButton value={ChartType.LINE} aria-label="line chart">
              <MuiTooltip title="Line Chart">
                <LineChartIcon />
              </MuiTooltip>
            </ToggleButton>
            <ToggleButton value={ChartType.AREA} aria-label="area chart">
              <MuiTooltip title="Area Chart">
                <AreaChartIcon />
              </MuiTooltip>
            </ToggleButton>
            <ToggleButton value={ChartType.BAR} aria-label="bar chart">
              <MuiTooltip title="Bar Chart">
                <BarChartIcon />
              </MuiTooltip>
            </ToggleButton>
            <ToggleButton value={ChartType.COMPOSED} aria-label="composed chart">
              <MuiTooltip title="Composed Chart">
                <ComposedChartIcon />
              </MuiTooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <MuiTooltip title="Refresh Data">
            <IconButton onClick={onRefresh} disabled={!onRefresh || loading}>
              <RefreshIcon />
            </IconButton>
          </MuiTooltip>
          
          <MuiTooltip title="Download Data">
            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </MuiTooltip>
        </Box>
      </Toolbar>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={9}>
            <Box sx={{ height: height, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Series Selection
            </Typography>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel id="series-select-label">Series</InputLabel>
              <Select
                labelId="series-select-label"
                id="series-select"
                multiple
                value={selectedSeriesKeys}
                onChange={handleSeriesChange}
                input={<OutlinedInput label="Series" />}
                renderValue={(selected) => (selected as string[]).join(', ')}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                      width: 250,
                    },
                  },
                }}
              >
                {availableSeriesKeys.map((key) => (
                  <MenuItem key={key} value={key}>
                    <Checkbox checked={selectedSeriesKeys.indexOf(key) > -1} />
                    <ListItemText primary={key} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Chart Options
              </Typography>
              <FormControl component="fieldset" fullWidth sx={{ mt: 1 }}>
                <Grid container alignItems="center">
                  <Grid item xs={6}>
                    <Typography variant="body2">Stacked</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Checkbox
                      checked={stacked}
                      onChange={() => setSelectedSeriesKeys(selectedSeriesKeys)}
                      disabled={chartType === ChartType.LINE || chartType === ChartType.COMPOSED}
                    />
                  </Grid>
                </Grid>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TimeSeriesChart;