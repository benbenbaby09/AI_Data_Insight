import axios from 'axios';
import { 
    DataSource, 
    Dataset, 
    Dashboard, 
    WebComponentTemplate, 
    ChartTemplate,
    SavedComponent,
    DatabaseConfig
} from '../types';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // DataSources
    getDataSources: () => api.get<DataSource[]>('/datasources').then(res => res.data),
    createDataSource: (ds: DataSource) => api.post<DataSource>('/datasources', ds).then(res => res.data),
    updateDataSource: (id: number, ds: DataSource) => api.put<DataSource>(`/datasources/${id}`, ds).then(res => res.data),
    deleteDataSource: (id: number) => api.delete(`/datasources/${id}`),
    testConnection: (config: any) => api.post<{success: boolean, message: string}>('/datasources/test-connection', config).then(res => res.data),
    listTables: (payload: any) => api.post<{success: boolean, message: string, tables: any[]}>('/datasources/list-tables', payload).then(res => res.data),
    getTableSchema: (payload: any) => api.post<{success: boolean, message: string, columns: any[]}>('/datasources/get-table-schema', payload).then(res => res.data),
    previewTableRows: (payload: any) => api.post<{success: boolean, message: string, rows: any[]}>('/datasources/preview-table', payload).then(res => res.data),
    executeSql: (payload: any) => api.post<{success: boolean, message: string, rows: any[], columns?: string[]}>('/datasources/execute-sql', payload).then(res => res.data),

    // Datasets
    getDatasets: () => api.get<Dataset[]>('/datasets').then(res => res.data),
    createDataset: (ds: Dataset) => api.post<Dataset>('/datasets', ds).then(res => res.data),
    updateDataset: (id: number, ds: Dataset) => api.put<Dataset>(`/datasets/${id}`, ds).then(res => res.data),
    deleteDataset: (id: number) => api.delete(`/datasets/${id}`),
    executeDatasetSql: (id: number, limit: number = 100) => api.post<{success: boolean, message: string, rows: any[], columns: string[]}>(`/datasets/${id}/execute`, null, { params: { limit } }).then(res => res.data),

    // Dashboards
    getDashboards: () => api.get<Dashboard[]>('/dashboards').then(res => res.data),
    createDashboard: (d: Dashboard) => api.post<Dashboard>('/dashboards', d).then(res => res.data),
    updateDashboard: (id: number, d: Dashboard) => api.put<Dashboard>(`/dashboards/${id}`, d).then(res => res.data),
    deleteDashboard: (id: number) => api.delete(`/dashboards/${id}`),

    // Web Components
    getWebComponents: () => api.get<WebComponentTemplate[]>('/web-components').then(res => res.data),
    createWebComponent: (comp: WebComponentTemplate) => api.post<WebComponentTemplate>('/web-components', comp).then(res => res.data),
    deleteWebComponent: (id: number) => api.delete(`/web-components/${id}`),

    // Chart Templates
    getChartTemplates: () => api.get<ChartTemplate[]>('/chart-templates').then(res => res.data),
    createChartTemplate: (temp: ChartTemplate) => api.post<ChartTemplate>('/chart-templates', temp).then(res => res.data),
    updateChartTemplate: (id: number, temp: ChartTemplate) => api.put<ChartTemplate>(`/chart-templates/${id}`, temp).then(res => res.data),
    deleteChartTemplate: (id: number) => api.delete(`/chart-templates/${id}`),

    // Saved Components
    getSavedComponents: () => api.get<SavedComponent[]>('/saved-components').then(res => res.data),
    createSavedComponent: (comp: SavedComponent) => api.post<SavedComponent>('/saved-components', comp).then(res => res.data),
    deleteSavedComponent: (id: number) => api.delete(`/saved-components/${id}`),

    // AI (SiliconFlow via backend)
    aiGenerateDatasetSQL: (dataSources: any[], userQuery: string) =>
        api.post<{sql: string, explanation: string}>('/ai/generate-dataset-sql', { dataSources, userQuery }).then(res => res.data),
    aiGenerateTableAnnotations: (tableName: string, tableDescription: string | undefined, columns: { name: string, type: string }[]) =>
        api.post<{ columnName: string, alias: string, description: string }[]>('/ai/generate-table-annotations', { tableName, tableDescription, columns }).then(res => res.data),
    aiGenerateDataInsight: (payload: { tables: any[], userQuery: string, referenceContext?: any }) =>
        api.post<{ explanation: string; chartConfig?: any; webComponent?: { name: string; code: string } }>('/ai/generate-data-insight', payload).then(res => res.data),
    aiGenerateWebComponent: (description: string, imageBase64?: string, contextData?: any, templateCode?: string, fieldMapping?: Record<string, string>) =>
        api.post<{ name: string; description: string; code: string }>('/ai/generate-web-component', { description, imageBase64, contextData, templateCode, fieldMapping }).then(res => res.data),
    aiGenerateChartTemplate: (description: string, imageBase64?: string) =>
        api.post<{ name: string; description: string; type: ChartTemplate['type']; customSpec: any; chartParams?: any }>(
            '/ai/generate-chart-template',
            { description, imageBase64 }
        ).then(res => res.data),
};
