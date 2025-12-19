import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ArrowLeft,
  FileCode,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { Dataset, DataSource } from '../types';
import { DatasetViewModal } from './DatasetViewModal';
import { ConfirmModal } from './ConfirmModal';

interface DatasetManagerProps {
  datasets: Dataset[];
  dataSources: DataSource[];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (dataset: Dataset) => void;
  onDelete: (id: number) => void;
  onManageSource: (sourceId: number) => void;
  checkUsage?: (dataset: Dataset) => { inUse: boolean; message?: string };
}

const PAGE_SIZE = 15;

export const DatasetManager: React.FC<DatasetManagerProps> = ({
  datasets,
  dataSources,
  onBack,
  onCreate,
  onEdit,
  onDelete,
  onManageSource,
  checkUsage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null);
  
  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    isAlert: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    isAlert: false
  });

  const handleDeleteClick = (ds: Dataset) => {
    if (checkUsage) {
      const usage = checkUsage(ds);
      if (usage.inUse) {
        setConfirmState({
          isOpen: true,
          type: 'warning',
          title: '无法删除数据集',
          message: usage.message || '该数据集正在被使用，无法删除。',
          isAlert: true
        });
        return;
      }
    }
    
    setConfirmState({
      isOpen: true,
      type: 'danger',
      title: '删除数据集',
      message: `确定要删除数据集 "${ds.name}" 吗？\n此操作不可恢复，请谨慎操作。`,
      isAlert: false,
      onConfirm: () => {
        onDelete(ds.id);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filter & Search
  const filteredDatasets = useMemo(() => {
    let result = datasets;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(lower) || 
        d.description?.toLowerCase().includes(lower)
      );
    }
    // Sort by created desc
    return [...result].sort((a, b) => b.createdAt - a.createdAt);
  }, [datasets, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredDatasets.length / PAGE_SIZE);
  const paginatedDatasets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDatasets.slice(start, start + PAGE_SIZE);
  }, [filteredDatasets, currentPage]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
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
              <h1 className="text-2xl font-bold text-slate-900">数据集管理</h1>
              <p className="text-slate-500 mt-1">
                管理已创建的 SQL 数据集，支持查看、删除及预览数据。当前共有 {datasets.length} 条记录。
              </p>
            </div>
            <button 
              onClick={onCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              新建数据集
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="px-8 py-4 bg-slate-50 flex justify-center shrink-0">
         <div className="max-w-7xl w-full flex justify-between items-center">
            <div className="relative w-96">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="搜索数据集名称或描述..."
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
               />
            </div>
         </div>
      </div>

      {/* Content Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[500px]">
           {datasets.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <FileCode className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-lg font-medium text-slate-900">暂无数据集</h3>
               <p className="text-slate-500 max-w-sm mt-2 mb-8">
                 点击上方“新建数据集”按钮开始创建。
               </p>
             </div>
           ) : (
             <>
               <div className="flex-1 overflow-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-semibold text-slate-500 uppercase tracking-wider">
                       <tr>
                          <th className="px-6 py-4 border-b border-slate-200 w-[25%]">数据集名称</th>
                          <th className="px-6 py-4 border-b border-slate-200 w-[30%]">描述</th>
                          <th className="px-6 py-4 border-b border-slate-200 w-[15%]">来源 (点击配置)</th>
                          <th className="px-6 py-4 border-b border-slate-200 w-[15%]">创建时间</th>
                          <th className="px-6 py-4 border-b border-slate-200 w-[15%] text-right">操作</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                       {paginatedDatasets.map(ds => (
                         <tr key={ds.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                               <div className="font-medium text-slate-900 flex items-center gap-2">
                                  <FileCode className="w-4 h-4 text-blue-500" />
                                  {ds.name}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={ds.description}>
                               {ds.description || '-'}
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-wrap gap-1.5">
                                  {ds.dataSourceId ? (
                                    (() => {
                                      const id = ds.dataSourceId;
                                      const source = dataSources.find(s => s.id === id);
                                      return (
                                        <button 
                                          key={id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onManageSource(id);
                                          }}
                                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded border border-transparent hover:border-blue-200 transition-all text-xs cursor-pointer group/btn"
                                          title={`跳转到数据源配置: ${source?.name || 'Unknown'}`}
                                        >
                                          <Database className="w-3 h-3 text-slate-400 group-hover/btn:text-blue-500" />
                                          <span className="truncate max-w-[100px]">{source?.name || 'Unknown'}</span>
                                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/btn:opacity-100" />
                                        </button>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">无来源</span>
                                  )}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                               <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {new Date(ds.createdAt).toLocaleDateString()}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingDataset(ds);
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                    title="查看详情"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <div className="w-px h-3 bg-slate-300 mx-1" />
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(ds);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="编辑"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <div className="w-px h-3 bg-slate-300 mx-1" />
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(ds);
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
                       {paginatedDatasets.length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                没有找到匹配的数据集
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
               </div>

               {/* Pagination */}
               <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-sm">
                  <div className="text-slate-500">
                     显示 {(currentPage - 1) * PAGE_SIZE + 1} 到 {Math.min(currentPage * PAGE_SIZE, filteredDatasets.length)} 条，共 {filteredDatasets.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                     >
                        <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span className="px-2 font-medium text-slate-700">第 {currentPage} 页</span>
                     <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                     >
                        <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>
             </>
           )}
        </div>
      </div>
      
      {/* View Modal */}
      <DatasetViewModal 
        isOpen={!!viewingDataset} 
        onClose={() => setViewingDataset(null)} 
        dataset={viewingDataset}
        dataSources={dataSources}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        isAlert={confirmState.isAlert}
      />
    </div>
  );
};