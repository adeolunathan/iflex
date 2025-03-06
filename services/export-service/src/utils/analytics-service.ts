// services/export-service/src/utils/analytics-service.ts

import fetch from 'node-fetch';
import { config } from '../config';

export interface ReportData {
  id: string;
  name: string;
  description?: string;
  type: string;
  modelId?: string;
  widgets: WidgetData[];
}

export interface WidgetData {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  data?: any;
}

export async function getReport(id: string, token: string): Promise<ReportData | null> {
  try {
    const response = await fetch(config.analyticsServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetReport($id: ID!) {
            report(id: $id) {
              id
              name
              description
              type
              modelId
              widgets {
                id
                name
                description
                type
                config
                position
              }
            }
          }
        `,
        variables: { id },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching report:', data.errors);
      return null;
    }
    
    // Parse config and position from JSON strings if needed
    const report = data.data.report;
    
    report.widgets = report.widgets.map((widget: any) => ({
      ...widget,
      config: typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config,
      position: typeof widget.position === 'string' ? JSON.parse(widget.position) : widget.position,
    }));
    
    return report;
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
}

export async function getWidgetData(id: string, token: string): Promise<any> {
  try {
    const response = await fetch(config.analyticsServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetWidgetData($id: ID!) {
            widgetData(id: $id)
          }
        `,
        variables: { id },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching widget data:', data.errors);
      return null;
    }
    
    // Parse the data from JSON string
    return JSON.parse(data.data.widgetData);
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return null;
  }
}