import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  BarChart3, 
  LineChart, 
  PieChart, 
  AreaChart, 
  Radar, 
  ScatterChart, 
  Component, 
  LayoutTemplate,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SavedComponent, Dataset } from '../types';

interface ComponentManagerProps {
  components: SavedComponent[];
  datasets: Dataset[];
  onBack: () => void;
  onDelete: (id: number) => void;
}

export const ComponentManager: React.FC<ComponentManagerProps> = ({
  components,
  datasets,
  onBack,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'line': return <LineChart className="w-5 h-5 text-emerald-600" />;
      case 'pie': return <PieChart className="w-5 h-5 text-amber-600" />;
      case 'area': return <AreaChart className="w-5 h-5 text-indigo-600" />;
      case 'radar': return <Radar className="w-5 h-5 text-rose-600" />;
      case 'scatter': return <ScatterChart className="w-5 h-5 text-cyan-600" />;
      case 'web-component': return <Component className="w-5 h-5 text-purple-600" />;
      default: return <LayoutTemplate className="w-5 h-5 text-slate-600" />;
    }
  };

  const filteredComponents = components.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredComponents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentComponents = filteredComponents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getDatasetName = (id: number) => {
    const ds = datasets.find(d => d.id === id);
    return ds ? ds.name : '未知数据集';
  };

  // Reset page on search
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            返回仪表盘
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900">部件管理</h1>
            <p className="text-slate-500 mt-1">
              管理所有已绑定数据集的图表部件。
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 overflow-y-auto flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Search Bar */}
          <div className="relative">
             <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
             <input 
               type="text" 
               placeholder="搜索部件..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
             />
          </div>

          {/* Table View */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Icon</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">数据集</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">创建时间</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {currentComponents.length > 0 ? (
                    currentComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                            {getChartIcon(comp.config.type)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{comp.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-500 line-clamp-1">{comp.description}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                             {getDatasetName(comp.datasetId)}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">
                            {new Date(comp.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                if(window.confirm('确定要删除这个部件吗？')) onDelete(comp.id);
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        暂无部件
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="text-sm text-slate-500">
                  显示 {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} 到 {Math.min(currentPage * itemsPerPage, totalItems)} 条，共 {totalItems} 条
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
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
