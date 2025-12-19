
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Play, PlusCircle, Loader2, Database, MessageSquare, AlertCircle, 
  LayoutTemplate, BarChart3, LineChart, PieChart, AreaChart, Radar, ScatterChart, 
  LayoutGrid, Eye, Map as MapIcon, Filter, CheckSquare, Square, Gauge, BoxSelect, Info, Clock
} from 'lucide-react';
import { Dataset, ChartConfig, TableData } from '../types';
import { apiService } from '../services/api';
import { ChartRenderer } from './ChartRenderer';
import { ChartStyleSelector } from './ChartStyleSelector';
import { CHART_TYPES_METADATA } from '../constants';
import { TablePreviewModal } from './TablePreviewModal';
import { ChartTypeInfoModal } from './ChartTypeInfoModal';

interface ChartGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: string | null; // The type string, e.g., 'bar', 'line'
  datasets: Dataset[];
  onAdd: (config: ChartConfig, dataset: Dataset) => void;
}

export const ChartGenerationModal: React.FC<ChartGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  chartType, 
  datasets, 
  onAdd
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('');
  const [selectedChartType, setSelectedChartType] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [selectedFilterColumns, setSelectedFilterColumns] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<ChartConfig | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Info Modal State
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [activeInfoType, setActiveInfoType] = useState<any>(null);
  
  // Real Data State
  const [realData, setRealData] = useState<any[] | null>(null);

  // Auto Update State
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState(30);
  
  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDatasetId('');
      setSelectedChartType(chartType || ''); // Initialize with prop or empty
      setUserQuery('');
      setSelectedFilterColumns([]);
      setGeneratedConfig(null);
      setExplanation('');
      setError(null);
      setRealData(null);
      setIsPreviewOpen(false);
      setAutoUpdateEnabled(false);
      setAutoUpdateInterval(30);
    }
  }, [isOpen, chartType]);

  // Reset filters when dataset changes
  useEffect(() => {
    setSelectedFilterColumns([]);
  }, [selectedDatasetId]);

  if (!isOpen) return null;

  const currentChartLabel = CHART_TYPES_METADATA.find(c => c.type === selectedChartType)?.label || '自动推荐';
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  const toggleFilterColumn = (colName: string) => {
    setSelectedFilterColumns(prev => 
      prev.includes(colName) 
        ? prev.filter(c => c !== colName) 
        : [...prev, colName]
    );
  };

  const handleGenerate = async () => {
    if (!selectedDataset || !selectedDataset.previewData) {
      setError("请先选择一个有效的数据集");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedConfig(null);
    setRealData(null);

    try {
      // Fetch real data from dataset
      apiService.executeDatasetSql(selectedDataset.id, 100).then(res => {
         if (res.success && res.rows) {
            setRealData(res.rows);
         }
      }).catch(err => {
         console.error("Failed to fetch real data", err);
         // Don't block generation, but maybe show warning?
      });

      // Use the selected chart type as reference context for AI
      // Always send type: 'chart' so the backend knows to use the chart provider strategy
      const referenceContext = {
        type: 'chart' as const,
        name: selectedChartType || 'auto'
      };

      const result = await apiService.aiGenerateDataInsight({
        tables: [selectedDataset.previewData],
        userQuery: userQuery || (selectedChartType ? `请生成一个${currentChartLabel}来展示数据` : `请分析数据并生成最合适的图表`),
        referenceContext
      });

      if (result.chartConfig) {
        // [FIX] Adapt AI response format to ChartConfig format
        // The AI might return Chart.js style config (labels/datasets), but we need Recharts config (xAxisKey/dataKeys).
        let adaptedConfig = result.chartConfig;

        // Check if response is in Chart.js format (has data.labels and data.datasets)
        if (result.chartConfig.data && result.chartConfig.data.datasets) {
            const datasets = result.chartConfig.data.datasets;
            const labelsKey = result.chartConfig.data.labels; // Often a string key name in our prompt context
            
            // Try to infer xAxisKey and dataKeys
            // Case 1: labels is a string (key name)
            let xAxisKey = 'name'; // Default fallback
            if (typeof labelsKey === 'string') {
                xAxisKey = labelsKey;
            }
            
            // Case 2: datasets is array of { label, data } where data is key name
            const dataKeys: string[] = [];
            if (Array.isArray(datasets)) {
                datasets.forEach((ds: any) => {
                    if (typeof ds.data === 'string') {
                        dataKeys.push(ds.data);
                    }
                });
            }

            // Case 3: labels is an array (actual values), datasets.data is an array of values
            let rawData: any = undefined;
            if (Array.isArray(labelsKey) && Array.isArray(datasets) && datasets.length > 0 && Array.isArray(datasets[0].data)) {
                 // For line/bar charts with array labels, use "category" as xAxisKey
                 xAxisKey = "category";
                 
                 // Transform into DataRow[] format: [{ category: 'Label1', 'Series1': 10 }, ...]
                 rawData = labelsKey.map((label: string, index: number) => {
                     const row: any = { category: label };
                     datasets.forEach((ds: any) => {
                         if (ds.label && Array.isArray(ds.data)) {
                             row[ds.label] = ds.data[index];
                         }
                     });
                     return row;
                 });
                 
                 // Collect data keys from datasets
                 datasets.forEach((ds: any) => {
                     if (ds.label) dataKeys.push(ds.label);
                 });
            }

            // Construct valid ChartConfig
            if (dataKeys.length > 0) {
                 adaptedConfig = {
                    type: result.chartConfig.type || 'bar',
                    title: result.chartConfig.options?.plugins?.title?.text || 'AI Generated Chart',
                    description: result.explanation || '',
                    xAxisKey: xAxisKey,
                    dataKeys: dataKeys,
                    variant: result.chartConfig.indexAxis === 'y' ? 'horizontal' : 'default',
                    rawData: rawData
                 };
            }
        }
        
        // Check if response is in Vega-Lite format (has angle/color fields)
        if (result.chartConfig.angle || result.chartConfig.color || (result.chartConfig.encoding && (result.chartConfig.encoding.x || result.chartConfig.encoding.y))) {
             let xAxisKey = 'name';
             let dataKeys: string[] = [];
             let variant = 'default';
             let type = result.chartConfig.type || 'bar'; // Default type
             
             // Vega-Lite structure varies, try to extract key fields
             const encoding = result.chartConfig.encoding || result.chartConfig; // Some flattened formats put fields directly on root
             
             // Handle Pie Chart (angle/color)
             if (encoding.angle && encoding.color) {
                 type = 'pie';
                 if (typeof encoding.color.field === 'string') xAxisKey = encoding.color.field;
                 if (typeof encoding.angle.field === 'string') dataKeys.push(encoding.angle.field);
             }
             // Handle Bar/Line (x/y)
             else if (encoding.x && encoding.y) {
                 const xField = encoding.x.field;
                 const yField = encoding.y.field;
                 const xType = encoding.x.type; // nominal, quantitative
                 const yType = encoding.y.type;
                 
                 // Heuristic: Nominal is usually X-axis (category), Quantitative is Y-axis (value)
                 // Unless it's a horizontal bar chart
                 if (yType === 'nominal' || type === 'bar' && result.chartConfig.mark === 'bar' && encoding.y.type === 'nominal') {
                      // Horizontal Bar likely
                      xAxisKey = yField;
                      dataKeys.push(xField);
                      variant = 'horizontal';
                 } else {
                      // Standard vertical
                      xAxisKey = xField;
                      dataKeys.push(yField);
                 }
             }
             
             if (dataKeys.length > 0) {
                 adaptedConfig = {
                     type: type as any,
                     title: result.chartConfig.title || 'AI Generated Chart',
                     description: result.explanation || '',
                     xAxisKey: xAxisKey,
                     dataKeys: dataKeys,
                     variant: variant
                 };
             }
        }

        // Attach the manually selected filters to the AI generated config
        const configWithFilters: ChartConfig = {
            ...adaptedConfig,
            filters: selectedFilterColumns.map(col => ({ column: col }))
        };
        setGeneratedConfig(configWithFilters);
        setExplanation(result.explanation);
      } else {
        setError("AI 未能生成有效的图表配置，请尝试更详细的描述。");
        setExplanation(result.explanation);
      }
    } catch (err) {
      console.error(err);
      setError("生成过程中发生错误，请重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const getFinalConfig = () => {
    if (!generatedConfig) return null;
    return {
      ...generatedConfig,
      autoUpdate: autoUpdateEnabled ? {
          enabled: true,
          interval: autoUpdateInterval
      } : undefined
    };
  };

  const handleAdd = () => {
    const config = getFinalConfig();
    if (config && selectedDataset) {
      onAdd(config, selectedDataset);
      onClose();
    }
  };

  const handleStyleChange = (variant: string) => {
    if (generatedConfig) {
      setGeneratedConfig({ ...generatedConfig, variant });
    }
  };

  const getChartIcon = (type: string) => {
    const iconClass = "w-5 h-5 mb-1";
    switch (type) {
      case 'bar': return <BarChart3 className={`${iconClass} text-blue-500`} />;
      case 'line': return <LineChart className={`${iconClass} text-emerald-500`} />;
      case 'pie': return <PieChart className={`${iconClass} text-purple-500`} />;
      case 'area': return <AreaChart className={`${iconClass} text-indigo-500`} />;
      case 'radar': return <Radar className={`${iconClass} text-pink-500`} />;
      case 'scatter': return <ScatterChart className={`${iconClass} text-amber-500`} />;
      case 'map': return <MapIcon className={`${iconClass} text-cyan-500`} />;
      case 'funnel': return <Filter className={`${iconClass} text-orange-500`} />;
      case 'gauge': return <Gauge className={`${iconClass} text-teal-500`} />;
      case 'boxplot': return <BoxSelect className={`${iconClass} text-violet-500`} />;
      default: return <LayoutGrid className={`${iconClass} text-slate-500`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <LayoutTemplate className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-semibold text-lg leading-tight">配置图表组件</h2>
              <p className="text-xs text-slate-400 mt-0.5">选择数据并描述需求，AI 将为您生成图表</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Controls */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col overflow-y-auto">
             <div className="space-y-6">
                
                {/* 1. Dataset Selection */}
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span>
                     选择数据集
                   </label>
                   {datasets.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                         暂无可用数据集，请先在“数据集管理”中创建。
                      </div>
                   ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                           <Database className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                           <select 
                             value={selectedDatasetId}
                             onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : '')}
                             className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                           >
                             <option value="">-- 请选择 --</option>
                             {datasets.map(ds => (
                               <option key={ds.id} value={ds.id}>{ds.name}</option>
                             ))}
                           </select>
                        </div>
                        <button
                          onClick={() => setIsPreviewOpen(true)}
                          disabled={!selectedDatasetId}
                          className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
                          title="查看数据集内容"
                        >
                           <Eye className="w-4 h-4" />
                        </button>
                      </div>
                   )}
                </div>

                {/* 2. Filter Column Selection */}
                {selectedDataset && selectedDataset.previewData && (
                  <div className="animate-in slide-in-from-top-2">
                     <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                       <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span>
                       添加筛选字段 (可选)
                     </label>
                     <div className="bg-white border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {selectedDataset.previewData.columns.length === 0 ? (
                           <div className="text-xs text-slate-400 text-center py-2">无字段可用</div>
                        ) : (
                           <div className="grid grid-cols-2 gap-2">
                              {selectedDataset.previewData.columns.map(col => {
                                 const isSelected = selectedFilterColumns.includes(col.name);
                                 return (
                                    <button
                                       key={col.name}
                                       onClick={() => toggleFilterColumn(col.name)}
                                       className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors border ${
                                          isSelected 
                                             ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                             : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                                       }`}
                                    >
                                       {isSelected ? <CheckSquare className="w-3 h-3 shrink-0" /> : <Square className="w-3 h-3 shrink-0" />}
                                       <span className="truncate" title={col.name}>{col.name}</span>
                                    </button>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                     <p className="text-[10px] text-slate-400 mt-1">
                        选中的字段将作为下拉筛选框显示在图表上方，用于数据过滤。
                     </p>
                  </div>
                )}

                {/* 3. Chart Type Selection (Optional) */}
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span>
                     图表类型 (可选)
                   </label>
                   <div className="grid grid-cols-4 gap-2 pr-1">
                      <button
                        onClick={() => setSelectedChartType('')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-colors shrink-0 h-20 ${
                          selectedChartType === '' 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        title="由 AI 自动决定"
                      >
                        <LayoutGrid className="w-5 h-5 mb-1" />
                        <span className="truncate w-full text-center mt-1 scale-90">自动</span>
                      </button>
                      {CHART_TYPES_METADATA.map((type) => (
                        <div key={type.type} className="relative group">
                          <button
                            onClick={() => setSelectedChartType(type.type)}
                            className={`w-full flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all shrink-0 h-20 ${
                              selectedChartType === type.type 
                                ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                            title={type.description}
                          >
                            {getChartIcon(type.type)}
                            <span className={`truncate w-full text-center mt-1 scale-90 ${selectedChartType === type.type ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}>{type.label}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInfoType(type);
                              setInfoModalOpen(true);
                            }}
                            className="absolute top-1 right-1 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="查看详情"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                   </div>
                </div>

                {/* 4. Auto Update Config */}
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">4</span>
                     数据自动更新 (可选)
                   </label>
                   <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                         <input 
                           type="checkbox" 
                           id="autoUpdate"
                           checked={autoUpdateEnabled}
                           onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                           className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                         />
                         <label htmlFor="autoUpdate" className="text-sm text-slate-700 select-none cursor-pointer">启用自动更新</label>
                      </div>
                      
                      {autoUpdateEnabled && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                           <div className="h-4 w-px bg-slate-200 mx-1" />
                           <Clock className="w-4 h-4 text-slate-400" />
                           <select 
                             value={autoUpdateInterval} 
                             onChange={(e) => setAutoUpdateInterval(Number(e.target.value))}
                             className="text-sm border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-indigo-500"
                           >
                              <option value={10}>10 秒</option>
                              <option value={30}>30 秒</option>
                              <option value={60}>1 分钟</option>
                              <option value={300}>5 分钟</option>
                           </select>
                        </div>
                      )}
                   </div>
                </div>

                {/* 5. Requirement Input */}
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">5</span>
                     展示需求 (AI)
                   </label>
                   <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea 
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder={`例如：展示各部门的销售总额...\n(留空则根据数据自动生成)`}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-sm"
                      />
                   </div>
                </div>

                {/* Generate Button */}
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedDatasetId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {generatedConfig ? '重新生成' : '生成预览'}
                </button>

                {error && (
                   <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                   </div>
                )}
                
                {explanation && (
                  <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs leading-relaxed">
                     <strong>AI 分析:</strong> {explanation}
                  </div>
                )}
             </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 bg-slate-100/50 p-6 overflow-hidden flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                   效果预览
                   {generatedConfig && (
                     <ChartStyleSelector 
                        type={generatedConfig.type}
                        value={generatedConfig.variant}
                        onChange={handleStyleChange}
                     />
                   )}
                </h3>
                {selectedDataset && (
                   <span className="text-xs text-slate-500">数据源: {selectedDataset.name}</span>
                )}
             </div>
             
             <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                {generatedConfig && selectedDataset?.previewData ? (
                   <div className="w-full h-full p-4 flex flex-col">
                      {/* Preview Filters */}
                      {generatedConfig.filters && generatedConfig.filters.length > 0 && (
                         <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <Filter className="w-4 h-4 text-slate-400 ml-1" />
                            <div className="text-xs text-slate-500 font-medium mr-2">筛选预览:</div>
                            {generatedConfig.filters.map(f => (
                               <select key={f.column} disabled className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-400 cursor-not-allowed">
                                  <option>{f.column} (全部)</option>
                               </select>
                            ))}
                         </div>
                      )}
                      <div className="flex-1 min-h-0">
                         <ChartRenderer config={generatedConfig} data={generatedConfig.rawData || realData || selectedDataset.previewData.rows} />
                      </div>
                   </div>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
                          <p>AI 正在分析数据并生成图表...</p>
                        </>
                      ) : (
                        <>
                          <LayoutTemplate className="w-12 h-12 mb-4 opacity-20" />
                          <p>请在左侧配置并点击生成</p>
                        </>
                      )}
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button 
            onClick={handleAdd}
            disabled={!generatedConfig}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            添加到大屏
          </button>
        </div>
      </div>
      
      {/* Dataset Preview Modal */}
      <TablePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        table={selectedDataset?.previewData || null}
        sql={selectedDataset?.sql}
      />

      {/* Chart Type Info Modal */}
      <ChartTypeInfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        chartTypeInfo={activeInfoType}
      />
    </div>
  );
};
