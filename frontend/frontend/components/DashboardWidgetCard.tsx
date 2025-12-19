
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Database, 
  Code, 
  Move, 
  Maximize2, 
  Minimize2, 
  X,
  Box,
  GripHorizontal,
  Bookmark,
  Palette,
  LayoutList,
  Layers,
  BarChartHorizontal,
  Circle,
  Activity,
  BarChart3,
  PieChart,
  Map as MapIcon,
  LayoutGrid,
  Filter,
  Gauge,
  BoxSelect
} from 'lucide-react';
import { DashboardWidget, TableData, WidgetLayout, ChartConfig } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { WebComponentRenderer } from './WebComponentRenderer';
import { apiService } from '../services/api';

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  table: TableData | undefined;
  dataSourceName: string;
  onRemove?: (id: string) => void;
  onLayoutChange?: (id: string, layout: WidgetLayout) => void;
  onConfigChange?: (id: string, config: ChartConfig) => void;
  onSaveTemplate?: (config: ChartConfig) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  isDragging?: boolean;
  isDragTarget?: boolean;
  readOnly?: boolean;
  externalFilters?: Record<string, string>;
  hideFiltersUI?: boolean;
  onRefresh?: (widgetId: string) => void;
  isDataset?: boolean;
}

// 12-column grid system classes
const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
  5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
  9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12'
};

