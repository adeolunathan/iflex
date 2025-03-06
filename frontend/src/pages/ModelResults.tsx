// frontend/src/pages/ModelResults.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  Divider,
  Grid,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Layout from '../components/common/Layout';
import ModelResultsPanel from '../components/data-visualization/ModelResultsPanel';

// Define the query to fetch model details
const GET_MODEL = gql`
  query GetModel($id: ID!) {
    model(id: $id) {
      id
      name
      description
      startDate
      endDate
      timePeriod
      components {
        id
        name
        description
        type
        dataType
      }
    }
  }
`;

const ModelResults: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  
  // Fetch model details
  const { loading, error, data } = useQuery(GET_MODEL, {
    variables: { id: modelId },
    skip: !modelId,
  });
  
  // Extract output components (formula, aggregation, reference)
  const outputComponents = data?.model?.components.filter(
    (component: any) => component.type !== 'INPUT'
  ) || [];
  
  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mt: 3, mb: 4 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/models" color="inherit">
              Models
            </Link>
            <Link
              component={RouterLink}
              to={`/models/${modelId}`}
              color="inherit"
            >
              {data?.model?.name || 'Model'}
            </Link>
            <Typography color="textPrimary">Results</Typography>
          </Breadcrumbs>
          
          <Box sx={{ mt: 2, mb: 4 }}>
            <Typography variant="h4">
              {data?.model?.name ? `${data.model.name} - Results` : 'Model Results'}
            </Typography>
            {data?.model?.description && (
              <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                {data.model.description}
              </Typography>
            )}
          </Box>
          
          <Divider sx={{ mb: 4 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">Error loading model: {error.message}</Typography>
          ) : !data?.model ? (
            <Typography>Model not found</Typography>
          ) : (
            <ModelResultsPanel
              modelId={modelId || ''}
              components={outputComponents}
            />
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default ModelResults;