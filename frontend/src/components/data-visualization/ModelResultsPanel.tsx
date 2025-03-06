// frontend/src/components/data-visualization/ModelResultsPanel.tsx

import React, { useState, useEffect } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Divider,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import TimeSeriesChart, { TimeSeriesDataPoint } from "./TimeSeriesChart";
import MetricsGrid, { MetricData } from "./MetricsGrid";
import DataTable from "./DataTable";

// Define the query to fetch time series data
const GET_TIME_SERIES_DATA = gql`
  query GetTimeSeriesData(
    $componentIds: [ID!]!
    $scenarioId: ID
    $versionId: ID
  ) {
    timeSeriesData(
      componentIds: $componentIds
      scenarioId: $scenarioId
      versionId: $versionId
    ) {
      componentId
      period
      value
      scenarioId
      versionId
    }
  }
`;

// Define the query to get available scenarios and versions
const GET_SCENARIOS_AND_VERSIONS = gql`
  query GetScenariosAndVersions($modelId: ID!) {
    model(id: $modelId) {
      id
      scenarios {
        id
        name
      }
      versions {
        id
        name
        createdAt
      }
    }
  }
`;

interface ModelResultsPanelProps {
  modelId: string;
  components: any[];
}

interface Scenario {
  id: string;
  name: string;
}

interface Version {
  id: string;
  name: string;
  createdAt: string;
}

