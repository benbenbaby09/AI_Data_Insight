import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Server, 
  ArrowLeft,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DataSource } from '../types';

interface DataSourceManagerProps {
  dataSources: DataSource[];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (id: number) => void;
  onAnnotate: (id: number) => void;
  onImport: (id: number) => void;
  onDelete: (id: number) => void;
  onCreateDataset: (sourceId: number) => void;
}

const ITEMS_PER_PAGE = 10;

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  dataSources,
  onBack,
  onCreate,
  onEdit,
  onAnnotate,
  onImport,
  onDelete,
  onCreateDataset
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination Logic
  const totalPages = Math.ceil(dataSources.length / ITEMS_PER_PAGE);
  const paginatedDataSources = dataSources.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            返回仪表盘
          </button>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">数据源管理</h1>
              <p className="text-slate-500 mt-1">
                配置、修改或移除您的数据库连接。当前共有 {dataSources.length} 个活跃连接。
              </p>
            </div>
            <button 
              onClick={onCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              新建数据源
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {dataSources.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Database className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">暂无数据源</h3>
              <p className="text-slate-500 max-w-sm mt-2 mb-8">
                您还没有配置任何数据库连接。点击下方按钮开始连接您的第一个 Oracle、MySQL 或 PostgreSQL 数据库。
              </p>
              <button 
                onClick={onCreate}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                立即连接
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">名称 / 描述</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">类型</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">连接信息</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">已导入表</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-[30%]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDataSources.map((ds) => (
                      <tr key={ds.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                              <Database className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 truncate" title={ds.name}>
                                {ds.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={ds.description}>
                                {ds.description || '暂无描述'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 uppercase">
                            {ds.config.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1 text-sm text-slate-600">
                            <div className="flex items-center gap-1.5" title="Host:Port">
                              <Server className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[150px]">{ds.config.host}:{ds.config.port}</span>
                            </div>
                            <div className="text-xs text-slate-500 pl-5">
                              {ds.config.serviceName && <span title="Service Name">Serv: {ds.config.serviceName}</span>}
                              {ds.config.serviceName && ds.config.username && <span className="mx-1">|</span>}
                              {ds.config.username && <span title="Username">User: {ds.config.username}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm">{ds.tables.length}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-4 opacity-100">
                            <button 
                              onClick={() => onAnnotate(ds.id)}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              表管理
                            </button>
                            <button 
                              onClick={() => onCreateDataset(ds.id)}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                              新建数据集
                            </button>
                            <div className="w-px h-4 bg-slate-300" />
                            <button 
                              onClick={() => onEdit(ds.id)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              编辑
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm(`确定要删除数据源 "${ds.name}" 吗？该操作不可恢复。`)) {
                                  onDelete(ds.id);
                                }
                              }}
                              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="text-sm text-slate-500">
                    显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 到 {Math.min(currentPage * ITEMS_PER_PAGE, dataSources.length)} 条，共 {dataSources.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};