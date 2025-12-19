import React, { useState } from 'react';
import { Table, X, PlusCircle, Loader2 } from 'lucide-react';
import { TableData, DataSource } from '../types';
import { apiService } from '../services/api';

interface ImportTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (table: TableData) => void;
  existingTableIds: string[];
  dataSource: DataSource | null;
}

export const ImportTableModal: React.FC<ImportTableModalProps> = ({ isOpen, onClose, onImport, existingTableIds, dataSource }) => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleLoad = async () => {
    if (!dataSource) return;
    setLoading(true);
    try {
      const payload: any = {
        type: dataSource.config.type,
        host: dataSource.config.host,
        port: dataSource.config.port,
        username: dataSource.config.username,
        password,
        serviceName: dataSource.config.serviceName,
        database: (dataSource.config as any).database
      };
      const result = await apiService.listTables(payload);
      if (result.success) {
        setTables(result.tables);
      } else {
        alert(`加载失败：${result.message}`);
      }
    } catch (e: any) {
      alert(`请求失败：${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify之间 items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text白色">
            <Table className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">导入数据表</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-4">从已连接的数据库中选择数据表导入到您的工作区。</p>
          
          <div className="flex items-center gap-2 mb-4">
            <input
              type="password"
              placeholder="连接密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <button
              onClick={handleLoad}
              disabled={loading || !dataSource || !password}
              className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              加载源表
            </button>
          </div>
          
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">表名</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">描述</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">行数</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...tables].sort((a, b) => a.name.localeCompare(b.name)).map((table) => {
                  const isImported = existingTableIds.includes(table.id);
                  return (
                    <tr key={table.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{table.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{table.description || ''}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{table.rows?.length || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (!isImported) {
                              onImport(table);
                              onClose();
                            }
                          }}
                          disabled={isImported}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            isImported 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                        >
                          {isImported ? (
                            '已导入'
                          ) : (
                            <>
                              <PlusCircle className="w-4 h-4" />
                              导入
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
