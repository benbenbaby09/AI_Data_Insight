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
    previewTableRows: (payload: any) => api.post<{success: boolean, message: string, rows: any[], columns?: string[]}>('/datasources/preview-table', payload).then(res => res.data),
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

    // Templates (Unified)
    getTemplates: (category?: string) => api.get<any[]>('/templates', { params: { category } }).then(res => res.data),
    
    // Web Components (Legacy Adapter -> Unified Template)
    getWebComponents: () => api.get<any[]>('/templates', { params: { category: 'web' } }).then(res => {
        return res.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            code: t.content,
            datasetId: t.config?.datasetId,
            createdAt: t.createdAt,
            dataExample: t.config?.dataExample,
            structuredExample: t.config?.structuredExample
        }));
    }),
    createWebComponent: (comp: WebComponentTemplate) => {
        const template = {
            name: comp.name,
            description: comp.description,
            type: 'web-component',
            category: 'web',
            content: comp.code,
            config: {
                datasetId: comp.datasetId,
                dataExample: comp.dataExample,
                structuredExample: comp.structuredExample
            },
            icon: 'Code'
        };
        return api.post<any>('/templates', template).then(res => ({
            id: res.data.id,
            name: res.data.name,
            description: res.data.description,
            code: res.data.content,
            datasetId: res.data.config?.datasetId,
            createdAt: res.data.createdAt,
            dataExample: res.data.config?.dataExample,
            structuredExample: res.data.config?.structuredExample
        }));
    },
    deleteWebComponent: (id: number) => api.delete(`/templates/${id}`),

    // Chart Templates (Legacy Adapter -> Unified Template)
    getChartTemplates: () => api.get<any[]>('/templates', { params: { category: 'chart' } }).then(res => {
        return res.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            isCustom: t.config?.isCustom || false,
            type: t.type,
            icon: t.icon,
            customSpec: t.config?.customSpec,
            chartParams: t.config?.chartParams
        }));
    }),
    createChartTemplate: (temp: ChartTemplate) => {
        const template = {
            name: temp.name,
            description: temp.description,
            type: temp.type,
            category: 'chart',
            content: null,
            config: {
                isCustom: temp.isCustom,
                customSpec: temp.customSpec,
                chartParams: temp.chartParams
            },
            icon: temp.icon
        };
        return api.post<any>('/templates', template).then(res => ({
            id: res.data.id,
            name: res.data.name,
            description: res.data.description,
            isCustom: res.data.config?.isCustom || false,
            type: res.data.type,
            icon: res.data.icon,
            customSpec: res.data.config?.customSpec,
            chartParams: res.data.config?.chartParams
        }));
    },
    updateChartTemplate: (id: number, temp: ChartTemplate) => {
        const template = {
            name: temp.name,
            description: temp.description,
            type: temp.type,
            category: 'chart',
            content: null,
            config: {
                isCustom: temp.isCustom,
                customSpec: temp.customSpec,
                chartParams: temp.chartParams
            },
            icon: temp.icon
        };
        return api.put<any>(`/templates/${id}`, template).then(res => ({
            id: res.data.id,
            name: res.data.name,
            description: res.data.description,
            isCustom: res.data.config?.isCustom || false,
            type: res.data.type,
            icon: res.data.icon,
            customSpec: res.data.config?.customSpec,
            chartParams: res.data.config?.chartParams
        }));
    },
    deleteChartTemplate: (id: number) => api.delete(`/templates/${id}`),

    // Saved Components
    getSavedComponents: () => api.get<SavedComponent[]>('/saved-components').then(res => res.data),
    createSavedComponent: (comp: SavedComponent) => api.post<SavedComponent>('/saved-components', comp).then(res => res.data),
    deleteSavedComponent: (id: number) => api.delete(`/saved-components/${id}`),

    // AI (SiliconFlow via backend)
    aiGenerateDatasetSQL: (dataSourceId: number, tableIds: number[], userQuery: string, skipAutoSelect: boolean = false) =>
        api.post<{sql: string, explanation: string, relevantTableIds?: number[]}>('/ai/generate-dataset-sql', { dataSourceId, tableIds, userQuery, skipAutoSelect }).then(res => res.data),
    aiSelectTables: (dataSourceId: number, userQuery: string) =>
        api.post<{selectedTableIds: number[]}>('/ai/select-tables', { dataSourceId, userQuery }).then(res => res.data),
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
