
import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  Eye, 
  Trash2, 
  Download, 
  Edit3,
  MoreHorizontal,
  LayoutDashboard
} from 'lucide-react';
import { Dashboard } from '../types';

interface ReportHistoryManagerProps {
  dashboards: Dashboard[];
  onBack: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onExport: (id: string) => void;
}

export const ReportHistoryManager: React.FC<ReportHistoryManagerProps> = ({
  dashboards,
  onBack,
  onSelect,
  onDelete,
  onRename,
  onExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Filter and Sort: Most recent first
  const filteredDashboards = useMemo(() => {
    let result = dashboards;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(lower));
    }
    return [...result].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [dashboards, searchTerm]);

  const handleStartEdit = (d: Dashboard) => {
    setEditingId(d.id);
    setEditName(d.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            返回仪表盘
          </button>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">历史报表管理</h1>
              <p className="text-slate-500 mt-1">
                以列表形式查看和管理所有保存的报表历史记录。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 bg-slate-50 flex justify-center shrink-0">
         <div className="max-w-7xl w-full">
            <div className="relative w-96">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="搜索报表名称..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
               />
            </div>
         </div>
      </div>

      {/* Content Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
           {filteredDashboards.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <FileText className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-lg font-medium text-slate-900">暂无历史报表</h3>
               <p className="text-slate-500 max-w-sm mt-2">
                 您保存的仪表盘配置将出现在这里。
               </p>
             </div>
           ) : (
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-semibold text-slate-500 uppercase tracking-wider">
                     <tr>
                        <th className="px-6 py-4 border-b border-slate-200 w-[30%]">报表名称</th>
                        <th className="px-6 py-4 border-b border-slate-200 w-[15%]">组件数量</th>
                        <th className="px-6 py-4 border-b border-slate-200 w-[20%]">创建时间</th>
                        <th className="px-6 py-4 border-b border-slate-200 w-[20%]">最后修改</th>
                        <th className="px-6 py-4 border-b border-slate-200 w-[15%] text-right">操作</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                     {filteredDashboards.map(dashboard => (
                       <tr key={dashboard.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                   <LayoutDashboard className="w-4 h-4" />
                                </div>
                                {editingId === dashboard.id ? (
                                  <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="w-full px-2 py-1 border border-blue-400 rounded text-sm outline-none"
                                  />
                                ) : (
                                  <div className="font-medium text-slate-900 truncate max-w-[200px]" title={dashboard.name}>
                                     {dashboard.name}
                                  </div>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                               {dashboard.widgets.length}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                             <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(dashboard.createdAt)}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                             <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(dashboard.updatedAt || dashboard.createdAt)}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => onSelect(dashboard.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                  title="打开报表"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <div className="w-px h-3 bg-slate-300 mx-1" />
                                <button 
                                  onClick={() => handleStartEdit(dashboard)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="重命名"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onExport(dashboard.id)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="导出"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <div className="w-px h-3 bg-slate-300 mx-1" />
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`确定要删除报表 "${dashboard.name}" 吗？此操作不可恢复。`)) {
                                      onDelete(dashboard.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
