import React from 'react';
import { X, Table as TableIcon, FileText } from 'lucide-react';
import { TableData } from '../types';

interface TableAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableData | null;
}

export const TableAnnotationModal: React.FC<TableAnnotationModalProps> = ({ isOpen, onClose, table }) => {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">{table.name} - 标注信息</h2>
              <p className="text-xs text-slate-400 font-light mt-0.5 max-w-md truncate">
                {table.description || "暂无表描述"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">字段名</th>
                  <th className="px-6 py-3">类型</th>
                  <th className="px-6 py-3">别名 (Alias)</th>
                  <th className="px-6 py-3">描述 (Annotation)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{col.name}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                        {col.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{col.alias || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {col.description ? (
                        <span className="text-slate-700">{col.description}</span>
                      ) : (
                        <span className="text-slate-400 italic">暂无描述</span>
                      )}
                    </td>
                  </tr>
                ))}
                {table.columns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      该表暂无字段信息
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
