
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  FolderOpen, 
  Save, 
  PanelRightOpen, 
  Bot,
  Database,
  ChevronDown,
  Settings,
  FileCode,
  LayoutTemplate,
  Box,
  MonitorPlay,
  CheckSquare,
  Rocket,
  Eye,
  Filter,
  FileText,
  AlertTriangle
} from 'lucide-react';

import { 
  DataSource, 
  Dataset, 
  Dashboard, 
  WebComponentTemplate, 
  ChartTemplate, 
  ChartConfig, 
  DatabaseConfig,
  TableData,
  ExportPackage,
  WidgetLayout,
  DashboardWidget,
  SavedComponent
} from './types';

import { apiService } from './services/api';

import { MOCK_AVAILABLE_TABLES, BASIC_WEB_COMPONENTS } from './constants';

// Component Imports
import { DataSourceManager } from './components/DataSourceManager';
import { DatasetManager } from './components/DatasetManager';
import { TemplateManager } from './components/TemplateManager';
import { ComponentManager } from './components/ComponentManager';
import { DashboardManager } from './components/DashboardManager';
import { ReportHistoryManager } from './components/ReportHistoryManager';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import { ImportTableModal } from './components/ImportTableModal';
import { TablePreviewModal } from './components/TablePreviewModal';
import { SaveDashboardModal } from './components/SaveDashboardModal';
import { DashboardHistoryModal } from './components/DashboardHistoryModal';
import { PublishDashboardModal } from './components/PublishDashboardModal';
import { AnnotationEditorModal } from './components/AnnotationEditorModal';
import { DatasetBuilderModal } from './components/DatasetBuilderModal';
import { ChartLibraryModal } from './components/ChartLibraryModal';
import { WebComponentBuilderModal } from './components/WebComponentBuilderModal';
import { ChartGenerationModal } from './components/ChartGenerationModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { DashboardImportModal } from './components/DashboardImportModal';
import { PublishedView } from './components/PublishedView';
import { FilterExtractionModal } from './components/FilterExtractionModal';
import { AppHeader } from './components/AppHeader';
import { DashboardCanvas } from './components/DashboardCanvas';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentViewFromPath = (path: string) => {
      if (path === '/' || path === '') return 'dashboard';
      if (path.includes('/management/datasource')) return 'management';
      if (path.includes('/management/datasets')) return 'datasets';
      if (path.includes('/management/history-reports')) return 'history-reports';
      if (path.includes('/management/component-management')) return 'component-management';
      if (path.includes('/management/template-management')) return 'template-management';
      if (path.includes('/management/dashboard-management')) return 'dashboard-management';
      return 'dashboard';
  };

  const currentView = getCurrentViewFromPath(location.pathname);

  const setCurrentView = (view: string) => {
      switch (view) {
        case 'dashboard': navigate('/'); break;
        case 'management': navigate('/management/datasource'); break;
        case 'datasets': navigate('/management/datasets'); break;
        case 'history-reports': navigate('/management/history-reports'); break;
        case 'component-management': navigate('/management/component-management'); break;
        case 'template-management': navigate('/management/template-management'); break;
        case 'dashboard-management': navigate('/management/dashboard-management'); break;
        default: navigate('/');
      }
  };

  // --- State Management ---
  // const [currentView, setCurrentView] = useState<'dashboard' | 'management' | 'datasets' | 'component-management' | 'dashboard-management' | 'history-reports'>('dashboard');
  
  // Data State
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [webComponents, setWebComponents] = useState<WebComponentTemplate[]>([]);
  const [chartTemplates, setChartTemplates] = useState<ChartTemplate[]>([]);
  const [savedComponents, setSavedComponents] = useState<SavedComponent[]>([]);
  
  // Active Context State
  const [activeDashboardId, setActiveDashboardId] = useState<number | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Editor Global Filter State
  const [topFilters, setTopFilters] = useState<Record<string, string>>({});

  // Menu States
  const [isDataAssetsMenuOpen, setIsDataAssetsMenuOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);

  // Modal States
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isImportTableModalOpen, setIsImportTableModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [isDatasetBuilderOpen, setIsDatasetBuilderOpen] = useState(false);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [isWebComponentBuilderOpen, setIsWebComponentBuilderOpen] = useState(false);
  const [isChartGenerationModalOpen, setIsChartGenerationModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterExtractionModalOpen, setIsFilterExtractionModalOpen] = useState(false);

  // Selection/Editing State
  const [editingConfig, setEditingConfig] = useState<DatabaseConfig | null>(null);
  const [editingDataSourceId, setEditingDataSourceId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [importTargetSourceId, setImportTargetSourceId] = useState<number | null>(null);
  const [previewTable, setPreviewTable] = useState<TableData | null>(null);
  const [previewSql, setPreviewSql] = useState<string | undefined>(undefined);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [preSelectedDataSourceId, setPreSelectedDataSourceId] = useState<number | null>(null);
  const [annotationDataSource, setAnnotationDataSource] = useState<DataSource | null>(null);
  const [selectedChartTypeForGeneration, setSelectedChartTypeForGeneration] = useState<string | null>(null);
  const [templateToSave, setTemplateToSave] = useState<ChartConfig | null>(null);
  const [isSavingForDashboard, setIsSavingForDashboard] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<ExportPackage | null>(null);

  // Drag and Drop State
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  // Refs
  const importFileRef = useRef<HTMLInputElement>(null);

  // --- Initialization & Persistence ---

  // Check URL for share mode
  const [mode, setMode] = useState<'edit' | 'share'>('edit');
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'share' && params.get('id')) {
      setMode('share');
      setShareId(params.get('id'));
    }
  }, []);

  useEffect(() => {
    // Load from API
    const loadData = async () => {
      try {
        const [ds, dsets, dbs, comps, temps, savedComps] = await Promise.all([
          apiService.getDataSources(),
          apiService.getDatasets(),
          apiService.getDashboards(),
          apiService.getWebComponents(),
          apiService.getChartTemplates(),
          apiService.getSavedComponents()
        ]);

        setDataSources(ds);
        setDatasets(dsets);
        setWebComponents(comps);
        setChartTemplates(temps);
        setSavedComponents(savedComps);

        if (dbs.length > 0) {
          setDashboards(dbs);
          setActiveDashboardId(dbs[0].id);
        } else {
          // Init default dashboard
          const defaultDashboard: Dashboard = {
            id: Date.now(),
            name: '默认仪表盘',
            description: 'My first dashboard',
            widgets: [],
            createdAt: Date.now()
          };
          // Create default dashboard in backend
          try {
             await apiService.createDashboard(defaultDashboard);
             setDashboards([defaultDashboard]);
             setActiveDashboardId(defaultDashboard.id);
          } catch (err) {
             console.error("Failed to create default dashboard", err);
          }
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };

    loadData();
  }, []);

  // Click Outside Handler for Menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDataAssetsMenuOpen && !target.closest('#data-assets-menu-container')) {
        setIsDataAssetsMenuOpen(false);
      }
      if (isDashboardMenuOpen && !target.closest('#dashboard-menu-container')) {
        setIsDashboardMenuOpen(false);
      }
    };

    if (isDataAssetsMenuOpen || isDashboardMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDataAssetsMenuOpen, isDashboardMenuOpen]);

  // Reset top filters when dashboard changes
  useEffect(() => {
    setTopFilters({});
  }, [activeDashboardId]);

  // --- Derived State ---

  const activeDashboard = useMemo(() => {
    return dashboards.find(d => d.id === activeDashboardId) || dashboards[0] || { id: -1, name: 'Loading...', widgets: [], createdAt: Date.now() };
  }, [dashboards, activeDashboardId]);

  const activeDataSources = useMemo(() => {
    if (!activeDashboard) return [];
    // Include those used by datasets that are used by widgets
    const widgetDatasetIds = activeDashboard.widgets.map(w => w.datasetId || w.tableId);
    const relevantDatasets = datasets.filter(d => widgetDatasetIds.includes(d.id));
    const datasetSourceIds = relevantDatasets.map(d => d.dataSourceId);
    const implicit = dataSources.filter(ds => datasetSourceIds.includes(ds.id));
    
    // De-duplicate
    const map = new Map();
    [...implicit].forEach(ds => map.set(ds.id, ds));
    return Array.from(map.values());
  }, [dataSources, activeDashboard, datasets]);

  const dashboardTables = useMemo(() => {
    const sourceTables = activeDataSources.flatMap(ds => ds.tables);
    const datasetTables = datasets
      .filter(d => d.previewData)
      .map(d => ({
        ...d.previewData!,
        id: d.id, 
        name: d.name,
        description: d.description || d.previewData?.description
      }));
    return [...sourceTables, ...datasetTables];
  }, [activeDataSources, datasets]);

  const selectedContextTables = dashboardTables;

  const handleTopFilterChange = (column: string, value: string) => {
     setTopFilters(prev => {
        const next = { ...prev };
        if (value === '__ALL__') {
           delete next[column];
        } else {
           next[column] = value;
        }
        return next;
     });
  };

  // --- Handlers (Existing handlers remain unchanged) ---

  const handleCreateDashboard = async () => {
    const newDashboard: Dashboard = {
      id: Date.now(),
      name: '未命名仪表盘',
      // dataSourceIds: [], // Removed
      widgets: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      const created = await apiService.createDashboard(newDashboard);
      setDashboards(prev => [created, ...prev]);
      setActiveDashboardId(created.id);
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Failed to create dashboard", err);
    }
  };

  const handleDeleteDashboard = async (id: number) => {
    try {
      await apiService.deleteDashboard(id);
      const newDashboards = dashboards.filter(d => d.id !== id);
      if (newDashboards.length === 0) {
        handleCreateDashboard();
      } else {
        setDashboards(newDashboards);
        if (activeDashboardId === id) {
          setActiveDashboardId(newDashboards[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete dashboard", err);
    }
  };

  const handleRenameDashboard = async (id: number, newName: string) => {
    const dashboard = dashboards.find(d => d.id === id);
    if (!dashboard) return;
    
    const updated = { ...dashboard, name: newName, updatedAt: Date.now() };
    try {
      await apiService.updateDashboard(id, updated);
      setDashboards(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error("Failed to rename dashboard", err);
    }
  };

  const handleSaveDashboardName = (name: string) => {
    if (activeDashboard) {
      handleRenameDashboard(activeDashboard.id, name);
    }
  };

  const handleExportDashboardPackage = (id: number) => {
    const d = dashboards.find(dash => dash.id === id);
    if (!d) return;
    const dataStr = JSON.stringify(d, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${d.name}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DataSource Handlers
  const openCreateDataSourceModal = () => {
    setEditingConfig(null);
    setEditingDataSourceId(null);
    setEditingDescription('');
    setIsDbModalOpen(true);
  };

  const openEditDataSourceModal = (id: number) => {
    const ds = dataSources.find(d => d.id === id);
    if (ds) {
      setEditingConfig(ds.config);
      setEditingDataSourceId(id);
      setEditingDescription(ds.description || '');
      setIsDbModalOpen(true);
    }
  };

  const handleSaveDataSource = async (config: DatabaseConfig, description: string) => {
    try {
      if (editingDataSourceId) {
        const ds = dataSources.find(d => d.id === editingDataSourceId);
        if (ds) {
          const updated = { ...ds, config, name: config.name, description };
          await apiService.updateDataSource(ds.id, updated);
          setDataSources(prev => prev.map(d => d.id === editingDataSourceId ? updated : d));
        }
      } else {
        const newDS: DataSource = {
          id: Date.now(),
          name: config.name,
          description: description || '',
          config,
          tables: []
        };
        const created = await apiService.createDataSource(newDS);
        setDataSources(prev => [...prev, created]);
      }
      setIsDbModalOpen(false);
      setEditingDataSourceId(null);
      setEditingConfig(null);
      setEditingDescription('');
    } catch (err) {
      console.error("Failed to save datasource", err);
    }
  };

  const handleDeleteDataSource = async (id: number) => {
    try {
      await apiService.deleteDataSource(id);
      setDataSources(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error("Failed to delete datasource", err);
    }
  };

  const openAnnotateModal = (id: number) => {
    const ds = dataSources.find(d => d.id === id);
    if (ds) {
      setAnnotationDataSource(ds);
      setIsAnnotationModalOpen(true);
    }
  };

  const handleUpdateAnnotations = async (id: number, description: string, tables: TableData[]) => {
    const ds = dataSources.find(d => d.id === id);
    if (!ds) return;
    
    const updated = { ...ds, description, tables };
    try {
      await apiService.updateDataSource(id, updated);
      setDataSources(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error("Failed to update datasource annotations", err);
    }
  };

  const handleImportTable = (sourceId: number) => {
    setImportTargetSourceId(sourceId);
    setIsImportTableModalOpen(true);
  };

  const confirmImportTable = async (table: TableData) => {
    if (importTargetSourceId) {
      const ds = dataSources.find(d => d.id === importTargetSourceId);
      if (ds) {
         if (ds.tables.find(t => t.id === table.id)) {
            setIsImportTableModalOpen(false);
            return;
         }
         const updatedTables = [...ds.tables, { ...table, dataSourceId: ds.id }];
         const updatedDS = { ...ds, tables: updatedTables };
         
         try {
           await apiService.updateDataSource(ds.id, updatedDS);
           setDataSources(prev => prev.map(d => d.id === importTargetSourceId ? updatedDS : d));
         } catch (err) {
            console.error("Failed to import table", err);
         }
      }
    }
    setIsImportTableModalOpen(false);
  };

  // Dataset Handlers
  const handleSaveDataset = async (dataset: Dataset) => {
    try {
      const exists = datasets.find(d => d.id === dataset.id);
      if (exists) {
        await apiService.updateDataset(dataset.id, dataset);
        setDatasets(prev => prev.map(d => d.id === dataset.id ? dataset : d));
      } else {
        const created = await apiService.createDataset(dataset);
        setDatasets(prev => [...prev, created]);
      }
    } catch (err) {
      console.error("Failed to save dataset", err);
    }
  };

  const checkDatasetUsage = (dataset: Dataset): { inUse: boolean; message?: string } => {
    for (const dashboard of dashboards) {
      if (!dashboard.widgets) continue;
      for (const widget of dashboard.widgets) {
        // Check by ID
        const dsId = widget.datasetId || widget.tableId;
        if (String(dsId) === String(dataset.id)) {
           return {
             inUse: true,
             message: `无法删除数据集 "${dataset.name}"，因为它正在被仪表盘 "${dashboard.name}" 中的组件 "${widget.config?.title || 'Unknown'}" 使用。\n请先删除或修改相关组件。`
           };
        }
        // Check by Name
        if (dataset.name && widget.config?.tableName === dataset.name) {
           return {
             inUse: true,
             message: `无法删除数据集 "${dataset.name}"，因为它正在被仪表盘 "${dashboard.name}" 中的组件 "${widget.config?.title || 'Unknown'}" 使用。\n请先删除或修改相关组件。`
           };
        }
      }
    }
    return { inUse: false };
  };

  const handleDeleteDataset = async (id: number) => {
    try {
       await apiService.deleteDataset(id);
       setDatasets(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
       console.error("Failed to delete dataset", err);
       if (err.response && err.response.data && err.response.data.detail) {
           alert(err.response.data.detail);
       } else {
           alert("删除失败，请稍后重试");
       }
    }
  };

  const handleRefreshWidgetData = async (widgetId: string) => {
    const widget = activeDashboard.widgets.find(w => String(w.id) === widgetId);
    if (!widget) return;
    
    // 1. Resolve Dataset
    const dsId = widget.datasetId || widget.tableId;
    const dataset = datasets.find(d => d.id === dsId);
    
    if (!dataset || !dataset.dataSourceId) return;
    
    // 2. Resolve DataSource
    const activeDS = dataSources.find(ds => ds.id === dataset.dataSourceId);
    if (!activeDS) return;

    try {
        // 3. Execute SQL
        const payload = {
            type: activeDS.config.type,
            host: activeDS.config.host,
            port: activeDS.config.port,
            username: activeDS.config.username,
            password: activeDS.config.password,
            serviceName: activeDS.config.serviceName,
            database: (activeDS.config as any).database,
            sql: dataset.sql, // Use dataset SQL
            limit: 100
        };
        
        // If widget has specific SQL (e.g. custom query), use it? 
        // Usually widgets use dataset's data. If widget.config.sql exists, it might be just for display or derived.
        // Let's stick to dataset.sql for now as that's the source of truth for the dataset.

        const result = await apiService.executeSql(payload);
        
        if (result.success && result.rows) {
            // 4. Update Dataset Preview Data (Local State)
            
            // Reconstruct columns if needed
            let columns = dataset.previewData?.columns || [];
            if (columns.length === 0 && result.columns) {
                 columns = result.columns.map(name => ({ name, type: 'string' }));
            }

            const updatedTable: TableData = {
                id: dataset.id,
                name: dataset.name,
                columns: columns,
                rows: result.rows,
                description: dataset.description,
                dataSourceId: activeDS.id
            };

            // Update local state
            setDatasets(prev => prev.map(d => {
                if (d.id === dataset.id) {
                    return { ...d, previewData: updatedTable };
                }
                return d;
            }));
            
            console.log(`Auto-refreshed data for widget ${widget.config.title}`);
        }
    } catch (error) {
        console.error("Auto-refresh failed for widget", widgetId, error);
    }
  };

  const handleNavigateToSource = (sourceId: number) => {
    setCurrentView('management');
  };

  const handleCreateDatasetFromSource = (sourceId: number) => {
    setPreSelectedDataSourceId(sourceId);
    setEditingDataset(null);
    setCurrentView('datasets');
    setIsDatasetBuilderOpen(true);
  };

  // Web Component Handlers
  const handleSaveWebComponent = async (comp: WebComponentTemplate) => {
    try {
      // Ensure we are working with a valid ID for the backend (must be positive integer)
      // If it's a string or negative (basic template), treat as new component
      let finalComp = { ...comp };
      let isUpdate = false;
      const originalId = comp.id;

      if (typeof comp.id === 'string' || comp.id < 0) {
         finalComp.id = Date.now();
      } else {
         // It's a potentially existing user component (positive integer)
         const exists = webComponents.find(c => c.id === comp.id);
         if (exists) {
            isUpdate = true;
         }
      }

      if (isUpdate && typeof originalId === 'number') {
         // Since I don't have update API, and I don't want to change backend right now (to minimize context switch),
         // I will delete then create.
         await apiService.deleteWebComponent(originalId);
      }
      
      const created = await apiService.createWebComponent(finalComp);
      
      setWebComponents(prev => {
         // If we updated (deleted & recreated), replace the old one
         if (isUpdate) {
             return prev.map(c => c.id === originalId ? created : c);
         }
         // Otherwise add new
         return [...prev, created];
      });
    } catch (err) {
      console.error("Failed to save web component", err);
    }
  };

  // Direct add from builder modal without prompt
  const handleWebComponentAddToDashboard = async (comp: WebComponentTemplate, datasetId?: number | string) => {
     await handleSaveWebComponent(comp);
     addWebComponentToDashboard(comp, datasetId);
  };

  const addWebComponentToDashboard = (comp: WebComponentTemplate, datasetId?: number | string) => {
      // Default to first available table if any
      let defaultTableId: number;
      if (datasetId && typeof datasetId === 'number') {
          defaultTableId = datasetId;
      } else if (datasetId && typeof datasetId === 'string' && !isNaN(Number(datasetId)) && datasetId !== '') {
          defaultTableId = Number(datasetId);
      } else if (comp.datasetId) {
          defaultTableId = comp.datasetId;
      } else {
          // If no dataset is bound, we might want to use a dummy ID or the first one.
          // However, for web components that don't need data, it might be fine to have invalid ID.
          // But our system usually expects a valid dataset ID if we want to run queries.
          // If the component was generated with "No Dataset", comp.datasetId is undefined.
          // In that case, maybe we shouldn't force a dataset ID?
          // But dashboard widgets usually need a tableId (legacy).
          // Let's keep existing fallback behavior but prioritize comp.datasetId.
          const dashboardTables = datasets; // Alias for clarity, datasets are tables here
          defaultTableId = dashboardTables.length > 0 ? dashboardTables[0].id : (Date.now() + Math.floor(Math.random() * 10000) + 30000);
      }
      
      const widget: DashboardWidget = {
          id: `widget_${Date.now()}`,
          config: {
             type: 'web-component',
             title: comp.name,
             description: comp.description,
             xAxisKey: '',
             dataKeys: [],
             webComponentCode: comp.code
          },
          datasetId: defaultTableId,
          tableId: defaultTableId, // Legacy
          timestamp: Date.now(),
          layout: { colSpan: 6, height: 400 }
      };
       addDashboardWidget(widget.config, '', widget.tableId);
  };

  const handleDeleteWebComponent = async (id: number) => {
    try {
      await apiService.deleteWebComponent(id);
      setWebComponents(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Failed to delete web component", err);
    }
  };

  // Chart Template Handlers
  const handleSaveChartTemplate = async (template: ChartTemplate) => {
    try {
      const exists = chartTemplates.find(t => t.id === template.id);
      if (exists) {
         const updated = await apiService.updateChartTemplate(template.id, template);
         setChartTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
      } else {
         const created = await apiService.createChartTemplate(template);
         setChartTemplates(prev => [...prev, created]);
      }
    } catch (err) {
      console.error("Failed to save chart template", err);
    }
  };
  
  const handleDeleteChartTemplate = async (id: number) => {
    try {
      await apiService.deleteChartTemplate(id);
      setChartTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete chart template", err);
    }
  };

  const handleDeleteSavedComponent = async (id: number) => {
    try {
      await apiService.deleteSavedComponent(id);
      setSavedComponents(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Failed to delete saved component", err);
    }
  };

  // Dashboard Widget Logic
  const addDashboardWidget = async (config: ChartConfig, tableName: string, overrideTableId?: number) => {
    if (!activeDashboardId) return;
    
    // Logic for Saved Component is handled before calling this, but we can double check or expand.
    // If overrideTableId is provided, use it. Otherwise try to find table ID. 
    
    const table = dashboardTables.find(t => t.name === tableName);
    const tableId = overrideTableId !== undefined ? overrideTableId : (table ? table.id : 0);

    const newWidget: DashboardWidget = {
      id: `w_${Date.now()}`,
      config: { ...config, tableName },
      datasetId: tableId,
      tableId, // Keep for legacy
      timestamp: Date.now(),
      layout: { colSpan: 6, height: 400 }
    };
    
    const dashboard = dashboards.find(d => d.id === activeDashboardId);
    if (dashboard) {
        const updatedDashboard = {
          ...dashboard,
          widgets: [...dashboard.widgets, newWidget],
          updatedAt: Date.now()
        };
        try {
          const savedDashboard = await apiService.updateDashboard(dashboard.id, updatedDashboard);
          setDashboards(prev => prev.map(d => d.id === activeDashboardId ? savedDashboard : d));
        } catch (err) {
          console.error("Failed to add widget", err);
        }
    }
  };

  const removeWidget = async (widgetId: string | number) => {
    if (!activeDashboardId) return;

    const dashboard = dashboards.find(d => d.id === activeDashboardId);
    if (dashboard) {
        const updatedDashboard = {
          ...dashboard,
          widgets: dashboard.widgets.filter(w => w.id !== widgetId),
          updatedAt: Date.now()
        };
        try {
          const savedDashboard = await apiService.updateDashboard(dashboard.id, updatedDashboard);
          setDashboards(prev => prev.map(d => d.id === activeDashboardId ? savedDashboard : d));
        } catch (err) {
           console.error("Failed to remove widget", err);
        }
    }
  };

  const updateWidgetLayout = async (widgetId: string | number, layout: WidgetLayout) => {
    if (!activeDashboardId) return;

    const dashboard = dashboards.find(d => d.id === activeDashboardId);
    if (dashboard) {
        const updatedDashboard = {
          ...dashboard,
          widgets: dashboard.widgets.map(w => w.id === widgetId ? { ...w, layout } : w),
          updatedAt: Date.now()
        };
        try {
           // This might be too frequent for API calls if called on drag.
           // Usually drag/drop updates are debounced or done on end.
           // Assuming this is called on drag end.
           const savedDashboard = await apiService.updateDashboard(dashboard.id, updatedDashboard);
           setDashboards(prev => prev.map(d => d.id === activeDashboardId ? savedDashboard : d));
        } catch (err) {
           console.error("Failed to update widget layout", err);
        }
    }
  };

  const updateWidgetConfig = async (widgetId: string | number, config: ChartConfig) => {
    if (!activeDashboardId) return;

    const dashboard = dashboards.find(d => d.id === activeDashboardId);
    if (dashboard) {
        const updatedDashboard = {
          ...dashboard,
          widgets: dashboard.widgets.map(w => w.id === widgetId ? { ...w, config } : w),
          updatedAt: Date.now()
        };
        try {
          const savedDashboard = await apiService.updateDashboard(dashboard.id, updatedDashboard);
          setDashboards(prev => prev.map(d => d.id === activeDashboardId ? savedDashboard : d));
        } catch (err) {
          console.error("Failed to update widget config", err);
        }
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    setDraggingWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId?: string | number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId && targetId !== dragTargetId && targetId !== draggingWidgetId) {
        setDragTargetId(targetId);
    }
  };

  const handleDragEnd = () => {
    setDraggingWidgetId(null);
    setDragTargetId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string | number) => {
    e.preventDefault();
    console.log('Drop event:', { draggingWidgetId, targetId });
    if (!draggingWidgetId || draggingWidgetId === targetId || !activeDashboardId) return;

    const dashboard = dashboards.find(d => d.id === activeDashboardId);
    if (!dashboard) return;

    const widgets = [...dashboard.widgets];
    const dragIndex = widgets.findIndex(w => w.id === draggingWidgetId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);
    
    console.log('Indices:', { dragIndex, targetIndex });

    if (dragIndex !== -1 && targetIndex !== -1) {
       const [removed] = widgets.splice(dragIndex, 1);
       widgets.splice(targetIndex, 0, removed);

       // Update layout rank to persist order
       const updatedWidgets = widgets.map((w, index) => ({
          ...w,
          layout: { ...w.layout, i: index }
       }));

       const updatedDashboard = { ...dashboard, widgets: updatedWidgets, updatedAt: Date.now() };
       
       // Optimistic update - Local only
       setDashboards(prev => prev.map(d => d.id === activeDashboardId ? updatedDashboard : d));
       
       // Note: We don't save to backend immediately. 
       // User must click "Save Config" to persist changes.
    }
    setDraggingWidgetId(null);
    setDragTargetId(null);
  };

  const handleAddComponentFromLibrary = (type: string) => {
    if (type === '__GENERATE_CHART__') {
       setSelectedChartTypeForGeneration('');
       setIsChartGenerationModalOpen(true);
    } else if (type === '__CREATE_NEW__') {
       setIsWebComponentBuilderOpen(true);
    } else if (type.startsWith('saved:')) {
       // Handle Saved Component
       const savedId = parseInt(type.split(':')[1]);
       const savedComp = savedComponents.find(c => c.id === savedId);
       if (savedComp) {
           // We need to find the related dataset to get table info
           // Although we can just pass the config and datasetId/tableName
           const dataset = datasets.find(d => d.id === savedComp.datasetId);
           const tableName = dataset ? dataset.name : '';
           const tableId = dataset ? dataset.id : undefined;

           addDashboardWidget(savedComp.config, tableName, tableId);
       }
    } else if (type.startsWith('web:')) {
       const compId = type.split(':')[1];
       // Check user components first, then basic components
       let comp = webComponents.find(c => String(c.id) === compId);
       if (!comp) {
          comp = BASIC_WEB_COMPONENTS.find(c => String(c.id) === compId);
       }

       if (comp) {
          // Find bound dataset if any
          const dataset = datasets.find(d => d.id === Number(comp.datasetId));
          const tableId = comp.datasetId ? Number(comp.datasetId) : undefined;
          const tableName = dataset ? dataset.name : '';

          const config: ChartConfig = {
                type: 'web-component',
                title: comp.name,
                description: comp.description,
                xAxisKey: '',
                dataKeys: [],
                webComponentCode: comp.code,
                tableName: tableName
          };

          addDashboardWidget(config, tableName, tableId);
       }
    } else {
       const template = chartTemplates.find(t => t.id === type);
       if (template) {
           if (template.isCustom) {
               setSelectedChartTypeForGeneration(template.type); 
               setIsChartGenerationModalOpen(true);
           } else {
               setSelectedChartTypeForGeneration(template.type);
               setIsChartGenerationModalOpen(true);
           }
       } else {
          setSelectedChartTypeForGeneration(type);
          setIsChartGenerationModalOpen(true);
       }
    }
  };

  const handleAddToDashboardFromGeneration = (config: ChartConfig, dataset: Dataset) => {
    setIsSavingForDashboard(true);
    openSaveTemplateModal(config, dataset.id);
  };

  const handleConfirmSaveTemplate = async (name: string, description: string) => {
    if (templateToSave) {
       // Check if this is a "Component" save (with data binding) or "Template" save
       const configWithDataset = templateToSave as (ChartConfig & { _datasetId?: number });

       if (configWithDataset._datasetId) {
          // Save as Component
          const newComponent: SavedComponent = {
              id: Date.now(),
              name,
              description,
              datasetId: configWithDataset._datasetId,
              config: templateToSave,
              createdAt: Date.now()
          };
          try {
              const created = await apiService.createSavedComponent(newComponent);
              setSavedComponents(prev => [...prev, created]);

              // If saving for dashboard, add it now
              if (isSavingForDashboard) {
                 const dataset = datasets.find(d => d.id === configWithDataset._datasetId);
                 const tableName = dataset ? dataset.name : '';
                 const tableId = dataset ? dataset.id : undefined;
                 addDashboardWidget(created.config, tableName, tableId);
              }
          } catch (err) {
              console.error("Failed to save component", err);
          }
       } else {
          // Save as Template (Existing Logic)
           const newTemplate: ChartTemplate = {
              id: Date.now(),
              name,
              description,
              isCustom: false,
              type: templateToSave.type,
              icon: 'LayoutTemplate',
              customSpec: templateToSave.customSpec,
              chartParams: templateToSave.chartParams
           };
           try {
             const created = await apiService.createChartTemplate(newTemplate);
             setChartTemplates(prev => [...prev, created]);
           } catch (err) {
             console.error("Failed to save template", err);
           }
       }
       
       // Reset states
       setIsSavingForDashboard(false);
       setTemplateToSave(null);
    }
  };
  
  const openSaveTemplateModal = (config: ChartConfig, datasetId?: number) => {
     // If datasetId is provided, we attach it to config temporarily to pass to confirm handler
     const configToSave = datasetId ? { ...config, _datasetId: datasetId } : config;
     setTemplateToSave(configToSave);
     setIsSaveTemplateModalOpen(true);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.version && json.dashboard) {
           setPendingImportData(json);
           setIsImportModalOpen(true);
        } else {
           alert("无效的仪表盘配置文件");
        }
      } catch (err) {
        alert("文件解析失败");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async (newName: string) => {
    if (pendingImportData) {
       const { dashboard, dataSources: importedDS, datasets: importedDatasets } = pendingImportData;
       
       const dsMap = new Map<number, number>();
       const createdDS: DataSource[] = [];
       
       try {
           // Import DataSources
           for (const ds of importedDS) {
              const newId = Date.now() + Math.floor(Math.random() * 10000);
              dsMap.set(ds.id, newId);
              // Need to handle potential type mismatch if imported data has string IDs
              // But we are generating new number IDs anyway.
              // We also need to update table dataSourceId
              const newDS = { ...ds, id: newId, tables: ds.tables.map(t => ({...t, dataSourceId: newId})) };
              const created = await apiService.createDataSource(newDS);
              createdDS.push(created);
           }
           
           // Import Datasets
           const createdDatasets: Dataset[] = [];
           
           for (const d of importedDatasets) {
              const newId = Date.now() + Math.floor(Math.random() * 10000) + 10000;
              // Map old source IDs to new ones
              const newSourceId = dsMap.get(d.dataSourceId) || d.dataSourceId;
              const newDataset = { ...d, id: newId, dataSourceId: newSourceId };
              const created = await apiService.createDataset(newDataset);
              createdDatasets.push(created);
           }

           // Import Dashboard
           const newDashboard: Dashboard = {
             ...dashboard,
             id: Date.now() + Math.floor(Math.random() * 10000) + 20000,
             name: newName,
             widgets: dashboard.widgets.map(w => ({
                ...w,
                // Try to match dataset by ID (if reused) or Name (if exported/imported)
                tableId: createdDatasets.find(nd => importedDatasets.find(od => od.id === w.tableId)?.name === nd.name)?.id || w.tableId
             })),
              createdAt: Date.now(),
              updatedAt: Date.now()
           };

           const createdDash = await apiService.createDashboard(newDashboard);

           setDataSources(prev => [...prev, ...createdDS]);
           setDatasets(prev => [...prev, ...createdDatasets]);
           setDashboards(prev => [createdDash, ...prev]);
           setActiveDashboardId(createdDash.id);
       } catch (err) {
           console.error("Failed to import dashboard package", err);
           alert("导入失败，请检查控制台日志");
       }
    }
  };

  const handlePreviewDashboard = () => {
     setIsPreviewMode(true);
  };

  const handleUpdateDashboard = async (updates: Partial<Dashboard>) => {
     if (activeDashboard) {
        try {
            const updated = { ...activeDashboard, ...updates };
            const savedDashboard = await apiService.updateDashboard(activeDashboard.id, updated);
            setDashboards(prev => prev.map(d => d.id === activeDashboard.id ? savedDashboard : d));
        } catch (err) {
            console.error("Failed to update dashboard", err);
        }
     }
  };

  // --- Render ---

  if (mode === 'share' && shareId) {
    return <PublishedView dashboardId={shareId} />;
  }

  // Render Preview Mode (Full Screen)
  if (isPreviewMode && activeDashboardId) {
     return (
        <>
          <PublishedView 
             dashboardId={activeDashboardId} 
             onBack={() => setIsPreviewMode(false)}
             onPublish={() => setIsPublishModalOpen(true)}
             initialDashboard={activeDashboard}
             initialDataSources={dataSources}
             initialDatasets={datasets}
          />
          <PublishDashboardModal
            isOpen={isPublishModalOpen}
            onClose={() => setIsPublishModalOpen(false)}
            dashboard={activeDashboard}
          />
        </>
     );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Hidden File Input for Import */}
      <input 
        type="file"
        ref={importFileRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Top Header */}
      <AppHeader 
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeDashboard={activeDashboard}
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        setActiveDashboardId={setActiveDashboardId}
        onPreview={handlePreviewDashboard}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
      <Routes>
        <Route path="/management/datasource" element={
          <DataSourceManager 
            dataSources={dataSources}
            onBack={() => setCurrentView('dashboard')}
            onCreate={openCreateDataSourceModal}
            onEdit={openEditDataSourceModal}
            onAnnotate={openAnnotateModal}
            onImport={handleImportTable} 
            onDelete={handleDeleteDataSource}
            onCreateDataset={handleCreateDatasetFromSource}
          />
        } />
        
        <Route path="/management/datasets" element={
          <DatasetManager 
            datasets={datasets}
            dataSources={dataSources}
            onBack={() => setCurrentView('dashboard')}
            onCreate={() => {
              setEditingDataset(null);
              setIsDatasetBuilderOpen(true);
            }}
            onEdit={(d) => {
              setEditingDataset(d);
              setIsDatasetBuilderOpen(true);
            }}
            onDelete={handleDeleteDataset}
            onManageSource={handleNavigateToSource}
            checkUsage={checkDatasetUsage}
          />
        } />

        <Route path="/management/history-reports" element={
          <ReportHistoryManager
            dashboards={dashboards}
            onBack={() => setCurrentView('dashboard')}
            onSelect={(id) => {
               setActiveDashboardId(id);
               setCurrentView('dashboard');
            }}
            onDelete={handleDeleteDashboard}
            onRename={handleRenameDashboard}
            onExport={handleExportDashboardPackage}
          />
        } />

        <Route path="/management/component-management" element={
          <ComponentManager 
            components={savedComponents}
            datasets={datasets}
            onBack={() => setCurrentView('dashboard')}
            onDelete={handleDeleteSavedComponent}
          />
        } />

        <Route path="/management/template-management" element={
          <TemplateManager 
            chartTemplates={chartTemplates}
            webComponents={webComponents}
            datasets={datasets}
            onBack={() => setCurrentView('dashboard')}
            onSaveChart={handleSaveChartTemplate}
            onDeleteChart={handleDeleteChartTemplate}
            onSaveWebComponent={handleSaveWebComponent}
            onDeleteWebComponent={handleDeleteWebComponent}
          />
        } />

        <Route path="/management/dashboard-management" element={
          <DashboardManager 
            dashboards={dashboards}
            dataSources={dataSources}
            datasets={datasets}
            onBack={() => setCurrentView('dashboard')}
            onCreate={handleCreateDashboard}
            onImport={() => importFileRef.current?.click()}
            onSelect={(id) => {
               setActiveDashboardId(id);
               setCurrentView('dashboard');
            }}
            onDelete={handleDeleteDashboard}
            onRename={handleRenameDashboard}
            onExport={handleExportDashboardPackage}
            onPublish={(d) => {
               setActiveDashboardId(d.id);
               setIsPublishModalOpen(true);
            }}
          />
        } />

        <Route path="/" element={
          <DashboardCanvas
            activeDashboard={activeDashboard}
            datasets={datasets}
            activeDataSources={activeDataSources}
            dashboardTables={dashboardTables}
            webComponents={webComponents}
            selectedContextTables={selectedContextTables}
            
            isRightSidebarOpen={isRightSidebarOpen}
            setIsRightSidebarOpen={setIsRightSidebarOpen}
            topFilters={topFilters}
            onTopFilterChange={handleTopFilterChange}
            onClearTopFilters={() => setTopFilters({})}
            
            onAddWidget={addDashboardWidget}
            onRemoveWidget={removeWidget}
            onUpdateWidgetLayout={updateWidgetLayout}
            onUpdateWidgetConfig={updateWidgetConfig}
            onRefreshWidgetData={handleRefreshWidgetData}
            
            onOpenAddComponent={() => setIsAddComponentModalOpen(true)}
            onOpenFilterExtraction={() => setIsFilterExtractionModalOpen(true)}
            onOpenSaveConfig={() => setIsSaveModalOpen(true)}
            onOpenSaveTemplate={openSaveTemplateModal}
            
            draggingWidgetId={draggingWidgetId}
            dragTargetId={dragTargetId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={importFileRef}
        className="hidden"
        accept=".json"
        onChange={handleImportFile}
      />

      {/* Modals */}
      <DatabaseConfigModal 
        isOpen={isDbModalOpen} 
        onClose={() => setIsDbModalOpen(false)} 
        onConnect={handleSaveDataSource}
        initialConfig={editingConfig}
        initialDescription={editingDescription}
      />
      
      <ImportTableModal
        isOpen={isImportTableModalOpen}
        onClose={() => setIsImportTableModalOpen(false)}
        onImport={confirmImportTable}
        existingTableIds={dataSources.find(ds => ds.id === importTargetSourceId)?.tables.map(t => t.id) || []}
        dataSource={dataSources.find(ds => ds.id === importTargetSourceId) || null}
      />

      <TablePreviewModal
        isOpen={!!previewTable}
        onClose={() => {
            setPreviewTable(null);
            setPreviewSql(undefined);
        }}
        table={previewTable}
        sql={previewSql}
      />
      <SaveDashboardModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveDashboardName}
        currentName={activeDashboard.name}
      />
      <DashboardHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        dashboards={dashboards}
        activeDashboardId={activeDashboardId || ''}
        onSelect={(id) => setActiveDashboardId(id)}
        onDelete={handleDeleteDashboard}
      />
      <PublishDashboardModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        dashboard={activeDashboard}
      />
      <AnnotationEditorModal
        isOpen={isAnnotationModalOpen}
        onClose={() => setIsAnnotationModalOpen(false)}
        dataSource={annotationDataSource}
        onSave={handleUpdateAnnotations}
      />
      <DatasetBuilderModal 
        isOpen={isDatasetBuilderOpen} 
        onClose={() => {
          setIsDatasetBuilderOpen(false);
          setEditingDataset(null);
          setPreSelectedDataSourceId(null);
        }}
        dataSources={dataSources}
        onSave={handleSaveDataset}
        initialDataset={editingDataset}
        preSelectedDataSourceId={preSelectedDataSourceId}
      />
      <ChartLibraryModal 
         isOpen={isAddComponentModalOpen}
         onClose={() => setIsAddComponentModalOpen(false)}
         onSelect={handleAddComponentFromLibrary}
         currentSelection={null}
         webComponents={webComponents}
         chartTemplates={chartTemplates}
         savedComponents={savedComponents}
      />
      
      <WebComponentBuilderModal 
        isOpen={isWebComponentBuilderOpen}
        onClose={() => setIsWebComponentBuilderOpen(false)}
        onAddToDashboard={handleWebComponentAddToDashboard} // Pass the handler
        datasets={datasets}
        initialComponent={null}
      />

      <ChartGenerationModal
        isOpen={isChartGenerationModalOpen}
        onClose={() => setIsChartGenerationModalOpen(false)}
        chartType={selectedChartTypeForGeneration}
        datasets={datasets}
        onAdd={handleAddToDashboardFromGeneration}
      />
      
      <SaveTemplateModal 
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        onSave={handleConfirmSaveTemplate}
        config={templateToSave}
      />

      <DashboardImportModal 
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPendingImportData(null);
        }}
        importData={pendingImportData}
        onConfirm={handleConfirmImport}
      />

      <FilterExtractionModal 
        isOpen={isFilterExtractionModalOpen}
        onClose={() => setIsFilterExtractionModalOpen(false)}
        dashboard={activeDashboard}
        onUpdate={handleUpdateDashboard}
      />
    </div>
  );
}
