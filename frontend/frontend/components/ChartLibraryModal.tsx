import React, { useState } from 'react';
import { 
  X, 
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Code,
  Sparkles,
  Wand2,
  Component,
  BarChart3,
  PlusCircle,
  Filter,
  ChevronDown
} from 'lucide-react';
import { ChartTemplate, WebComponentTemplate, SavedComponent } from '../types';

interface ChartLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
  currentSelection: string | null;
  webComponents: WebComponentTemplate[];
  chartTemplates?: ChartTemplate[]; 
  savedComponents?: SavedComponent[];
}

export const ChartLibraryModal: React.FC<ChartLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  currentSelection,
  webComponents,
  chartTemplates = [],
  savedComponents = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chart' | 'web'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  if (!isOpen) return null;

  // Combine all items into a unified structure
  // Only query widgets table data (Saved Components, Chart Templates, Web Components)
  const allItems = [
    // Saved Components (Charts)
    ...savedComponents.map(item => ({
      id: `saved:${item.id}`,
      name: item.name,
      description: item.description || "已保存图表",
      type: 'chart',
      category: 'saved',
      original: item
    })),
    // Chart Templates (from DB)
    ...chartTemplates.map(item => ({
      id: String(item.id),
      name: item.name,
      description: item.description,
      type: 'chart',
      category: 'template',
      original: item
    })),
    // Web Components (from DB)
    ...webComponents.map(item => ({
      id: `web:${item.id}`,
      name: item.name,
      description: item.description || "Web 网页部件",
      type: 'web',
      category: 'web',
      original: item
    }))
  ];

  // Filter items
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-lg">部件管理</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
            {/* 1. Create New Section */}
            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    新建部件
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* AI Chart */}
                    <button
                        onClick={() => {
                            onSelect('__GENERATE_CHART__');
                            onClose();
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition-all group text-left"
                    >
                        <div className="p-3 rounded-full bg-white text-indigo-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-700">AI 智能图表</h3>
                            <p className="text-xs text-indigo-600/80 mt-1">
                                描述需求，自动生成图表并绑定数据
                            </p>
                        </div>
                    </button>

                    {/* AI Web Component */}
                    <button
                        onClick={() => {
                            onSelect('__CREATE_NEW__');
                            onClose();
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-400 transition-all group text-left"
                    >
                        <div className="p-3 rounded-full bg-white text-purple-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                            <Code className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-700">Web 网页部件</h3>
                            <p className="text-xs text-purple-600/80 mt-1">
                                使用 AI 生成或自定义 HTML/React 组件
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* 2. Widget Library Section */}
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-slate-500" />
                        部件库
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value as 'all' | 'chart' | 'web');
                                    setCurrentPage(1);
                                }}
                                className="pl-9 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 appearance-none bg-white cursor-pointer hover:border-slate-300 transition-colors"
                            >
                                <option value="all">所有类型</option>
                                <option value="chart">图表组件</option>
                                <option value="web">Web组件</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="搜索部件..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset to first page on search
                                }}
                                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-48 transition-colors"
                            />
                        </div>
                    </div>
                </div>
                
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                        未找到匹配的部件
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium">部件名称</th>
                                    <th className="px-4 py-3 font-medium w-32">类型</th>
                                    <th className="px-4 py-3 font-medium">描述</th>
                                    <th className="px-4 py-3 font-medium text-right w-24">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {currentItems.map(item => {
                                     const isSelected = currentSelection === item.id;
                                     return (
                                        <tr 
                                            key={item.id}
                                            className={`group transition-colors hover:bg-slate-50/80 ${
                                                isSelected ? 'bg-indigo-50/60' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{item.name}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.type === 'web' ? (
                                                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100 w-fit">
                                                        <Code className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">Web</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 w-fit">
                                                        <BarChart3 className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">图表</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-500 text-xs truncate max-w-[200px]" title={item.description}>
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        onSelect(item.id);
                                                        onClose();
                                                    }}
                                                    className={`p-2 rounded-lg transition-all duration-200 group/btn flex items-center justify-center ml-auto ${
                                                        isSelected 
                                                            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                                                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-md'
                                                    }`}
                                                    title="添加到大屏"
                                                >
                                                    <PlusCircle className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                     );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Pagination */}
                {filteredItems.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                            显示 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} 共 {filteredItems.length} 个部件
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-medium text-slate-600">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
