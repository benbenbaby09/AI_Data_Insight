import React from 'react';
import { FolderOpen, X, Trash2, Calendar, LayoutDashboard, Clock, Download } from 'lucide-react';
import { Dashboard } from '../types';

interface DashboardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboards: Dashboard[];
  activeDashboardId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DashboardHistoryModal: React.FC<DashboardHistoryModalProps> = ({
  isOpen,
  onClose,
  dashboards,
  activeDashboardId,
  onSelect,
  onDelete
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = (e: React.MouseEvent, dashboard: Dashboard) => {
    e.stopPropagation();
    try {
      const dataStr = JSON.stringify(dashboard, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dashboard.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  // Sort by updatedAt descending (most recent first)
  const sortedDashboards = [...dashboards].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt;
    const timeB = b.updatedAt || b.createdAt;
    return timeB - timeA;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">历史报表配置</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {sortedDashboards.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无保存的历史报表</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDashboards.map((dashboard) => {
                const isActive = dashboard.id === activeDashboardId;
                const widgetCount = dashboard.widgets.length;
                const lastModified = dashboard.updatedAt || dashboard.createdAt;

                return (
                  <div 
                    key={dashboard.id}
                    onClick={() => {
                      onSelect(dashboard.id);
                      onClose();
                    }}
                    className={`group relative bg-white border rounded-xl p-4 transition-all cursor-pointer hover:shadow-md ${
                      isActive 
                        ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                          <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className={`font-semibold text-base mb-1 ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                            {dashboard.name}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              创建于 {formatDate(dashboard.createdAt)}
                            </span>
                            {(dashboard.updatedAt && dashboard.updatedAt !== dashboard.createdAt) && (
                               <span className="flex items-center gap-1 text-slate-400">
                                 <Clock className="w-3.5 h-3.5" />
                                 更新于 {formatDate(dashboard.updatedAt)}
                               </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full mr-2">
                          {widgetCount} 个图表
                        </span>
                        
                        <button
                          onClick={(e) => handleExport(e, dashboard)}
                          className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="导出配置 JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {sortedDashboards.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if(window.confirm(`确定要删除报表 "${dashboard.name}" 吗?`)) {
                                onDelete(dashboard.id);
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};