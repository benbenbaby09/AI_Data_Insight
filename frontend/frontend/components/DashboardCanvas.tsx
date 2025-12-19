import React, { useMemo } from 'react';
import { 
  Layers, 
  PlusCircle, 
  Filter, 
  Save, 
  LayoutDashboard, 
  AlertTriangle,
  PanelRightOpen,
  Bot
} from 'lucide-react';
import { 
  Dashboard, 
  Dataset, 
  DataSource, 
  WebComponentTemplate, 
  TableData, 
  WidgetLayout, 
  ChartConfig, 
  DashboardWidget 
} from '../types';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import { AIAssistant } from './AIAssistant';

interface DashboardCanvasProps {
  activeDashboard: Dashboard;
  datasets: Dataset[];
  activeDataSources: DataSource[];
  dashboardTables: TableData[];
  webComponents: WebComponentTemplate[];
  selectedContextTables: TableData[];
  
  // State for UI
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (isOpen: boolean) => void;
  topFilters: Record<string, string>;
  onTopFilterChange: (column: string, value: string) => void;
  onClearTopFilters: () => void;

  // Handlers
  onAddWidget: (config: ChartConfig, tableName: string, overrideTableId?: number) => void;
  onRemoveWidget: (widgetId: string | number) => void;
  onUpdateWidgetLayout: (widgetId: string | number, layout: WidgetLayout) => void;
  onUpdateWidgetConfig: (widgetId: string | number, config: ChartConfig) => void;
  onRefreshWidgetData: (widgetId: string) => void;
  
  // Modals Triggers
  onOpenAddComponent: () => void;
  onOpenFilterExtraction: () => void;
  onOpenSaveConfig: () => void;
  onOpenSaveTemplate: (config: ChartConfig, datasetId?: number) => void;

