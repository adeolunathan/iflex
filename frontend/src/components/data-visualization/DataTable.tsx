// frontend/src/components/data-visualization/DataTable.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

type Order = 'asc' | 'desc';

interface Column {
  id: string;
  label: string;
  numeric?: boolean;
  format?: (value: any) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
}

interface DataTableProps {
  title: string;
  data: any[];
  columns: Column[];
  initialSortBy?: string;
  initialOrder?: Order;
  onRowClick?: (row: any) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  data,
  columns,
  initialSortBy,
  initialOrder = 'asc',
  onRowClick,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [orderBy, setOrderBy] = useState<string>(initialSortBy || columns[0].id);
  const [searchText, setSearchText] = useState<string>('');
  
  // Handle sort request
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // Filter data based on search text
    const filtered = data.filter(row => {
      if (!searchText) return true;
      
      const searchTextLower = searchText.toLowerCase();
      
      // Search across all fields
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchTextLower);
      });
    });
    
    // Sort data
    return filtered.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      // Handle nulls and undefined
      if (aValue === null || aValue === undefined) return order === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return order === 'asc' ? 1 : -1;
      
      // Compare based on type
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, searchText, orderBy, order]);
  
  // Handle CSV download
  const handleDownload = () => {
    const headers = columns.map(column => column.label);
    const dataRows = filteredAndSortedData.map(row => 
      columns.map(column => {
        const value = row[column.id];
        // Convert to string, handle null/undefined
        return value !== null && value !== undefined ? String(value) : '';
      })
    );
    
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search..."
            value={searchText}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mr: 2 }}
          />
          
          <Tooltip title="Filter list">
            <IconButton>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Download as CSV">
            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
      
      <TableContainer>
        <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.numeric ? 'right' : 'left'}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{ width: column.width }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedData.map((row, index) => {
              return (
                <TableRow
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={-1}
                  key={row.id || index}
                  sx={{ 
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  {columns.map((column) => {
                    const value = row[column.id];
                    const formattedValue = column.format ? column.format(value) : value;
                    
                    return (
                      <TableCell 
                        key={column.id} 
                        align={column.numeric ? 'right' : 'left'}
                      >
                        {formattedValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {filteredAndSortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No data found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <Chip 
          label={`${filteredAndSortedData.length} rows`} 
          variant="outlined" 
          size="small" 
        />
      </Box>
    </Paper>
  );
};

export default DataTable;