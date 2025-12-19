
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  Sparkles, 
  User, 
  Image as ImageIcon, 
  X, 
  Layers, 
  PlusCircle, 
  CheckCircle2, 
  MessageSquarePlus, 
  PanelRightClose,
} from 'lucide-react';
import { TableData, ChatMessage, ChartConfig, WebComponentTemplate } from '../types';
import { apiService } from '../services/api';
import { ChartRenderer } from './ChartRenderer';
import { WebComponentRenderer } from './WebComponentRenderer';

interface AIAssistantProps {
  activeTables: TableData[];
  onAddToDashboard: (config: ChartConfig, tableName: string) => void;
  onCollapse: () => void;
  webComponents: WebComponentTemplate[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ activeTables, onAddToDashboard, onCollapse, webComponents }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Feedback state for "Added!" animation
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // If active tables change significantly, we might want to notify or reset, but for now we just keep history.

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
          e.preventDefault(); // Prevent pasting binary data into text input
        }
        break; // Only take the first image
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setSelectedImage(null);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input || (selectedImage ? '分析这张图片' : ''),
      timestamp: Date.now(),
      image: selectedImage || undefined // Store image in message history
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const imageBase64 = currentImage ? currentImage.split(',')[1] : undefined;
      
      const result = await apiService.aiGenerateDataInsight({ tables: activeTables, userQuery: currentInput, referenceContext: undefined });
      
      const botMsg: ChatMessage = {
        role: 'model',
        content: result.explanation,
        chartConfig: result.chartConfig,
        webComponent: result.webComponent,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
      
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "抱歉，处理您的请求时遇到了问题。",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleManualAdd = (config: ChartConfig, tableName: string, msgIndex: number) => {
    onAddToDashboard(config, tableName);
    setJustAddedId(`${msgIndex}`);
    setTimeout(() => setJustAddedId(null), 2000);
  };

  // Helper to find table data for preview
  const getTableForConfig = (config: ChartConfig) => {
    return activeTables.find(t => t.name === config.tableName);
  };

  return (
    <div className="flex flex-col h-full bg-white w-full relative">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col">
                <h2 className="font-semibold text-slate-700 leading-none">AI 分析师</h2>
                <span className="text-[10px] text-slate-500 mt-1">
                   {activeTables.length > 0 ? `已连接 ${activeTables.length} 个数据源` : '准备就绪'}
                </span>
            </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleNewChat}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            title="开始新会话"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button 
            onClick={onCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="收起侧边栏"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Bot className="w-12 h-12 text-indigo-200 mb-4" />
              <p className="text-slate-500 text-sm mb-2">我是您的智能数据助手。</p>
              <p className="text-slate-400 text-xs max-w-[200px]">您可以询问任何问题，或上传图片进行分析。{activeTables.length > 0 ? '我也可以帮助您分析当前的数据集。' : ''}</p>
           </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-start gap-2 max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Render User Uploaded Image */}
                {msg.image && (
                   <div className="mb-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <img 
                        src={msg.image} 
                        alt="User upload" 
                        className="max-h-40 max-w-full rounded object-contain" 
                      />
                   </div>
                )}

                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>

            {/* Render Web Component Preview in Chat */}
            {msg.webComponent && (
               <div className="mt-3 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 h-96 relative group transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-2">
                   <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 border-b border-slate-100 flex items-center px-3 z-10">
                       <span className="text-xs font-semibold text-slate-500">AI Generated Component: {msg.webComponent.name}</span>
                   </div>
                   <div className="pt-8 w-full h-full">
                      <WebComponentRenderer code={msg.webComponent.code} />
                   </div>
               </div>
            )}

            {/* Render Chart Preview in Chat */}
            {msg.chartConfig && msg.chartConfig.tableName && (() => {
               const table = getTableForConfig(msg.chartConfig);
               return table ? (
                 <div className="mt-3 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative group transition-shadow hover:shadow-md">
                   <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-50 bg-slate-50/50">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium truncate flex-1">数据源: {table.name}</span>
                   </div>
                   <div className="h-60 w-full p-2">
                      <ChartRenderer config={msg.chartConfig} data={table.rows} />
                   </div>
                   
                   {/* Add Button Overlay */}
                   <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <button 
                        onClick={() => msg.chartConfig?.tableName && handleManualAdd(msg.chartConfig, msg.chartConfig.tableName, idx)}
                        className="bg-white text-blue-600 px-4 py-2 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-50 transform transition-transform hover:scale-105 active:scale-95"
                      >
                        {justAddedId === `${idx}` ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            已添加
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            添加到仪表盘
                          </>
                        )}
                      </button>
                   </div>
                 </div>
               ) : null;
            })()}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-sm ml-10">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        
        {/* Context Tags Container */}
        {selectedImage && (
          <div className="flex items-center gap-2 mb-2 min-h-[24px]">
            <div className="relative inline-flex animate-in fade-in zoom-in-95 group">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700 font-medium">
                 <ImageIcon className="w-3 h-3" />
                 图片已就绪
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-slate-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="relative flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl transition-colors ${selectedImage ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            title="上传图片 (或直接粘贴)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            className="flex-1 pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
            placeholder={selectedImage ? "描述您想从这张图中获取什么..." : "输入问题..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onPaste={handlePaste}
            disabled={isTyping}
          />
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isTyping}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
