import React, { useState } from 'react';
import { 
  ArrowLeft, 
  LayoutTemplate, 
  Trash2, 
  BarChart3, 
  LineChart, 
  PieChart, 
  AreaChart, 
  Radar, 
  ScatterChart,
  Component,
  Search,
  Plus,
  Code,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ChartTemplate, WebComponentTemplate, Dataset } from '../types';
import { WebComponentBuilderModal } from './WebComponentBuilderModal';
import { ChartBuilderModal } from './ChartBuilderModal';

interface UnifiedComponentManagerProps {
  chartTemplates: ChartTemplate[];
  webComponents: WebComponentTemplate[];
  datasets: Dataset[];
  onBack: () => void;
  
  // Chart Handlers
  onSaveChart: (template: ChartTemplate) => void;
  onDeleteChart: (id: number) => void;
  
  // Web Component Handlers
  onSaveWebComponent: (comp: WebComponentTemplate) => void;
  onDeleteWebComponent: (id: number) => void;
}

export const UnifiedComponentManager: React.FC<UnifiedComponentManagerProps> = ({ 
  chartTemplates,
  webComponents,
  datasets,
  onBack,
  onSaveChart,
  onDeleteChart,
  onSaveWebComponent,
  onDeleteWebComponent
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'web-components'>('charts');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Chart Builder State
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartTemplate | null>(null);

  // Web Component Builder State
  const [isWebBuilderOpen, setIsWebBuilderOpen] = useState(false);
  const [editingWebComponent, setEditingWebComponent] = useState<WebComponentTemplate | null>(null);

  // --- Helper Functions ---

  const getChartIcon = (iconName: string, isCustom: boolean) => {
    if (isCustom) return <Component className="w-5 h-5 text-purple-600" />;
    switch (iconName) {
      case 'BarChart3': return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'LineChart': return <LineChart className="w-5 h-5 text-emerald-600" />;
      case 'PieChart': return <PieChart className="w-5 h-5 text-amber-600" />;
      case 'AreaChart': return <AreaChart className="w-5 h-5 text-indigo-600" />;
      case 'Radar': return <Radar className="w-5 h-5 text-rose-600" />;
      case 'ScatterChart': return <ScatterChart className="w-5 h-5 text-cyan-600" />;
      default: return <LayoutTemplate className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleEditWebComponent = (comp: WebComponentTemplate) => {
    setEditingWebComponent(comp);
    setIsWebBuilderOpen(true);
  };

  const handleCreateWebComponent = () => {
    setEditingWebComponent(null);
    setIsWebBuilderOpen(true);
  };

  const handleEditChart = (chart: ChartTemplate) => {
    setEditingChart(chart);
    setIsChartBuilderOpen(true);
  };

  const handleCreateChart = () => {
    setEditingChart(null);
    setIsChartBuilderOpen(true);
  };

  // --- Filtering & Pagination ---

  const filteredCharts = chartTemplates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWebComponents = webComponents.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = activeTab === 'charts' ? filteredCharts.length : filteredWebComponents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentCharts = filteredCharts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentWebComponents = filteredWebComponents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page on search or tab change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

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
          
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">部件管理</h1>
              <p className="text-slate-500 mt-1">
                统一管理所有的图表部件和自定义 Web 部件。
              </p>
            </div>
            
            <div className="flex gap-3">
              {activeTab === 'charts' ? (
                <button 
                  onClick={handleCreateChart}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-purple-600/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  新建图表部件
                </button>
              ) : (
                <button 
                  onClick={handleCreateWebComponent}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  新建 Web 部件
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 mt-4 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('charts')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'charts' 
                  ? 'text-purple-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              图表部件
              {activeTab === 'charts' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('web-components')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'web-components' 
                  ? 'text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Web 部件
              {activeTab === 'web-components' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
              )}
            </button>
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
               placeholder={activeTab === 'charts' ? "搜索图表组件..." : "搜索 Web 组件..."}
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
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                    {activeTab === 'charts' ? '类型' : '创建时间'}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTab === 'charts' ? (
                  currentCharts.length > 0 ? (
                    currentCharts.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.isCustom ? 'bg-purple-50' : 'bg-slate-50'}`}>
                            {getChartIcon(t.icon || 'LayoutTemplate', t.isCustom)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{t.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-500 line-clamp-1">{t.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          {t.isCustom ? (
                             <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase">Custom</span>
                          ) : (
                             <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase">Standard</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.isCustom && (
                              <>
                                <button 
                                  onClick={() => handleEditChart(t)}
                                  className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if(window.confirm('确定要删除这个组件吗？')) onDeleteChart(t.id);
                                  }}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        暂无图表组件
                      </td>
                    </tr>
                  )
                ) : (
                  currentWebComponents.length > 0 ? (
                    currentWebComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <Code className="w-4 h-4" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{comp.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-500 line-clamp-1">{comp.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">
                            {new Date(comp.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditWebComponent(comp)}
                              className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if(window.confirm('确定要删除这个组件吗？')) onDeleteWebComponent(comp.id);
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
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        暂无 Web 组件
                      </td>
                    </tr>
                  )
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

      {/* Modals */}
      {isWebBuilderOpen && (
        <WebComponentBuilderModal
          isOpen={isWebBuilderOpen}
          onClose={() => setIsWebBuilderOpen(false)}
          onSave={(comp) => {
             onSaveWebComponent(comp);
             setIsWebBuilderOpen(false);
          }}
          initialComponent={editingWebComponent || undefined}
          datasets={datasets}
        />
      )}
      
      {isChartBuilderOpen && (
        <ChartBuilderModal
          isOpen={isChartBuilderOpen}
          onClose={() => setIsChartBuilderOpen(false)}
          onSave={(template) => {
            onSaveChart(template);
            setIsChartBuilderOpen(false);
          }}
          initialTemplate={editingChart || undefined}
        />
      )}
    </div>
  );
};
