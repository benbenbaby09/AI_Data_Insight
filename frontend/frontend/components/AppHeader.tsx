import React, { useState, useEffect, useRef } from 'react';
import { 
  MonitorPlay, 
  Database, 
  ChevronDown, 
  Settings, 
  FileCode, 
  FileText, 
  LayoutTemplate, 
  LayoutDashboard,
  Eye,
  CheckSquare
} from 'lucide-react';
import { Dashboard } from '../types';

interface AppHeaderProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  activeDashboard: Dashboard;
  dashboards: Dashboard[];
  activeDashboardId: number | null;
  setActiveDashboardId: (id: number) => void;
  onPreview: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  setCurrentView,
  activeDashboard,
  dashboards,
  activeDashboardId,
  setActiveDashboardId,
  onPreview
}) => {
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isDataAssetsMenuOpen, setIsDataAssetsMenuOpen] = useState(false);
  
  // Click Outside Handler for Menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDataAssetsMenuOpen && !target.closest('#data-assets-menu-container')) {
        setIsDataAssetsMenuOpen(false);
      }
      if (isDashboardMenuOpen && !target.closest('#dashboard-menu-container')) {
        setIsDashboardMenuOpen(false);
      }
    };

    if (isDataAssetsMenuOpen || isDashboardMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDataAssetsMenuOpen, isDashboardMenuOpen]);

  return (
    <header className="bg-slate-900 text-white shrink-0 z-30 shadow-lg">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-600/20 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              AI
            </div>
            <span className="font-semibold text-lg tracking-tight cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              AI 数据洞察专业版
            </span>
            
            {(currentView === 'dashboard') && (
              <>
                <div className="h-6 w-px bg-slate-700 mx-2" />
                <div id="dashboard-menu-container" className="relative">
                  <button 
                    onClick={() => setIsDashboardMenuOpen(!isDashboardMenuOpen)}
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                      isDashboardMenuOpen ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    <MonitorPlay className="w-4 h-4 text-emerald-400" />
                    {activeDashboard.name}
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDashboardMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isDashboardMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-slate-800">
                      <div className="py-1">
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">切换大屏</div>
                        {dashboards.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                              setActiveDashboardId(d.id);
                              setCurrentView('dashboard');
                              setIsDashboardMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${
                              activeDashboardId === d.id ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'
                            }`}
                          >
                            {d.name}
                            {activeDashboardId === d.id && <CheckSquare className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
             {/* Data Assets Dropdown (Top Right) */}
             <div id="data-assets-menu-container" className="relative z-40">
                <button 
                  onClick={() => setIsDataAssetsMenuOpen(!isDataAssetsMenuOpen)}
                  className={`flex items-center gap-2 text-sm transition-colors px-2 py-1 rounded-md ${
                    (currentView !== 'dashboard') || isDataAssetsMenuOpen 
                      ? 'text-white font-medium bg-slate-800' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  数据资产
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDataAssetsMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDataAssetsMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                     <button 
                        onClick={() => {
                          setCurrentView('management');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'management' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <Settings className="w-4 h-4 text-slate-500" />
                        数据源管理
                     </button>
                     <button 
                        onClick={() => {
                          setCurrentView('datasets');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'datasets' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <FileCode className="w-4 h-4 text-slate-500" />
                        数据集管理
                     </button>
                     <button 
                        onClick={() => {
                          setCurrentView('history-reports');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'history-reports' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <FileText className="w-4 h-4 text-slate-500" />
                        历史报表管理
                     </button>
                     <button 
                        onClick={() => {
                          setCurrentView('component-management');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'component-management' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <LayoutTemplate className="w-4 h-4 text-slate-500" />
                        部件管理
                     </button>
                     <button 
                        onClick={() => {
                          setCurrentView('template-management');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'template-management' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <LayoutTemplate className="w-4 h-4 text-slate-500" />
                        模板管理
                     </button>
                     
                     <div className="my-1 border-t border-slate-100"></div>
                     
                     <button 
                        onClick={() => {
                          setCurrentView('dashboard-management');
                          setIsDataAssetsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 ${currentView === 'dashboard-management' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                     >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" />
                        监控大屏管理
                     </button>
                  </div>
                )}
             </div>

             <div className="w-px h-6 bg-slate-700" />
             
             {/* Preview Button */}
             <button 
               onClick={onPreview}
               className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
             >
               <Eye className="w-3 h-3" />
               预览
             </button>
          </div>
        </div>
      </header>
  );
};
