
import React, { useState, useRef } from 'react';
import { X, Sparkles, LayoutTemplate, Play, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { ChartTemplate, CustomChartSpec, ChartConfig, TableData } from '../types';
import { apiService } from '../services/api';
import { ChartRenderer } from './ChartRenderer';
import { ChartStyleSelector } from './ChartStyleSelector';
import { PREVIEW_DATA } from '../constants';

interface ChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (template: ChartTemplate) => void;
  initialTemplate?: ChartTemplate;
}

export const ChartBuilderModal: React.FC<ChartBuilderModalProps> = ({ isOpen, onClose, onSave, initialTemplate }) => {
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<{
      name: string, 
      description: string, 
      type: ChartConfig['type'], 
      customSpec?: CustomChartSpec,
      chartParams?: ChartConfig['chartParams']
  } | null>(null);
  const [previewVariant, setPreviewVariant] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
      if (isOpen) {
          if (initialTemplate) {
              setDescription(initialTemplate.description);
              setGeneratedTemplate({
                  name: initialTemplate.name,
                  description: initialTemplate.description,
                  type: initialTemplate.type,
                  customSpec: initialTemplate.customSpec,
                  chartParams: initialTemplate.chartParams
              });
          } else {
              setDescription('');
              setSelectedImage(null);
              setGeneratedTemplate(null);
              setPreviewVariant(undefined);
              setError(null);
          }
      }
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

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

  const handleGenerate = async () => {
    if (!description.trim() && !selectedImage) return;
    setIsGenerating(true);
    setError(null);
    setPreviewVariant(undefined);
    try {
      const imageBase64 = selectedImage ? selectedImage.split(',')[1] : undefined;
      const result = await apiService.aiGenerateChartTemplate(description, imageBase64);
      setGeneratedTemplate(result);
    } catch (e) {
      setError("AI 生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedTemplate || !onSave) return;
    const newTemplate: ChartTemplate = {
      id: initialTemplate?.id || Date.now() + Math.floor(Math.random() * 10000) + 50000,
      name: generatedTemplate.name,
      description: generatedTemplate.description,
      isCustom: true,
      type: generatedTemplate.type,
      icon: generatedTemplate.type === 'custom' ? 'Component' : 
            generatedTemplate.type === 'bar' ? 'BarChart3' :
            generatedTemplate.type === 'line' ? 'LineChart' :
            generatedTemplate.type === 'pie' ? 'PieChart' :
            generatedTemplate.type === 'area' ? 'AreaChart' :
            generatedTemplate.type === 'radar' ? 'Radar' : 
            generatedTemplate.type === 'map' ? 'Map' : 'ScatterChart',
      customSpec: generatedTemplate.customSpec,
      chartParams: generatedTemplate.chartParams
    };
    onSave(newTemplate);
    onClose();
  };

  // Construct preview config
  const previewConfig: ChartConfig | null = generatedTemplate ? {
    type: generatedTemplate.type,
    title: generatedTemplate.name,
    description: "Preview Mode",
    xAxisKey: 'category',
    dataKeys: ['value1', 'value2', 'value3'],
    tableName: 'Preview',
    customSpec: generatedTemplate.customSpec,
    chartParams: generatedTemplate.chartParams,
    variant: previewVariant
  } : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <LayoutTemplate className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">AI 自定义组件构建器</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!generatedTemplate ? (
            <div className="space-y-4">
               <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Sparkles className="w-8 h-8 text-purple-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-800">描述或上传参考图</h3>
                 <p className="text-slate-500 text-sm">
                   描述您想要的图表样式，或上传一张截图让 AI 模仿。
                 </p>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                 <textarea 
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                   placeholder="例如：创建一个带有双轴的混合图表，左轴显示销售额(柱状)，右轴显示增长率(折线)..."
                 />
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">参考图片 (可选)</label>
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                     >
                       <ImageIcon className="w-4 h-4" />
                       {selectedImage ? '更换图片' : '上传图片'}
                     </button>
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       accept="image/*"
                       onChange={handleImageSelect}
                     />
                     {selectedImage && (
                       <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                         <Sparkles className="w-3 h-3" /> 图片已就绪
                       </span>
                     )}
                  </div>
               </div>
               
               {error && (
                 <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                   <AlertCircle className="w-4 h-4" />
                   {error}
                 </div>
               )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex-1 min-h-[300px] flex flex-col">
                  <div className="flex justify-end mb-2">
                     <ChartStyleSelector 
                        type={generatedTemplate.type} 
                        value={previewVariant} 
                        onChange={setPreviewVariant} 
                     />
                  </div>
                  <div className="flex-1 min-h-0">
                    {previewConfig && <ChartRenderer config={previewConfig} data={PREVIEW_DATA.rows} />}
                  </div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <h4 className="text-sm font-bold text-slate-700 mb-1">{generatedTemplate.name}</h4>
                 <p className="text-xs text-slate-500">{generatedTemplate.description}</p>
                 <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                    Type: {generatedTemplate.type}
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          {!generatedTemplate ? (
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || (!description && !selectedImage)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              开始生成
            </button>
          ) : (
            onSave && (
              <button 
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-purple-600/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
