
import React, { useState, useEffect } from 'react';
import { Filter, X, CheckSquare, Square, Save } from 'lucide-react';
import { Dashboard } from '../types';

interface FilterExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboard: Dashboard;
  onUpdate: (updates: Partial<Dashboard>) => void;
}

export const FilterExtractionModal: React.FC<FilterExtractionModalProps> = ({ 
  isOpen, 
  onClose, 
  dashboard, 
  onUpdate
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(dashboard.extractedFilterWidgetIds || []);
    }
  }, [isOpen, dashboard]);

  if (!isOpen) return null;

  // Filter widgets that actually have filters configured
  const widgetsWithFilters = dashboard.widgets.filter(w => w.config.filters && w.config.filters.length > 0);

  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = () => {
    // Save the configuration to the dashboard
    onUpdate({ extractedFilterWidgetIds: selectedIds });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-lg">配置全局筛选</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
           <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-700 mb-1">提取筛选组件</h3>
              <p className="text-xs text-slate-500">
                 勾选以下组件，将其内部的筛选功能提取到大屏顶部的全局工具栏中，实现联动控制。
              </p>
           </div>

           <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {widgetsWithFilters.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 text-xs">
                    当前大屏中没有包含筛选功能的组件。
                 </div>
              ) : (
                 widgetsWithFilters.map(widget => {
                    const isSelected = selectedIds.includes(widget.id);
                    return (
                       <div 
                         key={widget.id}
                         onClick={() => toggleId(widget.id)}
                         className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                            isSelected 
                               ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                               : 'bg-white border-transparent hover:border-slate-300'
                         }`}
                       >
                          <div className={`mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                             {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {widget.config.title}
                             </div>
                             <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                                <Filter className="w-3 h-3" />
                                <span className="truncate">
                                   包含筛选: {widget.config.filters?.map(f => f.column).join(', ')}
                                </span>
                             </div>
                          </div>
                       </div>
                    );
                 })
              )}
           </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors text-sm font-medium"
           >
             取消
           </button>
           <button 
             onClick={handleSave}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 text-sm"
           >
             <Save className="w-4 h-4" />
             保存配置
           </button>
        </div>
      </div>
    </div>
  );
};
