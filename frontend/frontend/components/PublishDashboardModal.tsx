
import React, { useState } from 'react';
import { Share2, X, Copy, Check, Globe, Download, FileJson } from 'lucide-react';
import { Dashboard, DataSource, Dataset, ExportPackage } from '../types';
import { apiService } from '../services/api';

interface PublishDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboard: Dashboard;
}

export const PublishDashboardModal: React.FC<PublishDashboardModalProps> = ({ 
  isOpen, 
  onClose, 
  dashboard
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate URL
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?mode=share&id=${dashboard.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportConfig = async () => {
    try {
      // Get all necessary data from API to ensure we have the latest
      const [allDataSources, allDatasets] = await Promise.all([
         apiService.getDataSources(),
         apiService.getDatasets()
      ]);
      
      // Filter Dependencies
      // 1. DataSources linked explicitly to the dashboard (Removed logic, now relying on widgets)
      // const linkedSourceIds: number[] = []; 
      
      // 2. DataSources and Datasets used by widgets
      const widgetTableIds = dashboard.widgets.map(w => w.datasetId || w.tableId).filter(Boolean);
      
      // Find datasets used by widgets
      const relevantDatasets = allDatasets.filter(d => widgetTableIds.includes(d.id));
      
      // Find sources used by datasets
      const datasetSourceIds = relevantDatasets.map(d => d.dataSourceId);
      
      // Find sources used directly by widgets (if any direct table references exist outside datasets)
      const directSourceIds = allDataSources
        .filter(ds => ds.tables.some(t => widgetTableIds.includes(t.id)))
        .map(ds => ds.id);

      const finalSourceIds = Array.from(new Set([...datasetSourceIds, ...directSourceIds]));
      const relevantDataSources = allDataSources.filter(ds => finalSourceIds.includes(ds.id));

      const exportPackage: ExportPackage = {
        version: '1.0',
        dashboard: dashboard,
        dataSources: relevantDataSources,
        datasets: relevantDatasets,
        exportedAt: Date.now()
      };
      
      const jsonContent = JSON.stringify(exportPackage, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dashboard.name.replace(/\s+/g, '_')}_config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("导出配置失败，请检查控制台日志。");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Globe className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">发布仪表盘</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
               <Share2 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">准备分享与部署</h3>
            <p className="text-slate-500 text-sm mt-1">
              您的仪表盘 "<span className="font-medium text-slate-700">{dashboard.name}</span>" 已准备就绪。
            </p>
          </div>

          <div className="space-y-4">
             {/* Link Share */}
             <div>
                <div className="mb-2 text-xs font-semibold text-slate-500 uppercase flex justify-between items-center">
                   <span>内部访问链接</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 truncate font-mono select-all">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="p-2.5 bg-white border border-slate-200 hover:border-purple-300 hover:text-purple-600 rounded-lg transition-colors shadow-sm"
                    title="复制链接"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
             </div>

             {/* Export Config */}
             <div className="pt-4 border-t border-slate-100">
                <div className="mb-2 text-xs font-semibold text-slate-500 uppercase">配置导出 (JSON)</div>
                <button 
                  onClick={handleExportConfig}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <FileJson className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                  导出仪表盘配置包
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                   包含仪表盘布局、关联的数据源配置及数据集定义。可通过“导入”功能恢复到任何环境。
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
