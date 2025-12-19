
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Sparkles, Code, Play, Loader2, AlertCircle, Image as ImageIcon, Monitor, Maximize2, Minimize2, Database, Eye, LayoutTemplate, CreditCard, Table as TableIcon, Type, Box, Wand2, PlusCircle, FileText, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { WebComponentTemplate, Dataset } from '../types';
import { apiService } from '../services/api';
import { WebComponentRenderer } from './WebComponentRenderer';
import { TablePreviewModal } from './TablePreviewModal';
import { BASIC_WEB_COMPONENTS } from '../constants';

interface WebComponentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (component: WebComponentTemplate) => void;
  onAddToDashboard?: (component: WebComponentTemplate, datasetId?: number | string) => void; // New Prop
  initialComponent?: WebComponentTemplate | null;
  datasets: Dataset[]; 
}

export const WebComponentBuilderModal: React.FC<WebComponentBuilderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  onAddToDashboard,
  initialComponent,
  datasets = [] 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>(''); 
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>(-1); 
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
      name: string, 
      description: string, 
      code: string
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'example'>('preview');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  // Compute mapped data for preview
  const mappedData = useMemo(() => {
    if (!selectedDataset?.previewData) return undefined;

    // If no mapping is active or in Auto mode, return original data
    if (Object.keys(fieldMapping).length === 0 || selectedTemplateId === '__AUTO__') {
      return selectedDataset.previewData;
    }

    // Apply mapping to rows
    // We create a new array of rows where keys are transformed based on mapping
    const originalRows = selectedDataset.previewData.rows || [];
    const mappedRows = originalRows.map((row: any) => {
      const newRow: any = { ...row }; // Keep original fields for safety
      
      Object.entries(fieldMapping).forEach(([targetField, sourceCol]) => {
        const colKey = sourceCol as string;
        
        // Handle Fixed/Constant values
        if (colKey && colKey.startsWith('__CONST__:')) {
             newRow[targetField] = colKey.replace('__CONST__:', '');
        } 
        // If a mapping exists for this target field, copy the value from source column
        else if (colKey && row[colKey] !== undefined) {
          newRow[targetField] = row[colKey];
        }
      });
      return newRow;
    });

    return {
      ...selectedDataset.previewData,
      rows: mappedRows
    };
  }, [selectedDataset, fieldMapping, selectedTemplateId]);

  // Auto-map fields when template or dataset changes
  useEffect(() => {
    if (selectedTemplateId === '__AUTO__' || !selectedDatasetId) {
      setFieldMapping({});
      return;
    }

    const template = BASIC_WEB_COMPONENTS.find(t => t.id === selectedTemplateId);
    const dataset = datasets.find(d => d.id === selectedDatasetId);

    // Only map if template has structured headers and dataset has columns
    if (template?.structuredExample?.table?.headers && dataset?.previewData?.columns) {
      const requiredFields = template.structuredExample.table.headers;
      const availableColumns = dataset.previewData.columns;
      const newMapping: Record<string, string> = {};

      requiredFields.forEach(reqField => {
        // Special handling for 'type' field -> default to constant info
        if (reqField === 'type') {
           newMapping[reqField] = '__CONST__:info';
           return;
        }

        // Simple case-insensitive auto-match
        const match = availableColumns.find(col => 
          col.name.toLowerCase() === reqField.toLowerCase() ||
          col.alias?.toLowerCase() === reqField.toLowerCase()
        );
        if (match) {
          newMapping[reqField] = match.name;
        } else {
          newMapping[reqField] = '';
        }
      });
      setFieldMapping(newMapping);
    } else {
      setFieldMapping({});
    }
  }, [selectedTemplateId, selectedDatasetId, datasets]);

  useEffect(() => {
    if (isOpen) {
      if (initialComponent) {
        setGeneratedResult({
          name: initialComponent.name,
          description: initialComponent.description,
          code: initialComponent.code
        });
        setName(initialComponent.name);
        setDescription(initialComponent.description);
        setSelectedTemplateId(''); 
      } else {
        setGeneratedResult(null);
        setName('');
        setDescription('');
        setSelectedImage(null);
        setSelectedDatasetId(''); 
        setSelectedTemplateId(-1); 
        setViewMode('preview');
        setError(null);
      }
      setIsMaximized(false); 
      setIsPreviewOpen(false);
    }
  }, [isOpen, initialComponent]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateSelect = (templateId: number | string) => {
    // If switching to Auto, check if we should preserve current input
    if (templateId === '__AUTO__') {
       const currentTemplate = BASIC_WEB_COMPONENTS.find(t => t.id === selectedTemplateId);
       
       // Only clear if the current values match the template's defaults
       // If user modified them (or if previous was Auto), keep them
       if (currentTemplate) {
           if (name === currentTemplate.name) setName('');
           if (description === currentTemplate.description) setDescription('');
       }
       // If no current template (was Auto or Empty), keep values as is.

       setGeneratedResult(null);
       setViewMode('preview');
       setError(null);
    } else {
       const template = BASIC_WEB_COMPONENTS.find(t => t.id === templateId);
       if (template) {
          setName(template.name);
          setDescription(template.description);
          setGeneratedResult({
             name: template.name,
             description: template.description,
             code: template.code
          });
          setViewMode('preview');
          setError(null);
       }
    }
    setSelectedTemplateId(templateId);
  };

  const handleGenerate = async () => {
    if (!description.trim() && !selectedImage) return;

    // Capture current code as template if available
    let templateCode: string | undefined = undefined;
    if (generatedResult?.code) {
        templateCode = generatedResult.code;
    } else if (selectedTemplateId !== '__AUTO__' && selectedTemplateId !== '') {
         const t = BASIC_WEB_COMPONENTS.find(t => t.id === selectedTemplateId);
         if (t) templateCode = t.code;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedResult(null);
    
    try {
      // Send full Data URL (including data:image/...;base64 prefix)
      const imageBase64 = selectedImage;
      const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
      
      const result = await apiService.aiGenerateWebComponent(
        description,
        imageBase64,
        selectedDataset?.previewData,
        templateCode,
        fieldMapping
      );
      
      setGeneratedResult(result);
      if (!name.trim()) {
        setName(result.name);
      }
      setViewMode('preview');
    } catch (e) {
      setError("AI 生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const createTemplateObject = (): WebComponentTemplate | null => {
    if (!generatedResult || !name.trim()) return null;
    return {
      id: initialComponent?.id || (Date.now() + Math.floor(Math.random() * 10000) + 40000),
      name: name,
      description: generatedResult.description,
      code: generatedResult.code,
      datasetId: selectedDatasetId || undefined,
      createdAt: initialComponent?.createdAt || Date.now()
    };
  };

  const handleSave = () => {
    const newTemplate = createTemplateObject();
    if (newTemplate && onSave) {
      onSave(newTemplate);
      onClose();
    }
  };

  const handleDirectAdd = () => {
    const newTemplate = createTemplateObject();
    if (newTemplate && onAddToDashboard) {
      onAddToDashboard(newTemplate, selectedDatasetId);
      onClose();
    }
  };

  const getTemplateIcon = (id: number | string) => {
    // Map negative IDs from BASIC_WEB_COMPONENTS to icons
    if (id === -1) return <CreditCard className="w-3 h-3" />;
    if (id === -2) return <Type className="w-3 h-3" />;
    if (id === -3) return <TableIcon className="w-3 h-3" />;
    
    const idStr = String(id);
    if (idStr.includes('card')) return <CreditCard className="w-3 h-3" />;
    if (idStr.includes('table')) return <TableIcon className="w-3 h-3" />;
    if (idStr.includes('image')) return <ImageIcon className="w-3 h-3" />;
    if (idStr.includes('text') || idStr.includes('info')) return <Type className="w-3 h-3" />;
    return <Box className="w-3 h-3" />;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm ${isMaximized ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          isMaximized 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-6xl max-h-[90vh] rounded-xl animate-in fade-in zoom-in-95'
        }`}>
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">AI 网页组件生成器</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsMaximized(!isMaximized)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
                title={isMaximized ? "退出全屏" : "全屏模式"}
            >
                {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
            >
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           {/* Left Sidebar: Controls */}
           <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col overflow-y-auto shrink-0">
              <div className="space-y-4">
                 
                 {/* Basic Templates Selection */}
                 {!initialComponent && (
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-purple-500" />
                        基础模板 (可选)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                         {BASIC_WEB_COMPONENTS.map(t => {
                            const isSelected = selectedTemplateId === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => handleTemplateSelect(t.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all text-left border ${
                                   isSelected
                                      ? 'bg-purple-50 border-purple-400 text-purple-700 ring-1 ring-purple-400'
                                      : 'bg-white border-slate-200 hover:border-purple-300 hover:text-purple-600 text-slate-600'
                                }`}
                              >
                                 {getTemplateIcon(t.id)}
                                 <span className="truncate">{t.name}</span>
                              </button>
                            );
                         })}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        选择“自动”从零开始，或点击模板基于预设代码修改。
                      </p>
                   </div>
                 )}

                 <div className="w-full h-px bg-slate-200 my-1" />

                 {/* Dataset Selection */}
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                     <Database className="w-4 h-4 text-blue-500" />
                     绑定数据集 (可选)
                   </label>
                   <div className="flex gap-2">
                       <select
                         value={selectedDatasetId}
                         onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : '')}
                         className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white min-w-0"
                       >
                         <option value="">-- 不绑定，使用生成数据 --</option>
                         {datasets.map(ds => (
                           <option key={ds.id} value={ds.id}>
                             {ds.name}
                           </option>
                         ))}
                       </select>
                       <button
                          onClick={() => setIsPreviewOpen(true)}
                          disabled={!selectedDatasetId}
                          className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors shrink-0"
                          title="查看数据集内容"
                        >
                           <Eye className="w-4 h-4" />
                        </button>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-1">
                     选择数据集后，AI 将读取其结构并生成包含真实数据的组件。
                   </p>
                 </div>

                 {/* Field Mapping Section */}
                 {selectedDatasetId && selectedTemplateId !== '__AUTO__' && Object.keys(fieldMapping).length > 0 && (
                   <>
                     <div className="w-full h-px bg-slate-200 my-1" />
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                         <LinkIcon className="w-4 h-4 text-orange-500" />
                         字段映射
                       </label>
                       <div className="space-y-2">
                         {Object.keys(fieldMapping).map(reqField => (
                           <div key={reqField} className="flex items-center justify-between text-sm">
                             <div className="flex flex-col">
                                <span className="text-slate-600 font-medium text-xs">{reqField}</span>
                                <span className="text-[10px] text-slate-400">组件字段</span>
                             </div>
                             <ArrowRight className="w-3 h-3 text-slate-300 mx-2" />
                             {reqField === 'type' ? (
                               <select
                                 value={fieldMapping[reqField]}
                                 onChange={(e) => setFieldMapping(prev => ({ ...prev, [reqField]: e.target.value }))}
                                 className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-purple-500 outline-none bg-white min-w-0"
                               >
                                  <option value="__CONST__:info">Info (提示)</option>
                                  <option value="__CONST__:success">Success (成功)</option>
                                  <option value="__CONST__:warning">Warning (警告)</option>
                                  <option value="__CONST__:error">Error (错误)</option>
                               </select>
                             ) : (
                               <select
                                 value={fieldMapping[reqField]}
                                 onChange={(e) => setFieldMapping(prev => ({ ...prev, [reqField]: e.target.value }))}
                                 className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-purple-500 outline-none bg-white min-w-0"
                               >
                                 <option value="">-- 选择字段 --</option>
                                 {datasets.find(d => d.id === selectedDatasetId)?.previewData?.columns.map(col => (
                                   <option key={col.name} value={col.name}>{col.alias || col.name}</option>
                                 ))}
                               </select>
                             )}
                           </div>
                         ))}
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2">
                         将数据集的字段映射到组件所需的字段。
                       </p>
                     </div>
                   </>
                 )}




                 
                 {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                    </div>
                 )}
              </div>
           </div>

           {/* Right Area: Preview/Code */}
           <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50">
              {generatedResult ? (
                 <>
                   <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                         {generatedResult.name}
                      </h3>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                         <button 
                           onClick={() => setViewMode('preview')}
                           className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'preview' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           <Monitor className="w-3 h-3 inline-block mr-1" /> 预览
                         </button>
                         <button 
                           onClick={() => setViewMode('code')}
                           className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'code' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           <Code className="w-3 h-3 inline-block mr-1" /> 代码
                         </button>
                         {BASIC_WEB_COMPONENTS.find(t => t.id === selectedTemplateId)?.dataExample && (
                           <button 
                             onClick={() => setViewMode('example')}
                             className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'example' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                           >
                             <FileText className="w-3 h-3 inline-block mr-1" /> 示例
                           </button>
                         )}
                      </div>
                   </div>

                   <div className="flex-1 overflow-auto p-8 relative">
                      {viewMode === 'preview' ? (
                         <div className="w-full h-full flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-lg p-6" ref={previewRef}>
                            <WebComponentRenderer code={generatedResult.code} data={mappedData} />
                         </div>
                      ) : viewMode === 'code' ? (
                         <div className="w-full h-full bg-slate-900 rounded-lg p-4 overflow-auto">
                            <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap">{generatedResult.code}</pre>
                         </div>
                      ) : (
                         <div className="w-full h-full bg-slate-50 rounded-lg p-6 overflow-auto border border-slate-200">
                            <div className="max-w-3xl mx-auto">
                               <div className="flex items-center gap-2 mb-4">
                                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                     <FileText className="w-5 h-5" />
                                  </div>
                                  <div>
                                     <h4 className="font-semibold text-slate-800">数据结构示例</h4>
                                     <p className="text-xs text-slate-500">此组件期望的数据格式如下</p>
                                  </div>
                               </div>
                               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  {(() => {
                                     const template = BASIC_WEB_COMPONENTS.find(t => t.id === selectedTemplateId);
                                     if (template?.structuredExample) {
                                        return (
                                           <div className="flex flex-col gap-6">
                                              {template.structuredExample.table && (
                                                 <div>
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">表格结构 (Table)</h5>
                                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                                       <table className="w-full text-sm text-left">
                                                          <thead className="bg-slate-50 text-slate-700 font-semibold">
                                                             <tr>
                                                                {template.structuredExample.table.headers.map((h, i) => (
                                                                   <th key={i} className="px-4 py-2 border-b border-slate-200">{h}</th>
                                                                ))}
                                                             </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-100">
                                                             {template.structuredExample.table.rows.map((row, i) => (
                                                                <tr key={i} className="hover:bg-slate-50">
                                                                   {row.map((cell, j) => (
                                                                      <td key={j} className="px-4 py-2 text-slate-600">{cell}</td>
                                                                   ))}
                                                                </tr>
                                                             ))}
                                                          </tbody>
                                                       </table>
                                                    </div>
                                                 </div>
                                              )}

                                              {template.structuredExample.json && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">JSON 数据</h5>
                                                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 overflow-auto">
                                                      <pre>{JSON.stringify(template.structuredExample.json, null, 2)}</pre>
                                                   </div>
                                                </div>
                                             )}

                                             {template.structuredExample.sql && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SQL 示例</h5>
                                                   <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-auto">
                                                      <pre>{template.structuredExample.sql}</pre>
                                                   </div>
                                                </div>
                                             )}

                                             {template.structuredExample.description && (
                                                 <div className="text-xs text-slate-500 bg-blue-50 text-blue-700 p-3 rounded-lg whitespace-pre-wrap">
                                                    {template.structuredExample.description}
                                                 </div>
                                              )}
                                           </div>
                                        );
                                     }
                                     return <pre className="text-sm font-mono text-slate-600 whitespace-pre-wrap">{template?.dataExample}</pre>;
                                  })()}
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                   
                   <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                      {onSave && (
                        <button 
                          onClick={handleSave}
                          disabled={!name.trim() || isGenerating || isSaving}
                          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {/* Re-using PlusCircle as placeholder icon if Save is missing, or just text */}
                           {isSaving ? '保存中...' : '保存'}
                        </button>
                      )}

                      {onAddToDashboard && (
                        <button 
                          onClick={handleDirectAdd}
                          disabled={!name.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusCircle className="w-4 h-4" />
                          添加到大屏
                        </button>
                      )}
                   </div>
                 </>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p>在左侧选择模板或输入描述，开始构建组件</p>
                 </div>
              )}
           </div>
        </div>
      </div>
      
      {/* Dataset Preview Modal */}
      <TablePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        table={selectedDataset?.previewData || null}
        sql={selectedDataset?.sql}
      />
    </div>
  );
};
