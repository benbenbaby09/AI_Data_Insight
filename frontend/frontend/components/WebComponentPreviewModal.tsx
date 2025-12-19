import React from 'react';
import { X, Monitor } from 'lucide-react';
import { WebComponentTemplate } from '../types';
import { WebComponentRenderer } from './WebComponentRenderer';

interface WebComponentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: WebComponentTemplate | null;
}

export const WebComponentPreviewModal: React.FC<WebComponentPreviewModalProps> = ({ isOpen, onClose, component }) => {
  if (!isOpen || !component) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Monitor className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">{component.name} - 预览</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-slate-100 p-8 overflow-hidden relative">
           <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative p-4">
              <WebComponentRenderer code={component.code} />
           </div>
        </div>
      </div>
    </div>
  );
};