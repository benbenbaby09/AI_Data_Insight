
import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Upload,
  FileJson,
  MonitorPlay,
  BarChart3,
  LineChart, 
  PieChart,
  Map as MapIcon,
  Table as TableIcon,
  Rocket
} from 'lucide-react';
import { Dashboard, DashboardWidget, DataSource, Dataset } from '../types';

interface DashboardManagerProps {
  dashboards: Dashboard[];
  dataSources: DataSource[];
  datasets: Dataset[];
  onBack: () => void;
  onCreate: () => void;
  onImport: () => void;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, newName: string) => void;
  onExport: (id: number) => void;
  onPublish: (dashboard: Dashboard) => void;
}

// Helper to render mini-widgets in the thumbnail
const MiniWidget: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
  const span = widget.layout.colSpan || 6;
  // Map span to grid columns (12 total)
  const colSpanClass = {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
    9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12'
  }[span] || 'col-span-6';

  // Determine visual style based on chart type
  const typeStyle = useMemo(() => {
    switch(widget.config.type) {
      case 'bar': return { bg: 'bg-blue-100', icon: <BarChart3 className="w-3 h-3 text-blue-400" /> };
      case 'line': return { bg: 'bg-emerald-100', icon: <LineChart className="w-3 h-3 text-emerald-400" /> };
      case 'pie': return { bg: 'bg-amber-100', icon: <PieChart className="w-3 h-3 text-amber-400" /> };
      case 'map': return { bg: 'bg-indigo-100', icon: <MapIcon className="w-3 h-3 text-indigo-400" /> };
      case 'web-component': return { bg: 'bg-purple-100', icon: <div className="text-[8px] font-mono text-purple-500">WEB</div> };
      default: return { bg: 'bg-slate-100', icon: <TableIcon className="w-3 h-3 text-slate-400" /> };
    }
  }, [widget.config.type]);

  // Determine relative height for thumbnail
  const heightClass = widget.layout.height === 'tall' ? 'h-16' : (typeof widget.layout.height === 'number' && widget.layout.height > 450 ? 'h-16' : 'h-8');

  return (
    <div className={`${colSpanClass} ${heightClass} ${typeStyle.bg} rounded-sm border border-white/50 flex items-center justify-center transition-opacity hover:opacity-80`}>
      {typeStyle.icon}
    </div>
  );
};

const DashboardThumbnail: React.FC<{ widgets: DashboardWidget[] }> = ({ widgets }) => {
  if (widgets.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 text-slate-300">
        <LayoutDashboard className="w-10 h-10 mb-2 opacity-50" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Empty Canvas</span>
      </div>
    );
  }

  // Limit widgets to first 12 to avoid overcrowding the thumbnail
  const displayWidgets = widgets.slice(0, 12);

  return (
    <div className="w-full h-full bg-slate-50 p-3 overflow-hidden">
      <div className="grid grid-cols-12 gap-1 w-full">
        {displayWidgets.map((w) => (
          <MiniWidget key={w.id} widget={w} />
        ))}
      </div>
    </div>
  );
};

