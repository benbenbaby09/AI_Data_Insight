import React, { useState, useEffect } from 'react';
import { Database, X, Check, Loader2, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DatabaseConfig } from '../types';
import { apiService } from '../services/api';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: DatabaseConfig, description: string) => void;
  initialConfig?: DatabaseConfig | null;
  initialDescription?: string;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({ isOpen, onClose, onConnect, initialConfig, initialDescription }) => {
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [description, setDescription] = useState('');
  const [formData, setFormData] = useState<DatabaseConfig>({
    type: 'oracle',
    name: '',
    host: 'localhost',
    port: '1521',
    serviceName: 'ORCL',
    database: '',
    username: '',
  });
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTestStatus('idle');
      setTestMessage('');
      if (initialConfig) {
        setFormData(initialConfig);
        setDescription(initialDescription || '');
        setPassword(''); // Empty in edit mode to show placeholder
      } else {
        setFormData({
          type: 'oracle',
          name: '',
          host: 'localhost',
          port: '1521',
          serviceName: 'ORCL',
          database: '',
          username: '',
        });
        setDescription('');
        setPassword('');
      }
    }
  }, [isOpen, initialConfig, initialDescription]);

  if (!isOpen) return null;

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    setTestStatus('testing');
    setTestMessage('');
    try {
        const result = await apiService.testConnection({
            ...formData,
            password
        });
        if (result.success) {
            setTestStatus('success');
            setTestMessage('连接成功！');
        } else {
            setTestStatus('error');
            setTestMessage(`连接失败: ${result.message}`);
        }
    } catch (err: any) {
        setTestStatus('error');
        setTestMessage(`请求失败: ${err.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network delay for connection
    setTimeout(() => {
      setLoading(false);
      // If no name provided, generate one
      const finalConfig: DatabaseConfig = {
        ...formData,
        name: formData.name.trim() || `${formData.type.toUpperCase()}_${Math.floor(Math.random() * 1000)}`,
      };

      // Only include password if it's provided
      // For new connections (no initialConfig), password is required so we send it
      // For existing connections, if password is empty, we don't send it (backend keeps existing)
      if (!initialConfig || password) {
        finalConfig.password = password;
      }

      onConnect(finalConfig, description);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Database className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">{initialConfig ? '编辑数据源配置' : '连接数据源'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">连接名称 (别名)</label>
            <input 
                type="text" 
                placeholder="例如: 财务主数据库"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">描述 (可选)</label>
            <textarea 
                placeholder="例如: 存储2023年之前的历史财务数据..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">数据库类型</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="oracle">Oracle Database</option>
              <option value="postgres">PostgreSQL (Beta)</option>
              <option value="mysql">MySQL (Beta)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">主机 (Host)</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.host}
                onChange={(e) => setFormData({...formData, host: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">端口</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.port}
                onChange={(e) => setFormData({...formData, port: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">服务名 / SID</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.serviceName}
              onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
            />
          </div>

          {(formData.type === 'mysql' || formData.type === 'postgres') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">数据库名称</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.database || ''}
                onChange={(e) => setFormData({...formData, database: e.target.value})}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input 
                type="password" 
                required={!initialConfig} // Password not required on edit if unchanged
                placeholder={initialConfig ? "••••••••" : ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {/* Test Result Message */}
            {testStatus !== 'idle' && (
                <div className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
                    testStatus === 'success' ? 'bg-green-50 text-green-700' : 
                    testStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                }`}>
                    {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {testStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    <span>{testStatus === 'testing' ? '正在尝试连接...' : testMessage}</span>
                </div>
            )}

            <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || loading}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  测试连接
                </button>
                <button 
                  type="submit" 
                  disabled={loading || testStatus === 'testing'}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {initialConfig ? '保存更改' : '建立连接'}
                    </>
                  )}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
