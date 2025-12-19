
import React, { useMemo, useState, useEffect } from 'react';
import { LayoutDashboard, ArrowLeft, Filter, Rocket } from 'lucide-react';
import { Dashboard, DataSource, Dataset, TableData } from '../types';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import { apiService } from '../services/api';

interface PublishedViewProps {
  dashboardId: string;
  onBack?: () => void;
  onPublish?: () => void;
  initialDashboard?: Dashboard;
  initialDataSources?: DataSource[];
  initialDatasets?: Dataset[];
}

export const PublishedView: React.FC<PublishedViewProps> = ({ 
  dashboardId, 
  onBack,
  onPublish,
  initialDashboard,
  initialDataSources,
  initialDatasets
}) => {
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard || null);
  const [dataSources, setDataSources] = useState<DataSource[]>(initialDataSources || []);
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets || []);
  const [loading, setLoading] = useState(!initialDashboard);
  
  // Top Bar Filter State: { [columnName]: selectedValue }
  const [topFilters, setTopFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    // If we received initial data (Preview Mode), we update it if props change, 
    // but typically we don't need to fetch from LS.
    if (initialDashboard) {
       setDashboard(initialDashboard);
       if (initialDataSources) setDataSources(initialDataSources);
       if (initialDatasets) setDatasets(initialDatasets);
       setLoading(false);
       return;
    }

    // Otherwise (Share Mode), fetch from API
    const loadData = async () => {
      try {
        const [savedDashboards, savedSources, savedDatasets] = await Promise.all([
           apiService.getDashboards(),
           apiService.getDataSources(),
           apiService.getDatasets()
        ]);
        
        const found = savedDashboards.find((d: Dashboard) => d.id === dashboardId);
        
        // Migration fix similar to App.tsx
        if (found) {
           found.widgets = found.widgets.map((w: any) => {
              let colSpan = w.layout.colSpan;
              if (colSpan === 1) colSpan = 6;
              if (colSpan === 2) colSpan = 12;
              return { ...w, layout: { ...w.layout, colSpan } };
           });
        }

        setDashboard(found || null);
        setDataSources(savedSources);
        setDatasets(savedDatasets);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dashboardId, initialDashboard, initialDataSources, initialDatasets]);

  const dashboardTables = useMemo(() => {
    const sourceTables = dataSources.flatMap(ds => ds.tables);
    const datasetTables = datasets
      .filter(d => d.previewData)
      .map(d => ({
        ...d.previewData!,
        id: d.id, 
        name: d.name,
        description: d.description || d.previewData?.description
      }));
    return [...sourceTables, ...datasetTables];
  }, [dataSources, datasets]);

  // --- Logic to build Top Filter Bar ---
  // 1. Identify which widgets are extracted
  // 2. Collect unique filter columns from those widgets
  // 3. Compute unique values for those columns (requires scanning data)
  
  const extractedFilters = useMemo(() => {
    if (!dashboard || !dashboard.extractedFilterWidgetIds) return [];

    const extractedWidgets = dashboard.widgets.filter(w => 
      dashboard.extractedFilterWidgetIds!.includes(w.id)
    );

    // Group by column name to create unique filter controls
    const uniqueColumns = new Set<string>();
    extractedWidgets.forEach(w => {
       if (w.config.filters) {
         w.config.filters.forEach(f => uniqueColumns.add(f.column));
       }
    });

    const filterControls: { column: string, options: string[] }[] = [];

    uniqueColumns.forEach(col => {
       // Collect all potential values for this column from ALL involved tables
       const allValues = new Set<string>();
       
       extractedWidgets.forEach(w => {
          // Check if this widget actually uses this column filter
          if (w.config.filters?.some(f => f.column === col)) {
             const dsId = w.datasetId || w.tableId;
             const table = dashboardTables.find(t => t.id === dsId || t.name === w.config.tableName);
             if (table) {
                table.rows.forEach(row => {
                   const val = row[col];
                   if (val !== null && val !== undefined) {
                      allValues.add(String(val));
                   }
                });
             }
          }
       });

       filterControls.push({
          column: col,
          options: Array.from(allValues).sort()
       });
    });

    return filterControls;
  }, [dashboard, dashboardTables]);

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

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!dashboard) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <LayoutDashboard className="w-12 h-12 mb-4 opacity-20" />
        <p>Dashboard not found</p>
        {onBack && <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Back</button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-100/50 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 shrink-0 z-20">
        <div className="max-w-[99%] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold text-slate-800">{dashboard.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
             {onPublish && (
                <button 
                  onClick={onPublish}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors border border-purple-200"
                >
                  <Rocket className="w-4 h-4" />
                  发布 / 导出
                </button>
             )}
             <span className="hidden sm:inline">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Top Filter Bar (If Filters Extracted) */}
      {extractedFilters.length > 0 && (
         <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm z-10 shrink-0">
            <div className="max-w-[99%] mx-auto flex flex-wrap items-center gap-4">
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2">
                  <Filter className="w-4 h-4" />
                  全局筛选:
               </div>
               {extractedFilters.map(fc => (
                  <div key={fc.column} className="flex items-center gap-2">
                     <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{fc.column}</label>
                     <div className="relative">
                        <select
                           value={topFilters[fc.column] || '__ALL__'}
                           onChange={(e) => handleTopFilterChange(fc.column, e.target.value)}
                           className="appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-sm rounded-lg py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
                        >
                           <option value="__ALL__">全部</option>
                           {fc.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                           ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                           <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                     </div>
                  </div>
               ))}
               {Object.keys(topFilters).length > 0 && (
                  <button 
                    onClick={() => setTopFilters({})}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2"
                  >
                    重置所有
                  </button>
               )}
            </div>
         </div>
      )}

      {/* Dashboard Canvas */}
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-[99%] mx-auto w-full pb-10">
           <div className="grid grid-cols-12 gap-x-6 auto-rows-[1px]">
              {dashboard.widgets.map((widget) => {
                const dsId = widget.datasetId || widget.tableId;
                const widgetTable = dashboardTables.find(t => t.id === dsId || t.name === widget.config.tableName);
                const isWebComponent = widget.config.type === 'web-component';
                const dataset = datasets.find(d => d.id === widgetTable?.id);
                const sourceName = dataset 
                  ? 'Dataset' 
                  : (dataSources.find(ds => ds.tables.some(t => t.id === dsId))?.name || 'Unknown Source');

                if (!widgetTable && !isWebComponent) return null;

                // Check if this widget's filters are extracted
                const isExtracted = dashboard.extractedFilterWidgetIds?.includes(widget.id);

                return (
                  <DashboardWidgetCard
                    key={widget.id}
                    widget={widget}
                    table={widgetTable}
                    dataSourceName={isWebComponent ? 'Web Component' : (sourceName === 'Dataset' ? widgetTable?.name || '' : sourceName)}
                    readOnly={true}
                    // Pass top filters only if extracted, otherwise widget manages its own
                    hideFiltersUI={isExtracted}
                    externalFilters={isExtracted ? topFilters : undefined}
                    isDataset={!!dataset}
                  />
                );
              })}
           </div>
        </div>
      </main>
    </div>
  );
};