export const DashboardManager: React.FC<DashboardManagerProps> = ({
  dashboards,
  dataSources,
  datasets,
  onBack,
  onCreate,
  onImport,
  onSelect,
  onDelete,
  onRename,
  onExport,
  onPublish
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Filter and Sort
  const filteredDashboards = useMemo(() => {
    let result = dashboards;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(lower));
    }
    // Sort by updated/created desc
    return [...result].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [dashboards, searchTerm]);

  const startEditing = (e: React.MouseEvent, d: Dashboard) => {
    e.stopPropagation();
    setEditingId(d.id);
    setEditName(d.name);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEditing();
    if (e.key === 'Escape') setEditingId(null);
  };

  // Compute actual used data sources count
  const getUniqueSourceCount = (dashboard: Dashboard) => {
    const distinctIds = new Set<number>();
    
    // 2. Sources derived from widgets
    dashboard.widgets.forEach(w => {
      // Check if it's a dataset
      const dsId = w.datasetId || w.tableId;
      const dataset = datasets.find(d => d.id === dsId);
      if (dataset) {
        distinctIds.add(dataset.dataSourceId);
      } else {
        // Check if it's a direct table in a datasource
        const source = dataSources.find(ds => ds.tables.some(t => t.id === dsId));
        if (source) {
          distinctIds.add(source.id);
        }
      }
    });

    return distinctIds.size;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </button>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">监控大屏管理</h1>
              <p className="text-slate-500 mt-1">
                集中管理您的所有数据监控大屏。支持创建、编辑、导出配置及删除操作。
              </p>
            </div>
            <div className="flex gap-3">
               <button 
                onClick={onImport}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                导入配置
              </button>
              <button 
                onClick={onCreate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                新建大屏
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="px-8 py-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="relative">
             <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
             <input 
               type="text" 
               placeholder="搜索大屏名称..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDashboards.map(dashboard => (
              <div 
                key={dashboard.id} 
                className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 flex flex-col overflow-hidden relative cursor-default"
              >
                {/* Thumbnail Area */}
                <div 
                  className="h-40 bg-slate-100 border-b border-slate-100 relative overflow-hidden cursor-pointer"
                  onClick={() => onSelect(dashboard.id)}
                >
                   <DashboardThumbnail widgets={dashboard.widgets} />
                   
                   {/* Overlay on hover */}
                   <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white text-blue-600 px-4 py-2 rounded-full font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-2">
                        <MonitorPlay className="w-4 h-4" />
                        进入大屏
                      </span>
                   </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                         {editingId === dashboard.id ? (
                           <input 
                             type="text" 
                             value={editName}
                             onChange={(e) => setEditName(e.target.value)}
                             onBlur={saveEditing}
                             onKeyDown={handleKeyDown}
                             autoFocus
                             onClick={(e) => e.stopPropagation()}
                             className="w-full px-2 py-1 border border-blue-400 rounded text-sm font-bold text-slate-800 outline-none"
                           />
                         ) : (
                           <h3 
                             className="text-lg font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors"
                             onClick={() => onSelect(dashboard.id)}
                             title={dashboard.name}
                           >
                             {dashboard.name}
                           </h3>
                         )}
                      </div>
                      
                      <button 
                        onClick={(e) => startEditing(e, dashboard)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="重命名"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                   </div>

                   <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                        {dashboard.widgets.length} 个组件
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                        {getUniqueSourceCount(dashboard)} 个数据源
                      </span>
                   </div>

                   <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex flex-col gap-1">
                         <span className="flex items-center gap-1.5">
                           <Calendar className="w-3 h-3" /> 
                           {new Date(dashboard.createdAt).toLocaleDateString()}
                         </span>
                         {dashboard.updatedAt && (
                           <span className="flex items-center gap-1.5 text-slate-300">
                             <Clock className="w-3 h-3" />
                             {new Date(dashboard.updatedAt).toLocaleDateString()}
                           </span>
                         )}
                      </div>

                      <div className="flex items-center gap-1">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onPublish(dashboard);
                           }}
                           className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors group/btn"
                           title="发布与分享 (提取筛选器)"
                         >
                           <Rocket className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onExport(dashboard.id);
                           }}
                           className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group/btn"
                           title="导出配置包 (JSON)"
                         >
                           <FileJson className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             if(window.confirm(`确定要删除大屏 "${dashboard.name}" 吗？此操作不可恢复。`)) {
                               onDelete(dashboard.id);
                             }
                           }}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                           title="删除大屏"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            ))}

            {/* Empty State / Add New Card */}
            {filteredDashboards.length === 0 && (
               <button 
                 onClick={onCreate}
                 className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center p-8 transition-all group min-h-[280px]"
               >
                 <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                   <Plus className="w-8 h-8 text-blue-500" />
                 </div>
                 <h3 className="font-semibold text-slate-600 group-hover:text-blue-600">新建大屏</h3>
                 <p className="text-sm text-slate-400 mt-2">创建一个空白画布</p>
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
