import React, { useState, useEffect } from 'react';
import { X, Code, Table as TableIcon, Calendar, Database, RefreshCw, Loader2 } from 'lucide-react';
import { Dataset, DataSource, TableData } from '../types';
import { apiService } from '../services/api';

interface DatasetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  dataSources: DataSource[];
}

export const DatasetViewModal: React.FC<DatasetViewModalProps> = ({ isOpen, onClose, dataset, dataSources }) => {
  const [localPreviewData, setLocalPreviewData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && dataset) {
      setLocalPreviewData(dataset.previewData || null);
      handleRefresh();
    }
  }, [isOpen, dataset]);

  const handleRefresh = async () => {
    if (!dataset || !dataset.dataSourceId) return;
    
    const activeDS = dataSources.find(ds => ds.id === dataset.dataSourceId);
    if (!activeDS) {
        setErrorMsg("找不到对应的数据源");
        return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    
    try {
        const payload = {
            type: activeDS.config.type,
            host: activeDS.config.host,
            port: activeDS.config.port,
            username: activeDS.config.username,
            password: activeDS.config.password,
            serviceName: activeDS.config.serviceName,
            database: (activeDS.config as any).database,
            sql: dataset.sql,
            limit: 20
        };
        const result = await apiService.executeSql(payload);
        
        if (result.success) {
            let columns: any[] = [];
            
            if (result.columns && result.columns.length > 0) {
                 columns = result.columns.map(name => ({
                     name: name,
                     type: 'string' 
                 }));
                 if (result.rows && result.rows.length > 0) {
                      columns = columns.map(col => ({
                          ...col,
                          type: typeof result.rows[0][col.name] === 'number' ? 'number' : 'string'
                      }));
                 }
            } else if (result.rows && result.rows.length > 0) {
                columns = Object.keys(result.rows[0]).map(key => ({
                    name: key,
                    type: typeof result.rows[0][key] === 'number' ? 'number' : 'string'
                }));
            }

            setLocalPreviewData({
                id: Date.now(),
                name: 'SQL Execution Result',
                columns: columns,
                rows: result.rows || [],
                description: 'Generated from SQL execution',
                dataSourceId: activeDS.id
            });
        } else {
            setErrorMsg(result.message || "执行查询失败或无数据返回");
        }
    } catch (error) {
        console.error("SQL execution failed:", error);
        setErrorMsg("执行查询失败，请检查数据库连接或 SQL 语法");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen || !dataset) return null;

  const usedSourceNames = dataSources
    .filter(ds => dataset.dataSourceId === ds.id)
    .map(ds => ds.name)
    .join(', ');

  const previewRows = localPreviewData?.rows || [];
  const previewColumns = localPreviewData?.columns || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
           <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <TableIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg leading-tight">{dataset.name}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                   <span className="flex items-center gap-1">
                     <Calendar className="w-3 h-3" />
                     {new Date(dataset.createdAt).toLocaleString()}
                   </span>
                   <span>|</span>
                   <span className="flex items-center gap-1">
                     <Database className="w-3 h-3" />
                     {usedSourceNames || 'Unknown Source'}
                   </span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
           {/* Description */}
           {dataset.description && (
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">描述</h4>
                <p className="text-sm text-slate-700">{dataset.description}</p>
             </div>
           )}

           {/* SQL */}
           <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                 <Code className="w-4 h-4 text-slate-500" />
                 <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">SQL 查询</span>
              </div>
              <div className="p-4 bg-slate-900 overflow-auto resize-y min-h-[100px] max-h-[500px]">
                 <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap">{dataset.sql}</pre>
              </div>
           </div>

           {/* Data Preview */}
           <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">数据预览 (Top {previewRows.length})</span>
                 </div>
                 <div className="flex items-center gap-3">
                   {errorMsg && (
                      <span className="text-xs text-red-500">{errorMsg}</span>
                   )}
                   <button 
                     onClick={handleRefresh}
                     disabled={isLoading}
                     className="p-1 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                     title="刷新数据"
                   >
                     {isLoading ? (
                       <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                     ) : (
                       <RefreshCw className="w-4 h-4 text-slate-500" />
                     )}
                   </button>
                   <span className="text-xs text-slate-500">{previewRows.length} 行</span>
                 </div>
              </div>
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 w-12 text-center">#</th>
                        {previewColumns.map(col => (
                          <th key={col.name} className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 whitespace-nowrap">
                            {col.name}
                            <span className="ml-1 text-[10px] text-slate-400 font-normal">({col.type})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {previewRows.map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50">
                           <td className="px-4 py-2 text-center text-slate-400 text-xs">{idx + 1}</td>
                           {previewColumns.map(col => (
                             <td key={col.name} className="px-4 py-2 text-slate-700 whitespace-nowrap max-w-xs truncate">
                               {row[col.name]?.toString()}
                             </td>
                           ))}
                         </tr>
                       ))}
                       {previewRows.length === 0 && (
                         <tr>
                           <td colSpan={previewColumns.length + 1} className="px-4 py-8 text-center text-slate-400 italic">
                             无预览数据
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
           >
             关闭
           </button>
        </div>
      </div>
    </div>
  );
};