  // DnD
  draggingWidgetId: string | null;
  dragTargetId: string | null;
  onDragStart: (e: React.DragEvent, id: string | number) => void;
  onDragOver: (e: React.DragEvent, id?: string | number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetId: string | number) => void;
}

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  activeDashboard,
  datasets,
  activeDataSources,
  dashboardTables,
  webComponents,
  selectedContextTables,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  topFilters,
  onTopFilterChange,
  onClearTopFilters,
  onAddWidget,
  onRemoveWidget,
  onUpdateWidgetLayout,
  onUpdateWidgetConfig,
  onRefreshWidgetData,
  onOpenAddComponent,
  onOpenFilterExtraction,
  onOpenSaveConfig,
  onOpenSaveTemplate,
  draggingWidgetId,
  dragTargetId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop
}) => {

  // --- Extracted Filters Logic (Live in Editor) ---
  const extractedFilters = useMemo(() => {
    if (!activeDashboard || !activeDashboard.extractedFilterWidgetIds) return [];

    const extractedWidgets = activeDashboard.widgets.filter(w => 
      activeDashboard.extractedFilterWidgetIds!.includes(w.id)
    );

    // Group by column name
    const uniqueColumns = new Set<string>();
    extractedWidgets.forEach(w => {
       if (w.config.filters) {
         w.config.filters.forEach(f => uniqueColumns.add(f.column));
       }
    });

    const filterControls: { column: string, options: string[] }[] = [];

    uniqueColumns.forEach(col => {
       const allValues = new Set<string>();
       
       extractedWidgets.forEach(w => {
          if (w.config.filters?.some(f => f.column === col)) {
             const table = dashboardTables.find(t => t.id === w.tableId || t.name === w.config.tableName);
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
  }, [activeDashboard, dashboardTables]);

  return (
    <>
      {/* Main Dashboard Canvas (Full Width) */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100/50 overflow-y-auto p-3 scroll-smooth relative">
         <div className="max-w-[99%] mx-auto w-full pb-10 px-2">
            
            {/* Dashboard Toolbar / Title */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{activeDashboard.name}</h1>
                <p className="text-slate-500 mt-1 flex items-center gap-2">
                   <Layers className="w-4 h-4" />
                   包含 {activeDashboard.widgets.length} 个图表组件
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                   onClick={onOpenAddComponent}
                   className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  添加组件
                </button>
                
                {/* Extract Filters Button */}
                <button 
                  onClick={onOpenFilterExtraction}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                >
                  <Filter className="w-4 h-4" />
                  提取筛选
                </button>

                <button 
                  onClick={onOpenSaveConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  保存配置
                </button>
              </div>
            </div>

            {/* Editor Top Filter Bar (Visible when filters extracted) */}
            {extractedFilters.length > 0 && (
               <div className="mb-6 p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2 bg-slate-50 px-2 py-1 rounded-lg">
                     <Filter className="w-4 h-4" />
                     全局筛选预览:
                  </div>
                  {extractedFilters.map(fc => (
                     <div key={fc.column} className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{fc.column}</label>
                        <div className="relative">
                           <select
                              value={topFilters[fc.column] || '__ALL__'}
                              onChange={(e) => onTopFilterChange(fc.column, e.target.value)}
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
                       onClick={onClearTopFilters}
                       className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2"
                     >
                       重置所有
                     </button>
                  )}
               </div>
            )}

            {activeDashboard.widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">仪表盘空白</h3>
                <p className="text-slate-500 max-w-sm text-center mt-2 text-sm">
                  {datasets.length > 0 
                    ? (selectedContextTables.length > 0 ? "请在右侧向 AI 提问以生成图表。" : "请在右上角添加组件或向 AI 提问。")
                    : "请先点击顶部 '数据资产' -> '数据集管理' 创建数据集。"}
                </p>
                <button 
                   onClick={onOpenAddComponent}
                   className="mt-6 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2"
                >
                   <PlusCircle className="w-4 h-4" />
                   手动添加组件
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-x-6 auto-rows-[1px]">
                {activeDashboard.widgets.map((widget) => {
                  // Resolve dataset/table. Try datasetId first, then tableId, then name
                  const dsId = widget.datasetId || widget.tableId;
                  let widgetTable = dashboardTables.find(t => t.id === dsId || t.name === widget.config.tableName);
                  const isWebComponent = widget.config.type === 'web-component';
                  
                  // Fallback for Web Components: use first available table if not linked
                  if (!widgetTable && isWebComponent && dashboardTables.length > 0) {
                      widgetTable = dashboardTables[0];
                  }

                  const dataset = datasets.find(d => d.id === widgetTable?.id);
                  const sourceName = dataset 
                    ? 'Dataset' 
                    : (activeDataSources.find(ds => ds.tables.some(t => t.id === dsId))?.name || 'Unknown Source');
                  
                  if (!widgetTable && !isWebComponent) {
                     return (
                        <div key={widget.id} className="md:col-span-4 h-64 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center p-4 text-center relative group animate-in fade-in zoom-in-95">
                            <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                            <h3 className="font-medium text-red-800">数据源丢失</h3>
                            <p className="text-xs text-red-600 mt-1 mb-3">无法找到关联的数据表或组件</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveWidget(widget.id); }}
                                className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors shadow-sm"
                            >
                                移除组件
                            </button>
                        </div>
                     );
                  }

                  // Check if filter extracted
                  const isExtracted = activeDashboard.extractedFilterWidgetIds?.includes(widget.id);

                  return (
                    <DashboardWidgetCard
                      key={widget.id}
                      widget={widget}
                      table={widgetTable}
                      dataSourceName={isWebComponent ? 'Web Component' : (sourceName === 'Dataset' ? widgetTable?.name || '' : sourceName)}
                      onRemove={onRemoveWidget}
                      onLayoutChange={onUpdateWidgetLayout}
                      onConfigChange={onUpdateWidgetConfig}
                      onSaveTemplate={onOpenSaveTemplate}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      onDrop={onDrop}
                      isDragging={draggingWidgetId === widget.id}
                      isDragTarget={dragTargetId === widget.id}
                      // Pass filter props
                      hideFiltersUI={isExtracted}
                      externalFilters={isExtracted ? topFilters : undefined}
                      onRefresh={onRefreshWidgetData}
                      isDataset={!!dataset}
                    />
                  );
                })}
              </div>
            )}
         </div>
      </main>

      {/* Right Sidebar - AI Assistant */}
      <div className={`${isRightSidebarOpen ? 'w-96' : 'w-14'} shrink-0 transition-all duration-300 ease-in-out bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col overflow-hidden`}>
        
        <div className={`flex-1 flex flex-col h-full ${isRightSidebarOpen ? 'block' : 'hidden'}`}>
           <AIAssistant 
             activeTables={selectedContextTables} 
             onAddToDashboard={onAddWidget}
             onCollapse={() => setIsRightSidebarOpen(false)}
             webComponents={webComponents}
           />
        </div>

        <div 
          className={`flex-col items-center py-4 gap-4 cursor-pointer hover:bg-slate-50 h-full ${!isRightSidebarOpen ? 'flex' : 'hidden'}`} 
          onClick={() => setIsRightSidebarOpen(true)}
        >
              <button className="p-2 text-slate-400 hover:text-blue-600">
                 <PanelRightOpen className="w-5 h-5" />
              </button>
              <div className="h-px w-8 bg-slate-200" />
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                 <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full flex items-center justify-center">
                   <span className="writing-vertical-rl text-xs font-bold text-slate-400 tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>
                      AI Assistant
                   </span>
              </div>
        </div>
      </div>
    </>
  );
};
