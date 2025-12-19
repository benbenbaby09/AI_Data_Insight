
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  LayoutDashboard, 
  Database, 
  FileCode, 
  Check, 
  AlertCircle,
  ArrowRight,
  Layers
} from 'lucide-react';
import { ExportPackage } from '../types';

interface DashboardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importData: ExportPackage | null;
  onConfirm: (newName: string) => void;
}

export const DashboardImportModal: React.FC<DashboardImportModalProps> = ({
  isOpen,
  onClose,
  importData,
  onConfirm
}) => {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen && importData) {
      setNewName(`${importData.dashboard.name} (导入副本)`);
    }
  }, [isOpen, importData]);

  if (!isOpen || !importData) return null;

  const { dashboard, dataSources, datasets } = importData;

  const handleConfirm = () => {
    if (newName.trim()) {
      onConfirm(newName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">导入仪表盘配置</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          <div className="space-y-6">
            {/* 1. Dashboard Info & Rename */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                     <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                     <h3 className="text-sm font-bold text-slate-700 mb-1">大屏基本信息</h3>
                     <div className="mb-3 text-xs text-slate-500">
                        原始名称: {dashboard.name} • 包含 {dashboard.widgets.length} 个组件
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">重命名新大屏</label>
                        <input 
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-800"
                          placeholder="请输入导入后的大屏名称"
                          autoFocus
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Dependency Visualization */}
            <div>
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">包含的配置资源</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Data Sources */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">数据源 ({dataSources.length})</span>
                     </div>
                     {dataSources.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">无依赖数据源</div>
                     ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                           {dataSources.map(ds => (
                              <div key={ds.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                 <span className="truncate flex-1">{ds.name}</span>
                                 <span className="text-[10px] text-slate-400 bg-white px-1 rounded border border-slate-100">{ds.config.type}</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Datasets */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <FileCode className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">数据集 ({datasets.length})</span>
                     </div>
                     {datasets.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">无依赖数据集</div>
                     ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                           {datasets.map(d => (
                              <div key={d.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                 <span className="truncate flex-1">{d.name}</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
               <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
               <div className="text-xs text-blue-700 leading-relaxed">
                  <strong>导入说明：</strong> 系统将自动为这些资源生成新的 ID，创建一个完全独立的副本。这不会覆盖您现有的同名数据源或大屏。
               </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!newName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" />
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
};
