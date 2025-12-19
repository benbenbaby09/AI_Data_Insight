
import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Code, Play, Loader2, AlertCircle, Image as ImageIcon, Monitor, Maximize2, Minimize2, Database, Eye, LayoutTemplate, CreditCard, Table as TableIcon, Type, Box, Wand2, PlusCircle } from 'lucide-react';
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>('__AUTO__'); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
      name: string, 
      description: string, 
      code: string
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setSelectedTemplateId('__AUTO__'); 
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
    setSelectedTemplateId(templateId);
    
    if (templateId === '__AUTO__') {
       setName('');
       setDescription('');
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
      const imageBase64 = selectedImage ? selectedImage.split(',')[1] : undefined;
      const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
      
      const result = await apiService.aiGenerateWebComponent(
        description,
        imageBase64,
        selectedDataset?.previewData,
        templateCode
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

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

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
                         <button
                            onClick={() => handleTemplateSelect('__AUTO__')}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all text-left border ${
                               selectedTemplateId === '__AUTO__'
                                  ? 'bg-purple-50 border-purple-400 text-purple-700 ring-1 ring-purple-400'
                                  : 'bg-white border-slate-200 hover:border-purple-300 hover:text-purple-600 text-slate-600'
                            }`}
                         >
                            <Wand2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">自动 (AI 生成)</span>
                         </button>

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

                 <div className="w-full h-px bg-slate-200 my-1" />

                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">组件名称</label>
                   <input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                     placeholder="例如: UserCard"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">需求描述 (AI)</label>
                   <textarea 
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm"
                     placeholder="例如：创建一个用户资料卡片，包含头像、姓名、职位和一组社交链接按钮..."
                   />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">参考图片 (可选)</label>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="flex-1 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                       >
                         <ImageIcon className="w-4 h-4" />
                         {selectedImage ? '更换' : '上传'}
                       </button>
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept="image/*"
                         onChange={handleImageSelect}
                       />
                       {selectedImage && (
                         <div className="relative w-10 h-10 rounded border border-slate-200 overflow-hidden shrink-0">
                            <img src={selectedImage} alt="ref" className="w-full h-full object-cover" />
                         </div>
                       )}
                    </div>
                 </div>

                 <button 
                   onClick={handleGenerate}
                   disabled={isGenerating || (!description.trim() && !selectedImage)}
                   className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                 >
                   {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                   {initialComponent ? '重新生成' : '开始生成'}
                 </button>
                 
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
                      </div>
                   </div>

                   <div className="flex-1 overflow-auto p-8 relative">
                      {viewMode === 'preview' ? (
                         <div className="w-full h-full flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-lg p-6" ref={previewRef}>
                            <WebComponentRenderer code={generatedResult.code} data={selectedDataset?.previewData} />
                         </div>
                      ) : (
                         <div className="w-full h-full bg-slate-900 rounded-lg p-4 overflow-auto">
                            <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap">{generatedResult.code}</pre>
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
