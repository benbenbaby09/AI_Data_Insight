import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Table as TableIcon, Code } from 'lucide-react';
import { TableData, DatabaseConfig, Column } from '../types';
import { apiService } from '../services/api';

interface TablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableData | null;
  sql?: string;
  dbConfig?: DatabaseConfig | null;
}

const PAGE_SIZE = 20;

export const TablePreviewModal: React.FC<TablePreviewModalProps> = ({ isOpen, onClose, table, sql, dbConfig }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset page when table changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen, table?.id]);

  // Fetch preview rows from backend when dbConfig provided
  useEffect(() => {
    const fetchPreview = async () => {
      if (!isOpen || !table || !dbConfig) return;
      setLoading(true);
      try {
        const payload: any = {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: (dbConfig as any).password,
          serviceName: dbConfig.serviceName,
          database: (dbConfig as any).database,
          tableName: table.name,
          limit: 50
        };
        const res = await apiService.previewTableRows(payload);
        if (res.success) {
          setRows(res.rows || []);
        } else {
          setRows([]);
        }
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [isOpen, table?.name, dbConfig]);

  const effectiveRows = useMemo(() => rows.length > 0 ? rows : (table?.rows || []), [rows, table?.rows]);
  
  // Dynamically calculate columns if table.columns is empty but we have data
  const displayColumns = useMemo(() => {
    if (!table) return [];
    if (table.columns && table.columns.length > 0) {
      return table.columns;
    }
    // Infer columns from first row of data
    if (effectiveRows.length > 0) {
      const firstRow = effectiveRows[0];
      return Object.keys(firstRow).map(key => ({
        name: key,
        type: (typeof firstRow[key] === 'number' ? 'number' : 'string') as 'number' | 'string',
        alias: key
      }));
    }
    return [];
  }, [table, effectiveRows]);

  if (!isOpen || !table) return null;

  const totalRows = effectiveRows.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentRows = effectiveRows.slice(startIndex, startIndex + PAGE_SIZE);
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <TableIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">{table.name}</h2>
              <p className="text-xs text-slate-400 font-light mt-0.5 max-w-md truncate">
                {table.description || "数据预览"}
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

        {/* SQL Display (Optional) */}
        {sql && (
          <div className="bg-slate-900 border-b border-slate-700 p-4 shrink-0">
             <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
               <Code className="w-3 h-3" />
               Source SQL
             </div>
             <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
               {sql}
             </pre>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-white relative">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">
                  #
                </th>
                {displayColumns.map((col) => (
                  <th key={col.name} className="px-6 py-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">{col.alias || col.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({col.name})</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1 lowercase font-normal">
                        {col.type}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRows.length > 0 ? (
                loading ? (
                  <tr><td colSpan={displayColumns.length + 1} className="px-6 py-12 text-center text-slate-400">正在加载数据...</td></tr>
                ) : (
                currentRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-400 text-xs text-center border-r border-slate-50">
                      {startIndex + idx + 1}
                    </td>
                    {displayColumns.map((col) => (
                      <td key={`${idx}-${col.name}`} className="px-6 py-3 whitespace-nowrap max-w-xs truncate">
                        {(() => {
                          const exact = row[col.name];
                          const lower = row[col.name.toLowerCase()];
                          const upper = row[col.name.toUpperCase()];
                          const val = exact ?? lower ?? upper;
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-mono">{col.name}</span>
                              {val !== undefined && val !== null
                                ? <span className="text-slate-700">{String(val)}</span>
                                : <span className="text-slate-300 italic">null</span>}
                            </div>
                          );
                        })()}
                      </td>
                    ))}
                  </tr>
                )))
              ) : (
                <tr>
                  <td colSpan={displayColumns.length + 1} className="px-6 py-12 text-center text-slate-400 italic">
                    表中暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0 text-sm">
          <div className="text-slate-500">
            显示 <span className="font-medium text-slate-900">{startIndex + 1}</span> 到 <span className="font-medium text-slate-900">{endIndex}</span> 条，共 <span className="font-medium text-slate-900">{totalRows}</span> 条
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-slate-600 font-medium">
              第 {currentPage} / {totalPages || 1} 页
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