const ModelResultsPanel: React.FC<ModelResultsPanelProps> = ({
  modelId,
  components,
}) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState(0);

  // State for scenarios and versions
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("default");
  const [selectedVersion, setSelectedVersion] = useState<string>("default");

  // State for the time series data
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>(
    []
  );
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  // Get component IDs for the query
  const componentIds = components.map((component) => component.id);

  // Query for scenarios and versions
  const [loadScenariosAndVersions, { loading: loadingOptions }] = useLazyQuery(
    GET_SCENARIOS_AND_VERSIONS,
    {
      variables: { modelId },
      onCompleted: (data) => {
        if (data.model) {
          if (data.model.scenarios) {
            setScenarios(data.model.scenarios);
          }
          if (data.model.versions) {
            setVersions(data.model.versions);
          }
        }
      },
    }
  );

  // Query for time series data
  const [loadTimeSeriesData, { loading: loadingData }] = useLazyQuery(
    GET_TIME_SERIES_DATA,
    {
      variables: {
        componentIds,
        scenarioId: selectedScenario,
        versionId: selectedVersion,
      },
      onCompleted: (data) => {
        if (data.timeSeriesData) {
          processTimeSeriesData(data.timeSeriesData);
        }
      },
    }
  );

  // Load scenarios and versions on mount
  useEffect(() => {
    loadScenariosAndVersions();
  }, [loadScenariosAndVersions]);

  // Load time series data when scenario or version changes
  useEffect(() => {
    if (componentIds.length > 0) {
      loadTimeSeriesData();
    }
  }, [loadTimeSeriesData, componentIds, selectedScenario, selectedVersion]);

  // Process time series data for visualization
  const processTimeSeriesData = (rawData: any[]) => {
    // Group by period
    const periodMap: Record<string, Record<string, any>> = {};

    rawData.forEach((item) => {
      const { componentId, period, value } = item;

      // Find component name
      const component = components.find((c) => c.id === componentId);
      const componentName = component ? component.name : componentId;

      // Initialize period if needed
      if (!periodMap[period]) {
        periodMap[period] = {
          timestamp: period, // Keep period as timestamp for TimeSeriesDataPoint compatibility
        };
      }

      // Add value to period data
      periodMap[period][componentName] = parseFloat(value);
    });

    // Convert to array and sort by period
    const timeSeriesArray = Object.values(periodMap).sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Cast the array to the correct type
    const typedArray = timeSeriesArray as unknown as TimeSeriesDataPoint[];
    setTimeSeriesData(typedArray);

    // Generate metrics
    generateMetrics(timeSeriesArray);
  };

  // Generate metrics from time series data
  const generateMetrics = (timeSeriesArray: any[]) => {
    if (timeSeriesArray.length === 0) {
      setMetrics([]);
      return;
    }

    const lastPeriod = timeSeriesArray[timeSeriesArray.length - 1];
    const previousPeriod =
      timeSeriesArray.length > 1
        ? timeSeriesArray[timeSeriesArray.length - 2]
        : null;

    // Get all components excluding timestamp
    const componentNames = Object.keys(lastPeriod).filter(
      (key) => key !== "timestamp"
    );

    // Create metrics
    const metricsData: MetricData[] = componentNames.map((name, index) => {
      const value = lastPeriod[name];
      const previousValue = previousPeriod ? previousPeriod[name] : undefined;

      // Get component type to determine format
      const component = components.find((c) => c.name === name);
      let format: "number" | "currency" | "percentage" = "number";

      if (component) {
        if (component.dataType === "CURRENCY") {
          format = "currency";
        } else if (component.dataType === "PERCENTAGE") {
          format = "percentage";
        }
      }

      return {
        id: `metric-${index}`,
        label: name,
        value,
        previousValue,
        format,
        description: component?.description,
      };
    });

    setMetrics(metricsData);
  };

  // Handle tab change
  const handleTabChange = (_: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle scenario change
  const handleScenarioChange = (event: SelectChangeEvent) => {
    setSelectedScenario(event.target.value);
  };

  // Handle version change
  const handleVersionChange = (event: SelectChangeEvent) => {
    setSelectedVersion(event.target.value);
  };

  // Table columns
  const tableColumns = [
    { id: "timestamp", label: "Period", width: "150px" },
    ...(timeSeriesData.length > 0
      ? Object.keys(timeSeriesData[0])
          .filter((key) => key !== "timestamp")
          .map((key) => ({
            id: key,
            label: key,
            numeric: true,
            format: (value: any) => {
              // Find component to determine format
              const component = components.find((c) => c.name === key);
              if (component && component.dataType === "CURRENCY") {
                return new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value);
              } else if (component && component.dataType === "PERCENTAGE") {
                return `${value.toFixed(1)}%`;
              }
              return value.toLocaleString();
            },
          }))
      : []),
  ];

  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Model Results</Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="scenario-select-label">Scenario</InputLabel>
              <Select
                labelId="scenario-select-label"
                id="scenario-select"
                value={selectedScenario}
                label="Scenario"
                onChange={handleScenarioChange}
                disabled={loadingOptions}
              >
                <MenuItem value="default">Default</MenuItem>
                {scenarios.map((scenario) => (
                  <MenuItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="version-select-label">Version</InputLabel>
              <Select
                labelId="version-select-label"
                id="version-select"
                value={selectedVersion}
                label="Version"
                onChange={handleVersionChange}
                disabled={loadingOptions}
              >
                <MenuItem value="default">Latest</MenuItem>
                {versions.map((version) => (
                  <MenuItem key={version.id} value={version.id}>
                    {version.name} (
                    {new Date(version.createdAt).toLocaleDateString()})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid
            item
            xs={12}
            sm={12}
            md={4}
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Button
              variant="outlined"
              onClick={() => loadTimeSeriesData()}
              disabled={loadingData}
            >
              {loadingData ? (
                <CircularProgress size={24} sx={{ mr: 1 }} />
              ) : null}
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="model results tabs"
        >
          <Tab label="Dashboard" />
          <Tab label="Chart" />
          <Tab label="Table" />
        </Tabs>
      </Box>

      {loadingData ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box hidden={activeTab !== 0} sx={{ p: 2 }}>
            {/* Dashboard Tab */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MetricsGrid metrics={metrics} columns={4} />
              </Grid>

              <Grid item xs={12}>
                <TimeSeriesChart
                  data={timeSeriesData}
                  title="Key Metrics Over Time"
                  height={300}
                  onRefresh={() => loadTimeSeriesData()}
                />
              </Grid>
            </Grid>
          </Box>

          <Box hidden={activeTab !== 1} sx={{ p: 2 }}>
            {/* Chart Tab */}
            <TimeSeriesChart
              data={timeSeriesData}
              title="Model Results"
              height={500}
              onRefresh={() => loadTimeSeriesData()}
            />
          </Box>

          <Box hidden={activeTab !== 2} sx={{ p: 2 }}>
            {/* Table Tab */}
            <DataTable
              title="Model Results Data"
              data={timeSeriesData}
              columns={tableColumns}
              initialSortBy="timestamp"
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ModelResultsPanel;
