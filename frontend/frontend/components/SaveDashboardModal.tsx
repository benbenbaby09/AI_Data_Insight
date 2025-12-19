import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

interface SaveDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
}

export const SaveDashboardModal: React.FC<SaveDashboardModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentName 
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Save className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">保存报表配置</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">报表名称</label>
            <input 
              type="text" 
              autoFocus
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              placeholder="请输入报表名称..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-2">
              保存后，您可以在历史记录中随时找到此配置。
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={!name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};