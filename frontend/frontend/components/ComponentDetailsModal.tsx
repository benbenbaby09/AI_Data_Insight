
import React, { useState, useEffect } from 'react';
import { X, Info, LayoutTemplate, Database } from 'lucide-react';
import { ChartTemplate, ChartConfig } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { ChartStyleSelector } from './ChartStyleSelector';
import { PREVIEW_DATA } from '../constants';

interface ComponentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ChartTemplate | null;
}

export const ComponentDetailsModal: React.FC<ComponentDetailsModalProps> = ({ isOpen, onClose, template }) => {
  const [variant, setVariant] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setVariant(undefined);
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const previewConfig: ChartConfig = {
    type: template.type,
    title: template.name,
    description: "Preview Mode",
    xAxisKey: 'category',
    dataKeys: ['value1', 'value2', 'value3'],
    tableName: 'Preview',
    customSpec: template.customSpec,
    chartParams: template.chartParams,
    variant: variant
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <LayoutTemplate className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="font-semibold text-lg leading-tight">{template.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">组件详情与数据要求</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* Left Column: Preview */}
            <div className="flex flex-col gap-4">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-slate-400" />
                      视觉预览
                    </h3>
                    <ChartStyleSelector 
                      type={template.type} 
                      value={variant} 
                      onChange={setVariant} 
                    />
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    <ChartRenderer config={previewConfig} data={PREVIEW_DATA.rows} />
                  </div>
               </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    部件描述
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {template.description}
                  </p>
               </div>
            </div>

            {/* Right Column: Dataset Example */}
            <div className="flex flex-col h-full min-h-0">
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Database className="w-4 h-4 text-slate-500" />
                       所需数据结构示例
                     </span>
                  </div>
                  
                  <div className="p-4 overflow-auto bg-white flex-1">
                     <p className="text-xs text-slate-500 mb-3">
                        此组件通常需要包含分类字段（如日期、类别）和数值字段。以下是预览所使用的标准数据格式：
                     </p>
                     
                     <div className="border border-slate-100 rounded-lg overflow-hidden">
                       <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-500 font-semibold">
                             <tr>
                                <th className="px-3 py-2 border-b border-slate-100">category (X轴)</th>
                                <th className="px-3 py-2 border-b border-slate-100">value1</th>
                                <th className="px-3 py-2 border-b border-slate-100">value2</th>
                                <th className="px-3 py-2 border-b border-slate-100">value3</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {PREVIEW_DATA.rows.slice(0, 6).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                   <td className="px-3 py-2 font-mono text-slate-600">{row.category}</td>
                                   <td className="px-3 py-2 font-mono text-slate-600">{row.value1}</td>
                                   <td className="px-3 py-2 font-mono text-slate-600">{row.value2}</td>
                                   <td className="px-3 py-2 font-mono text-slate-600">{row.value3}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                     </div>

                     <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <h4 className="text-xs font-bold text-indigo-800 mb-2">字段映射说明</h4>
                        <ul className="space-y-1.5 text-xs text-indigo-700">
                           <li className="flex items-start gap-2">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[10px] uppercase font-bold text-indigo-500 shrink-0">X Axis</span>
                              <span className="leading-tight">通常对应数据中的分类字段，例如：日期、部门名称、产品类别等。</span>
                           </li>
                           <li className="flex items-start gap-2">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[10px] uppercase font-bold text-indigo-500 shrink-0">Value</span>
                              <span className="leading-tight">对应数据中的度量字段，例如：销售额、数量、百分比等。</span>
                           </li>
                           {template.isCustom && template.customSpec && (
                              <li className="mt-2 pt-2 border-t border-indigo-200">
                                 <span className="font-semibold block mb-1">包含图表系列:</span>
                                 <div className="ml-1 space-y-1">
                                    {template.customSpec.series.map((s, i) => (
                                       <div key={i} className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                          <span>数据列 {i+1} : 渲染为 {s.type === 'bar' ? '柱状' : s.type === 'line' ? '折线' : s.type === 'area' ? '面积' : '散点'} {s.yAxisId === 'right' ? '(右轴)' : ''}</span>
                                       </div>
                                    ))}
                                 </div>
                              </li>
                           )}
                        </ul>
                     </div>
                  </div>
               </div>
               
               <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-700">
                 <strong>提示:</strong> 您可以在创建 AI 报表时，通过自然语言描述来调用此组件，或者直接在组件库中选择它。系统会自动尝试将您的真实数据映射到这些字段。
               </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
