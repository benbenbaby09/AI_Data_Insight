import React, { useMemo } from 'react';
import { X, FileJson, Info, Database, BarChart3 } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';
import { ChartConfig } from '../types';

interface ChartTypeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartTypeInfo: any; // Using any for flexibility as we updated the constant structure
}

export const ChartTypeInfoModal: React.FC<ChartTypeInfoModalProps> = ({
  isOpen,
  onClose,
  chartTypeInfo
}) => {
  if (!isOpen || !chartTypeInfo) return null;

  // Logic to determine keys for table and chart
  const exampleData = chartTypeInfo.exampleStructure || [];
  const keys = exampleData.length > 0 ? Object.keys(exampleData[0]) : [];
  
  // Simple heuristic: First key is X-axis, others are data keys
  const xAxisKey = keys.length > 0 ? keys[0] : '';
  const dataKeys = keys.slice(1);

  // Construct a temporary config for the preview
  const previewConfig: ChartConfig | null = useMemo(() => {
    if (!chartTypeInfo.type || exampleData.length === 0) return null;
    
    return {
      type: chartTypeInfo.type,
      xAxisKey,
      dataKeys,
      title: '示例图表',
      description: 'Preview',
      variant: 'default'
    } as ChartConfig;
  }, [chartTypeInfo, xAxisKey, dataKeys]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
               <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{chartTypeInfo.label}</h3>
              <p className="text-xs text-slate-500">图表类型详情</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
              简介
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              {chartTypeInfo.detailedDescription || chartTypeInfo.description}
            </p>
          </div>

          {/* Data Requirements */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
              数据要求
            </h4>
            <div className="flex items-start gap-3 text-sm text-slate-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <Database className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>{chartTypeInfo.dataRequirements}</p>
            </div>
          </div>

          {/* Example Data Table */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              数据示例结构
            </h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
               <table className="w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500">
                     <tr>
                        {keys.map(key => (
                           <th key={key} className="px-4 py-2 border-b border-slate-200">{key}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {exampleData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                           {keys.map(key => (
                              <td key={key} className="px-4 py-2 font-mono text-xs">{row[key]}</td>
                           ))}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-right">
              * 仅供参考，实际字段名可不同
            </p>
          </div>

          {/* Chart Preview Section */}
          {previewConfig && (
            <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                  图表样例
                </h4>
                <div className="w-full h-64 border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex flex-col">
                   <ChartRenderer config={previewConfig} data={exampleData} />
                </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