export const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  widget,
  table,
  dataSourceName,
  onRemove,
  onLayoutChange,
  onConfigChange,
  onSaveTemplate,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragTarget,
  readOnly = false,
  externalFilters,
  hideFiltersUI = false,
  onRefresh,
  isDataset = false
}) => {
  const [showSql, setShowSql] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  // Data State
  const [realTableData, setRealTableData] = useState<TableData | undefined>(() => {
      // If dataset, start empty to ensure we fetch fresh data via API
      if (widget.datasetId && isDataset) return undefined;
      return table;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Keep track of latest table prop without triggering effects
  const tableRef = useRef(table);
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  const fetchData = async () => {
     if (!widget.datasetId || !isDataset) return;
     
     setIsLoading(true); 
     
     try {
        const res = await apiService.executeDatasetSql(widget.datasetId);
        if (res.success && res.rows) {
           const currentTable = tableRef.current;
           const newTableData: TableData = {
              id: widget.datasetId,
              name: currentTable?.name || 'Dataset',
              columns: res.columns.map(c => ({ name: c, type: 'string' })),
              rows: res.rows,
              description: currentTable?.description,
              dataSourceId: currentTable?.dataSourceId || 0
           };
           setRealTableData(newTableData);
        }
     } catch (err) {
        console.error("Failed to fetch widget data", err);
     } finally {
        setIsLoading(false);
     }
  };

  useEffect(() => {
    if (widget.datasetId && isDataset) {
       // Only fetch for datasets. 
       // We removed 'table' from dependencies to prevent re-fetching during drag/drop operations
       // where table prop reference might change but content remains valid.
       fetchData();
    }
  }, [widget.datasetId, isDataset]);

  useEffect(() => {
    if (!isDataset) {
       // For regular tables, use the passed data
       setRealTableData(table);
    }
  }, [table, isDataset]);
  
  // Local Filter State
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  
  // Web Component Header Interaction State
  const [isWebHeaderVisible, setIsWebHeaderVisible] = useState(false);
  const headerTimerRef = useRef<any>(null);

  // Merge external filters (from top bar) with local filters
  const activeFilters = useMemo(() => {
     return { ...localFilters, ...externalFilters };
  }, [localFilters, externalFilters]);
  
  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [dragDimensions, setDragDimensions] = useState<{w: number, h: number} | null>(null);

  const isWebComponent = widget.config.type === 'web-component';

  // Cleanup header timer on unmount
  useEffect(() => {
    return () => {
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    };
  }, []);

  // Close style menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setShowStyleMenu(false);
      }
    };
    if (showStyleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStyleMenu]);

  // Auto-refresh logic
  useEffect(() => {
    if (!widget.config.autoUpdate?.enabled || !onRefresh || readOnly) return;
    
    const intervalSeconds = widget.config.autoUpdate.interval || 30;
    const ms = Math.max(intervalSeconds * 1000, 5000); // Minimum 5s safety

    const timer = setInterval(() => {
      // Call local fetch
      fetchData();
      
      // Also notify parent if needed (optional, but good for consistency)
      if (onRefresh) onRefresh(String(widget.id));
    }, ms);

    return () => clearInterval(timer);
  }, [widget.config.autoUpdate, onRefresh, widget.id, readOnly]);

  const handleHeaderEnter = () => {
    if (!isWebComponent || readOnly) return;
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    headerTimerRef.current = setTimeout(() => {
      setIsWebHeaderVisible(true);
    }, 1000);
  };

  const handleHeaderLeave = () => {
    if (!isWebComponent || readOnly) return;
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    setIsWebHeaderVisible(false);
  };

  const getHeightValue = () => {
    if (dragDimensions) return dragDimensions.h;
    if (typeof widget.layout.height === 'number') return widget.layout.height;
    return widget.layout.height === 'tall' ? 600 : 400;
  };

  const currentHeight = getHeightValue();
  const currentSpan = widget.layout.colSpan || 6;
  const colSpanClass = `col-span-12 ${COL_SPAN_CLASSES[currentSpan] || 'md:col-span-6'}`;

  const toggleWidth = () => {
    if (onLayoutChange) {
      const newSpan = currentSpan === 12 ? 6 : 12;
      onLayoutChange(widget.id, {
        ...widget.layout,
        colSpan: newSpan
      });
    }
  };

  const handleStyleChange = (variant: string) => {
    if (onConfigChange) {
      onConfigChange(widget.id, {
        ...widget.config,
        variant
      });
    }
    setShowStyleMenu(false);
  };

  const handleWebComponentUpdate = (newConfig: ChartConfig) => {
    if (onConfigChange) {
        onConfigChange(widget.id, newConfig);
    }
  };

  const filterOptions = useMemo(() => {
    if (!realTableData || !widget.config.filters) return {} as Record<string, string[]>;
    
    const options: Record<string, string[]> = {};
    widget.config.filters.forEach(f => {
       const columnValues = realTableData.rows
            .map(r => r[f.column])
            .filter((v): v is string | number | boolean => v !== null && v !== undefined)
            .map(v => String(v));
       
       const uniqueValues: string[] = (Array.from(new Set(columnValues)) as string[]).sort();
       options[f.column] = uniqueValues;
    });
    return options;
  }, [realTableData, widget.config.filters]);

  const handleFilterChange = (col: string, val: string) => {
     setLocalFilters(prev => {
        const next = { ...prev };
        if (val === '__ALL__') {
           delete next[col];
        } else {
           next[col] = val;
        }
        return next;
     });
  };

  const startResizing = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = currentHeight;
    const startWidth = cardRef.current?.getBoundingClientRect().width || 0;
    
    const parentWidth = cardRef.current?.parentElement?.getBoundingClientRect().width || 0;
    const colWidth = parentWidth / 12;

    let newH = startHeight;
    let newColSpan = currentSpan;

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      newH = Math.max(200, startHeight + deltaY); 
      
      const deltaX = moveEvent.clientX - startX;
      const newWidthPx = startWidth + deltaX;
      
      const calculatedSpan = Math.round(newWidthPx / colWidth);
      newColSpan = Math.max(2, Math.min(12, calculatedSpan));
      
      setDragDimensions({ w: newWidthPx, h: newH });
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      setIsResizing(false);
      setDragDimensions(null);

      if (onLayoutChange) {
        onLayoutChange(widget.id, {
          ...widget.layout,
          height: newH,
          colSpan: newColSpan
        });
      }
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // 1. Calculate filtered data first (common logic)
    let filteredTableData: TableData | undefined = undefined;
    
    if (realTableData) {
       const filteredRows = realTableData.rows.filter(row => {
          return Object.entries(activeFilters).every(([col, val]) => {
             if (row[col] === undefined) return true;
             return String(row[col]) === val;
          });
       });
       
       filteredTableData = {
          ...realTableData,
          rows: filteredRows
       };
    }

    if (isWebComponent && widget.config.webComponentCode) {
      return (
         <div className="w-full h-full p-2 overflow-auto">
            <WebComponentRenderer 
              code={widget.config.webComponentCode} 
              config={widget.config}
              data={filteredTableData}
              onConfigChange={handleWebComponentUpdate}
              readOnly={readOnly}
            />
         </div>
      );
    }

    if (filteredTableData || widget.config.rawData) {
      return (
        <div className="w-full h-full p-4 flex flex-col">
          {widget.config.filters && widget.config.filters.length > 0 && !hideFiltersUI && filteredTableData && (
             <div className="flex flex-wrap items-center gap-3 mb-3 p-2 bg-slate-50 border border-slate-100 rounded-lg animate-in fade-in slide-in-from-top-1 relative z-0">
                <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                   <Filter className="w-3.5 h-3.5" />
                   筛选:
                </div>
                {widget.config.filters.map(f => (
                   <div key={f.column} className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">{f.column}</label>
                      <select 
                        value={localFilters[f.column] || '__ALL__'}
                        onChange={(e) => handleFilterChange(f.column, e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-blue-500 hover:border-slate-400 transition-colors cursor-pointer"
                        onMouseDown={(e) => e.stopPropagation()} 
                      >
                         <option value="__ALL__">全部</option>
                         {filterOptions[f.column]?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                         ))}
                      </select>
                   </div>
                ))}
                {Object.keys(localFilters).length > 0 && (
                   <button 
                     onClick={() => setLocalFilters({})}
                     className="ml-auto text-xs text-blue-600 hover:underline px-2"
                   >
                     重置
                   </button>
                )}
             </div>
          )}
          
          <div className="flex-1 min-h-0">
             <ChartRenderer config={widget.config} data={widget.config.rawData || filteredTableData?.rows || []} />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">
          Data source not found
      </div>
    );
  };

  const getAvailableStyles = () => {
     switch (widget.config.type) {
       case 'bar':
         return [
           { id: 'default', label: '默认', icon: <BarChart3 className="w-4 h-4" /> },
           { id: 'stacked', label: '堆叠', icon: <Layers className="w-4 h-4" /> },
           { id: 'horizontal', label: '横向', icon: <LayoutList className="w-4 h-4" /> }
         ];
       case 'line':
         return [
           { id: 'monotone', label: '平滑', icon: <Activity className="w-4 h-4" /> },
           { id: 'linear', label: '折线', icon: <Activity className="w-4 h-4" style={{ transform: 'scaleY(0.5)' }} /> },
           { id: 'step', label: '阶梯', icon: <LayoutList className="w-4 h-4" /> }
         ];
       case 'area':
         return [
           { id: 'default', label: '默认', icon: <Layers className="w-4 h-4" /> },
           { id: 'stacked', label: '堆叠', icon: <Layers className="w-4 h-4" /> }
         ];
        case 'pie':
         return [
           { id: 'donut', label: '环形', icon: <Circle className="w-4 h-4" /> },
           { id: 'pie', label: '饼状', icon: <PieChart className="w-4 h-4" /> }
         ];
        case 'map':
         return [
           { id: 'default', label: '热力图', icon: <MapIcon className="w-4 h-4" /> },
           { id: 'grid', label: '网格图', icon: <LayoutGrid className="w-4 h-4" /> }
         ];
        case 'funnel':
         return [
           { id: 'default', label: '默认', icon: <Filter className="w-4 h-4" /> }
         ];
        case 'gauge':
         return [
           { id: 'default', label: '默认', icon: <Gauge className="w-4 h-4" /> }
         ];
        case 'boxplot':
         return [
           { id: 'default', label: '默认', icon: <BoxSelect className="w-4 h-4" /> }
         ];
       default:
         return [];
     }
  };

  const styles = getAvailableStyles();

  if (readOnly) {
    if (isWebComponent) {
       return (
          <div 
             className={`${colSpanClass} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow mb-6 relative group`}
             style={{ gridRowEnd: `span ${currentHeight}` }}
          >
             <div className="w-full h-full relative">
                 {renderContent()}
             </div>
          </div>
       );
    }

    return (
      <div 
         className={`${colSpanClass} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow mb-6 relative group`}
         style={{ gridRowEnd: `span ${currentHeight}` }}
      >
         <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center h-12">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                {widget.config.title}
            </h3>
            {hideFiltersUI && widget.config.filters && widget.config.filters.length > 0 && (
               <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Filter className="w-3 h-3" /> 全局筛选
               </span>
            )}
            <span className="text-xs text-slate-400 ml-auto">{dataSourceName}</span>
         </div>
         <div className="w-full h-[calc(100%-3rem)] relative">
             {renderContent()}
         </div>
      </div>
    );
  }

  let headerClasses = "flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl shrink-0 cursor-move h-14";
  
  if (isWebComponent) {
     const baseClasses = "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-100 rounded-t-2xl pointer-events-auto transition-opacity duration-300";
     const isVisible = isWebHeaderVisible || isDragging;
     const stateClasses = isVisible ? "opacity-100 cursor-move" : "opacity-0 cursor-default";
     headerClasses = `${baseClasses} ${stateClasses}`;
  }

  const contentContainerClasses = isWebComponent
    ? "w-full h-full relative overflow-hidden" 
    : "w-full relative overflow-hidden transition-all duration-75 flex-1";

  return (
    <div 
      ref={cardRef}
      draggable={!readOnly && !isResizing} 
      onDragStart={(e) => onDragStart && onDragStart(e, widget.id)}
      onDragOver={(e) => onDragOver && onDragOver(e, widget.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop && onDrop(e, widget.id)}
      className={`${colSpanClass} bg-white rounded-2xl shadow-sm border border-slate-200 relative group hover:shadow-lg transition-all duration-200 flex flex-col mb-6 ${isDragging ? 'opacity-40 border-dashed border-slate-400' : ''} ${isDragTarget ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${isResizing ? 'shadow-xl ring-2 ring-blue-500/20 z-10' : ''}`}
      style={{ gridRowEnd: `span ${currentHeight}` }}
    >
      <div 
        className={headerClasses}
        title={isWebComponent && !isWebHeaderVisible ? "悬停 1 秒显示操作栏" : "拖拽以移动位置"}
        onMouseEnter={handleHeaderEnter}
        onMouseLeave={handleHeaderLeave}
      >
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
           <Move className="w-4 h-4 text-slate-400 cursor-move shrink-0" />
           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-500 min-w-0 overflow-hidden">
              {isWebComponent ? <Box className="w-3 h-3 shrink-0" /> : <Database className="w-3 h-3 shrink-0" />}
              <span className="truncate">{widget.config.title}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-100 shadow-sm shrink-0">
           
           {!isWebComponent && styles.length > 0 && (
             <div className="relative" ref={styleMenuRef}>
               <button 
                 onClick={() => setShowStyleMenu(!showStyleMenu)}
                 className={`p-1.5 rounded-md transition-colors ${showStyleMenu ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                 title="切换样式"
               >
                 <Palette className="w-3.5 h-3.5" />
               </button>
               {showStyleMenu && (
                 <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95">
                    {styles.map(s => (
                       <button
                         key={s.id}
                         onClick={() => handleStyleChange(s.id)}
                         className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${widget.config.variant === s.id ? 'text-purple-600 font-medium bg-purple-50' : 'text-slate-600'}`}
                       >
                          {s.icon}
                          {s.label}
                       </button>
                    ))}
                 </div>
               )}
             </div>
           )}

           <button 
             onClick={() => onSaveTemplate && onSaveTemplate(widget.config)}
             className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
             title="保存为组件模板"
           >
             <Bookmark className="w-3.5 h-3.5" />
           </button>

           <div className="w-px h-3 bg-slate-300 mx-1" />

           <button 
             onClick={toggleWidth}
             className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
             title={currentSpan < 12 ? "最大化宽度" : "还原宽度"}
           >
             {currentSpan < 12 ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
           </button>

           {!isWebComponent && (
             <button 
               onClick={() => setShowSql(!showSql)}
               className={`p-1.5 rounded-md transition-colors ${showSql ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
               title="查看 SQL"
             >
               <Code className="w-3.5 h-3.5" />
             </button>
           )}

           <button 
             onClick={() => onRemove && onRemove(widget.id)}
             className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
             title="移除组件"
           >
             <Trash2 className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <div className={contentContainerClasses}>
         {showSql ? (
           <div className="absolute inset-0 bg-slate-900 p-6 overflow-auto text-left animate-in fade-in zoom-in-95 duration-200 z-10">
             <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Oracle SQL Query</span>
                <button onClick={() => setShowSql(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
             </div>
             <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap leading-relaxed">
               {widget.config.sql || "-- SQL Not Available for this chart --"}
             </pre>
             <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
               * 此查询由 AI 生成，用于解释数据来源。
             </div>
           </div>
         ) : (
            renderContent()
         )}
         
         <div 
           onMouseDown={startResizing}
           className={`absolute bottom-0 right-0 p-1 cursor-nwse-resize text-slate-300 hover:text-blue-500 transition-colors z-20 bg-gradient-to-tl from-white via-white to-transparent rounded-tl-lg ${isWebComponent ? 'opacity-0 group-hover:opacity-100' : ''}`}
           title="自由拖拽调整大小 (宽度吸附栅格)"
         >
            <GripHorizontal className="w-5 h-5 transform rotate-45" />
         </div>
      </div>
      
      {isResizing && dragDimensions && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl pointer-events-none z-30 bg-blue-500/5 flex items-center justify-center">
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">
               宽度: {Math.round(dragDimensions.w)}px ({Math.round(dragDimensions.w / (cardRef.current?.parentElement?.getBoundingClientRect().width || 1200) * 12)}列) x 高度: {Math.round(dragDimensions.h)}px
            </div>
        </div>
      )}
    </div>
  );
};
