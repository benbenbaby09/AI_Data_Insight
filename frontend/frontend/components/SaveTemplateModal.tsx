
import React, { useState, useEffect } from 'react';
import { Bookmark, X } from 'lucide-react';
import { ChartConfig } from '../types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  config: ChartConfig | null;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  config 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && config) {
      setName(config.title || '');
      setDescription(config.description || '');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      onClose();
    }
  };

  const isComponent = config && '_datasetId' in config;
  const title = isComponent ? '保存为图表部件' : '保存为部件模板';
  const buttonText = isComponent ? '保存为部件' : '保存模板';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Bookmark className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名称</label>
            <input 
              type="text" 
              autoFocus
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
              placeholder="例如: 季度销售柱状图"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">描述 (可选)</label>
             <textarea 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-shadow h-24 resize-none"
               placeholder="描述此部件的用途或数据结构要求..."
               value={description}
               onChange={(e) => setDescription(e.target.value)}
             />
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
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
