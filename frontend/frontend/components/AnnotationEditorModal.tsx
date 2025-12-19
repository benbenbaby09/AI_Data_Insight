import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check,
  Tag, 
  Save, 
  ChevronDown, 
  ChevronRight, 
  FileJson, 
  Info, 
  CheckSquare, 
  Square, 
  Table2, 
  Search,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Maximize2,
  Minimize2,
  Eye,
  Sparkles,
  Loader2,
  StopCircle,
  Download,
  Upload
} from 'lucide-react';
import { DataSource, TableData, Column } from '../types';
// duplicate import removed
import { TablePreviewModal } from './TablePreviewModal';
import { apiService } from '../services/api';

interface AnnotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource | null;
  onSave: (id: number, description: string, tables: TableData[]) => void;
}

const SOURCE_PAGE_SIZE = 20;

export const AnnotationEditorModal: React.FC<AnnotationEditorModalProps> = ({ 
  isOpen, 
  onClose, 
  dataSource, 
  onSave 
}) => {
  const [dsDescription, setDsDescription] = useState('');
  const [tables, setTables] = useState<TableData[]>([]); // Imported tables
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});
  const [generatingTables, setGeneratingTables] = useState<Record<number, boolean>>({});
  const [stopGeneration, setStopGeneration] = useState<Record<number, boolean>>({}); // Flag to signal stop
  const [aiProgress, setAiProgress] = useState<Record<number, { current: number, total: number }>>({});
  const [sourceTables, setSourceTables] = useState<TableData[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  
  // Preview State
  const [previewTable, setPreviewTable] = useState<TableData | null>(null);
  
  // Left Side State (Source Selection)
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [sourcePage, setSourcePage] = useState(1);

  // Right Side State (Annotation Editor)
  const [annotationSearchTerm, setAnnotationSearchTerm] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  // Ref to track stop requests for running tasks (Moved from below to avoid conditional hook call error)
  const stopGenerationRef = React.useRef<Record<number, boolean>>({});

  useEffect(() => {
    if (dataSource) {
      setDsDescription(dataSource.description || '');
      
      // Dedup tables by ID to prevent "duplicate key" React warning
      // This handles cases where bad data might have been saved
      const uniqueTables: TableData[] = Array.from(
        new Map<number, TableData>((dataSource.tables || []).map((t) => [t.id, t])).values()
      );
      setTables(JSON.parse(JSON.stringify(uniqueTables)));
      
      setSourceTables([]);
      
      // Auto expand first table if few tables, otherwise collapse all for performance
      if (uniqueTables.length > 0 && uniqueTables.length < 5) {
        setExpandedTables({ [uniqueTables[0].id]: true });
      }
      // Auto-load source tables using stored config
      (async () => {
        setLoadingSource(true);
        try {
          const payload: any = {
            type: dataSource.config.type,
            host: dataSource.config.host,
            port: dataSource.config.port,
            username: dataSource.config.username,
            password: (dataSource.config as any).password,
            serviceName: dataSource.config.serviceName,
            database: (dataSource.config as any).database
          };
          const result = await apiService.listTables(payload);
          if (result.success) {
            // Map source tables (which might be strings or objects with string IDs) to TableData
            // Assign temporary negative IDs to source tables to avoid collision with real IDs (positive integers)
            // and allow React to key them correctly.
            const mappedTables: TableData[] = result.tables.map((t: any, idx: number) => {
                 const name = typeof t === 'string' ? t : t.name;
                 // Use a negative ID based on index + timestamp to ensure uniqueness in this session
                 // This ID is only used for selection logic.
                 // When added to "tables" (imported), we'll give it a new ID if needed, 
                 // but ideally we want to track it.
                 // Actually, listTables returns {name: string, id: string} from backend currently (or used to).
                 // We should just use a negative number.
                 return {
                     id: -1 * (Date.now() + idx), 
                     name: name,
                     columns: [],
                     rows: [],
                     description: ''
                 };
            });
            setSourceTables(mappedTables);
          } else {
            alert(`加载失败：${result.message}`);
          }
        } catch (e: any) {
          alert(`请求失败：${e.message || 'Unknown error'}`);
        } finally {
          setLoadingSource(false);
        }
      })();
    }
  }, [dataSource, isOpen]);

  // Reset pagination when search changes
  useEffect(() => {
    setSourcePage(1);
  }, [sourceSearchTerm]);

  // --- Filter & Pagination Logic (Moved up before conditional return) ---

  // Left Side: Filter Source Tables
  const filteredSourceTables = useMemo(() => {
    const lowerTerm = sourceSearchTerm.toLowerCase();
    const base = !sourceSearchTerm 
      ? sourceTables 
      : sourceTables.filter(t => 
          t.name.toLowerCase().includes(lowerTerm) || 
          (t.description || '').toLowerCase().includes(lowerTerm)
        );
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceSearchTerm, sourceTables]);

  // Left Side: Paginate
  const paginatedSourceTables = useMemo(() => {
    const start = (sourcePage - 1) * SOURCE_PAGE_SIZE;
    return filteredSourceTables.slice(start, start + SOURCE_PAGE_SIZE);
  }, [filteredSourceTables, sourcePage]);

  const sourceTotalPages = Math.ceil(filteredSourceTables.length / SOURCE_PAGE_SIZE);

  // Right Side: Filter Imported Tables
  const filteredImportedTables = useMemo(() => {
    if (!annotationSearchTerm) return tables;
    const lowerTerm = annotationSearchTerm.toLowerCase();
    return tables.filter(t => 
      t.name.toLowerCase().includes(lowerTerm) || 
      t.description?.toLowerCase().includes(lowerTerm)
    );
  }, [tables, annotationSearchTerm]);

  // --- Early Return Check ---
  if (!isOpen || !dataSource) return null;

  // --- Logic for Selection (Import) ---

  const handleToggleImport = async (sourceTable: TableData) => {
    // If it exists, remove it
    const exists = tables.find(t => t.id === sourceTable.id || (t.name && sourceTable.name && t.name.toLowerCase() === sourceTable.name.toLowerCase()));
    if (exists) {
        const newTables = tables.filter(t => t.id !== exists.id);
        setTables(newTables);
        // Call backend to save immediately as requested
        onSave(dataSource.id, dsDescription, newTables);
        return;
    }

    // Adding new table
    let columns = sourceTable.columns || [];
    
    // If no columns (which is true for source list tables), fetch them
    if (columns.length === 0) {
        try {
            const payload = {
                type: dataSource.config.type,
                host: dataSource.config.host,
                port: dataSource.config.port,
                username: dataSource.config.username,
                password: (dataSource.config as any).password,
                serviceName: dataSource.config.serviceName,
                database: (dataSource.config as any).database,
                tableName: sourceTable.name
            };
            const res = await apiService.getTableSchema(payload);
            if (res.success) {
                columns = res.columns.map((c: any) => ({
                    name: c.name,
                    type: c.type,
                    description: '', // Init empty
                    alias: ''
                }));
            }
        } catch (e) {
            console.error("Failed to fetch schema for", sourceTable.name, e);
        }
    }

    const newTable: TableData = { 
        ...sourceTable, 
        // Always generate a unique ID for the stored table to prevent collisions 
        // For new tables, we can use a timestamp-based integer (safe for SQLite/Postgres as long as it fits in Int/BigInt)
        // Or we can use a negative ID to signal "new" to backend, but backend logic I wrote
        // handles existing checks by name/ID. 
        // Let's use a large positive integer (timestamp) to minimize collision with auto-increment.
        // Javascript Date.now() is ~13 digits, fits in BigInt. Python int handles it. SQLite handles up to 8 bytes (signed 64-bit).
        // Max safe integer in JS is 2^53 - 1. Date.now() is safe.
        id: Date.now() + Math.floor(Math.random() * 1000),
        columns: columns, 
        dataSourceId: dataSource.id 
    };
         
    setTables(prev => [...prev, newTable]);
  };

  const isImported = (table: TableData) => tables.some(t => t.name.toLowerCase() === table.name.toLowerCase());

  // --- Logic for Annotation ---

  const handleTableDescriptionChange = (tableId: number, desc: string) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, description: desc } : t
    ));
  };

  const handleColumnChange = (tableId: number, colName: string, field: 'description' | 'alias', value: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.map(c => 
            c.name === colName ? { ...c, [field]: value } : c
          )
        };
      }
      return t;
    }));
  };

  const toggleExpand = (tableId: number) => {
    setExpandedTables(prev => ({ ...prev, [tableId]: !prev[tableId] }));
  };

  const toggleAll = (expand: boolean) => {
    if (expand) {
      const allExpanded = filteredImportedTables.reduce((acc, t) => ({ ...acc, [t.id]: true }), {});
      setExpandedTables(prev => ({ ...prev, ...allExpanded }));
    } else {
      setExpandedTables({});
    }
  };

  const handleStopGeneration = (tableId: number) => {
    stopGenerationRef.current[tableId] = true;
    setStopGeneration(prev => ({ ...prev, [tableId]: true }));
  };

  const handleAutoFill = async (table: TableData) => {
    // Check if prompt is supported (e.g., in Trae Preview environment it might be blocked or restricted)
    let businessContext: string | null = null;
    
    // Try to use a custom prompt approach if native prompt fails or use a fallback
    // Since prompt() is synchronous and blocking, and some environments block it,
    // we should ideally use a modal. But for a quick fix, let's try-catch it and fallback
    // or just assume description if prompt fails.
    
    try {
        // Some environments (like VSCode webviews or custom renderers) might not implement prompt()
        // or throw an error when it's called.
        if (typeof window.prompt === 'function') {
             businessContext = window.prompt(
               "请输入该表的业务描述（例如：存储用户的基本注册信息）：", 
               table.description || ""
             );
        } else {
             console.warn("window.prompt is not supported in this environment.");
             // Fallback: Just use existing description without asking
             // Ideally we should show a custom modal, but that requires UI state changes.
             // Let's assume the user is okay with current description if prompt is unavailable.
             businessContext = table.description || "";
        }
    } catch (e) {
        console.warn("window.prompt failed:", e);
        businessContext = table.description || "";
    }
    
    // Update table description if user provided one (and it's not null, meaning not cancelled)
    if (businessContext !== null) {
      if (businessContext.trim() !== "") {
        handleTableDescriptionChange(table.id, businessContext);
      }
    } else {
      // User cancelled (only possible if prompt worked and returned null)
      return;
    }

    // Check if business description is empty
    if (!table.description && (!businessContext || businessContext.trim() === "")) {
      // If prompt was skipped or returned empty string, and table.description is also empty
      alert("请先填写表业务描述，以便 AI 能更准确地生成标注。");
      return;
    }

    const descriptionToUse = (businessContext || table.description || "").trim();

    // Double check just in case logic above missed something (e.g. prompt returned null which means cancel, handled above)
    if (!descriptionToUse) {
       alert("表业务描述不能为空。");
       return;
    }

    setGeneratingTables(prev => ({ ...prev, [table.id]: true }));
    setStopGeneration(prev => ({ ...prev, [table.id]: false })); // Reset stop flag
    stopGenerationRef.current[table.id] = false; // Reset ref

    try {
      const CHUNK_SIZE = 15;
      const cols = table.columns || [];
      const toAnnotate = cols.map(c => ({ name: c.name, type: c.type }));
      const chunks: { name: string, type: string }[][] = [];
      for (let i = 0; i < toAnnotate.length; i += CHUNK_SIZE) {
        chunks.push(toAnnotate.slice(i, i + CHUNK_SIZE));
      }
      
      setAiProgress(prev => ({ ...prev, [table.id]: { current: 0, total: chunks.length } }));

      const annotationsAll: { columnName: string, alias: string, description: string }[] = [];
      for (const chunk of chunks) {
         // Check for stop signal via ref
         if (stopGenerationRef.current[table.id]) {
             console.log("Generation stopped by user for table", table.id);
             break; // Exit loop
         }

        try {
          const part = await apiService.aiGenerateTableAnnotations(
            table.name,
            descriptionToUse, // Use the potentially updated description
            chunk
          );
          annotationsAll.push(...(part || []));
        } catch (e) {
          console.error("AI batch failed", e);
        }
        
        setAiProgress(prev => {
             const curr = prev[table.id] || { current: 0, total: chunks.length };
             return { ...prev, [table.id]: { ...curr, current: curr.current + 1 } };
        });
        
        await new Promise(r => setTimeout(r, 150)); // small gap to reduce backend pressure
      }

      // Merge results back (partial or full)
      setTables(prev => prev.map(t => {
        if (t.id === table.id) {
          const updatedColumns = t.columns.map(col => {
            const match = annotationsAll.find(a => a.columnName === col.name);
            if (match) {
              return {
                ...col,
                alias: col.alias || match.alias,
                description: col.description || match.description
              };
            }
            return col;
          });
          return { ...t, columns: updatedColumns };
        }
        return t;
      }));
    } catch (e) {
      console.error("AI Auto fill failed", e);
      alert("AI 自动填充失败，请重试。");
    } finally {
      setGeneratingTables(prev => ({ ...prev, [table.id]: false }));
      setAiProgress(prev => {
          const next = { ...prev };
          delete next[table.id];
          return next;
      });
      setStopGeneration(prev => {
          const next = { ...prev };
          delete next[table.id];
          return next;
      });
      stopGenerationRef.current[table.id] = false;
    }
  };

  const handleExportTable = (table: TableData) => {
    // Only export essential configuration
    const exportData = {
        name: table.name,
        description: table.description,
        columns: (table.columns || []).map(c => ({
            name: c.name,
            alias: c.alias,
            description: c.description
        }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}_annotation.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTable = (event: React.ChangeEvent<HTMLInputElement>, targetTableId: number) => {
     const file = event.target.files?.[0];
     if (!file) return;

     const reader = new FileReader();
     reader.onload = (e) => {
        try {
           const json = JSON.parse(e.target?.result as string);
           
           if (!json.columns || !Array.isArray(json.columns)) {
               alert("导入失败：文件格式不正确，缺少列定义");
               return;
           }

           setTables(prev => prev.map(t => {
               if (t.id === targetTableId) {
                   // Merge logic:
                   // Update table description
                   // Update columns aliases and descriptions
                   const newDescription = json.description || t.description;
                   
                   const newColumns = (t.columns || []).map(col => {
                       const importedCol = json.columns.find((c: any) => c.name === col.name);
                       if (importedCol) {
                           return {
                               ...col,
                               alias: importedCol.alias || col.alias,
                               description: importedCol.description || col.description
                           };
                       }
                       return col;
                   });
                   
                   return {
                       ...t,
                       description: newDescription,
                       columns: newColumns
                   };
               }
               return t;
           }));
           alert(`表 ${json.name || ''} 标注导入成功`);
        } catch (err) {
           console.error("Import failed", err);
           alert("导入失败：文件无法解析");
        }
     };
     reader.readAsText(file);
     // Reset input
     event.target.value = '';
  };

  const handleSave = () => {
    onSave(dataSource.id, dsDescription, tables);
    onClose();
  };

  // No manual load; auto-loaded above

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[90vw] h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Table2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">表与标注管理</h2>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                从源数据库选择表，并为 AI 提供业务元数据
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Split View */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Table Selector (Source) */}
          <div className="w-[350px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
             
             {/* Left Header & Search */}
            <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10">
               <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">数据库源表</h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    总计 {sourceTables.length}
                  </span>
               </div>
               {loadingSource && (
                 <div className="mb-3 text-xs text-slate-500">正在加载源表...</div>
               )}
               <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="搜索源表名..."
                    value={sourceSearchTerm}
                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
               </div>
            </div>
             
             {/* Left List (Paginated) */}
             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {paginatedSourceTables.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    未找到匹配的表
                  </div>
                ) : (
                  paginatedSourceTables.map((mockTable, idx) => {
                    const checked = isImported(mockTable);
                    return (
                      <div 
                        key={mockTable.id || idx}
                        onClick={() => handleToggleImport(mockTable)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border group relative ${
                          checked 
                            ? 'bg-indigo-50 border-indigo-200' 
                            : 'bg-white border-transparent hover:border-slate-300 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${checked ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                           {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                           <div className={`text-sm font-medium truncate ${checked ? 'text-indigo-900' : 'text-slate-700'}`} title={mockTable.name}>
                             {mockTable.name}
                           </div>
                           <div className="text-xs text-slate-500 truncate mt-0.5" title={(checked ? (tables.find(t => t.name && mockTable.name && t.name.toLowerCase() === mockTable.name.toLowerCase())?.description || '') : (mockTable.description || ''))}>
                             {checked 
                               ? (tables.find(t => t.name && mockTable.name && t.name.toLowerCase() === mockTable.name.toLowerCase())?.description || '无描述')
                               : (mockTable.description || '无描述')}
                           </div>
                        </div>
                        {/* Preview Button (Left) */}
                        <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setPreviewTable(mockTable);
                           }}
                           className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                           title="预览数据"
                        >
                           <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
             </div>

             {/* Left Pagination Controls */}
             <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  第 {sourcePage} / {sourceTotalPages || 1} 页
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setSourcePage(p => Math.max(1, p - 1))}
                    disabled={sourcePage === 1}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSourcePage(p => Math.min(sourceTotalPages, p + 1))}
                    disabled={sourcePage === sourceTotalPages || sourceTotalPages === 0}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
             </div>
          </div>

          {/* RIGHT: Annotation Editor */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
             
             {/* Global DS Description */}
             <div className="p-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">数据源整体业务描述</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      告诉 AI 这个数据库是做什么的，有助于 AI 理解跨表关系。
                    </div>
                  </div>
               </div>
               <input
                 type="text"
                 value={dsDescription}
                 onChange={(e) => setDsDescription(e.target.value)}
                 placeholder="例如：销售部门用于记录2024年全渠道订单的核心业务库"
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
               />
             </div>

             {/* Right List Toolbar */}
             <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    已导入表标注 
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {filteredImportedTables.length} / {tables.length}
                    </span>
                  </h3>
                  
                  {/* Bulk Actions */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleAll(true)}
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                      title="展开列表中的所有表"
                    >
                      <Maximize2 className="w-3 h-3" /> 展开
                    </button>
                    <button 
                      onClick={() => toggleAll(false)}
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                      title="折叠列表中的所有表"
                    >
                      <Minimize2 className="w-3 h-3" /> 折叠
                    </button>
                  </div>
                </div>

                {/* Right Search */}
                <div className="relative w-64">
                   <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                   <input 
                     type="text" 
                     placeholder="筛选已导入表..."
                     value={annotationSearchTerm}
                     onChange={(e) => setAnnotationSearchTerm(e.target.value)}
                     className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                   />
                </div>
             </div>

             {/* Tables Editor List */}
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {tables.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                    <Table2 className="w-12 h-12 mb-2 opacity-20" />
                    <p>请在左侧勾选需要导入的数据表</p>
                 </div>
               ) : filteredImportedTables.length === 0 ? (
                 <div className="text-center py-10 text-slate-400">
                    未找到匹配的已导入表
                 </div>
               ) : (
                 <div className="space-y-4">
                   {filteredImportedTables.map((table, idx) => {
                     const isExpanded = expandedTables[table.id];
                     const isGenerating = generatingTables[table.id];

                     return (
                       <div key={table.id || idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         {/* Table Header Row */}
                         <div className="flex items-start gap-3 p-4 bg-slate-50/30 hover:bg-slate-50 transition-colors border-b border-slate-100">
                            <button 
                               onClick={() => toggleExpand(table.id)}
                               className="mt-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="min-w-0">
                                 <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">表名</label>
                                 <div className="font-mono text-sm font-medium text-slate-800 truncate" title={table.name}>
                                   {table.name}
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">表业务描述</label>
                                 <input
                                   type="text"
                                   value={table.description || ''}
                                   onChange={(e) => handleTableDescriptionChange(table.id, e.target.value)}
                                   placeholder="例如：存储客户基础信息"
                                   className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
                                 />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                               {/* Export Button */}
                               <button
                                  onClick={() => handleExportTable(table)}
                                  className="text-slate-300 hover:text-indigo-500 p-1 rounded hover:bg-indigo-50 transition-colors"
                                  title="导出配置"
                               >
                                  <Download className="w-4 h-4" />
                               </button>

                               {/* Import Button */}
                               <label className="text-slate-300 hover:text-indigo-500 p-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer flex items-center justify-center" title="导入配置">
                                   <Upload className="w-4 h-4" />
                                   <input 
                                       type="file" 
                                       accept=".json" 
                                       className="hidden" 
                                       onChange={(e) => handleImportTable(e, table.id)} 
                                   />
                               </label>

                               {/* Preview Button (Right) */}
                               <button
                                  onClick={() => setPreviewTable(table)}
                                  className="text-slate-300 hover:text-blue-500 p-1 rounded hover:bg-blue-50 transition-colors"
                                  title="预览数据"
                               >
                                  <Eye className="w-4 h-4" />
                               </button>
                               {/* Remove Button for Imported Item */}
                               {confirmRemoveId === table.id ? (
                                 <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                                   <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">确认移除?</span>
                                   <button
                                      onClick={() => {
                                        handleToggleImport(table);
                                        setConfirmRemoveId(null);
                                      }}
                                      className="text-green-500 hover:bg-green-50 p-1 rounded transition-colors"
                                      title="确认移除"
                                   >
                                      <Check className="w-4 h-4" />
                                   </button>
                                   <button
                                      onClick={() => setConfirmRemoveId(null)}
                                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded transition-colors"
                                      title="取消"
                                   >
                                      <X className="w-4 h-4" />
                                   </button>
                                 </div>
                               ) : (
                                 <button
                                    onClick={() => setConfirmRemoveId(table.id)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                    title="移除此表"
                                 >
                                    <X className="w-4 h-4" />
                                 </button>
                               )}
                            </div>
                         </div>

                         {/* Columns List */}
                         {isExpanded && (
                           <div className="p-0 animate-in slide-in-from-top-2 duration-200">
                             
                             {/* AI Helper Bar */}
                             <div className="bg-indigo-50/50 px-4 py-2 border-b border-indigo-100 flex justify-end gap-2">
                                {isGenerating && (
                                   <button
                                     onClick={() => handleStopGeneration(table.id)}
                                     disabled={stopGeneration[table.id]}
                                     className="flex items-center gap-2 text-xs font-medium text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                                   >
                                     <StopCircle className="w-3.5 h-3.5" />
                                     停止生成
                                   </button>
                                )}
                                <button
                                  onClick={() => handleAutoFill(table)}
                                  disabled={isGenerating}
                                  className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {isGenerating && aiProgress[table.id] 
                                    ? `AI 填充中 (${aiProgress[table.id].current}/${aiProgress[table.id].total})` 
                                    : 'AI 自动填充别名与描述'
                                  }
                                </button>
                             </div>

                             <table className="w-full text-left text-sm">
                               <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                 <tr>
                                   <th className="px-4 py-2 font-semibold w-[25%] pl-12">字段名</th>
                                   <th className="px-4 py-2 font-semibold w-[20%]">字段别名 <span className="font-normal text-slate-400 lowercase">(中文名)</span></th>
                                   <th className="px-4 py-2 font-semibold w-[15%]">类型</th>
                                   <th className="px-4 py-2 font-semibold w-[40%]">业务含义描述</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                 {(table.columns || []).map((col, idx) => (
                                   <tr key={col.name || idx} className="hover:bg-slate-50/50">
                                     <td className="px-4 py-2 font-mono text-slate-700 pl-12">{col.name}</td>
                                     <td className="px-4 py-1.5">
                                       <input
                                         type="text"
                                         value={col.alias || ''}
                                         onChange={(e) => handleColumnChange(table.id, col.name, 'alias', e.target.value)}
                                         placeholder="中文别名"
                                         className="w-full px-2 py-1 border border-slate-200 rounded focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-colors"
                                       />
                                     </td>
                                     <td className="px-4 py-2 text-slate-500 text-xs">{col.type}</td>
                                     <td className="px-4 py-1.5">
                                       <input
                                         type="text"
                                         value={col.description || ''}
                                         onChange={(e) => handleColumnChange(table.id, col.name, 'description', e.target.value)}
                                         placeholder={`描述 ${col.name}...`}
                                         className="w-full px-2 py-1 border border-slate-200 rounded focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-colors"
                                       />
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>
                     );
                   })}
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
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
      
      {/* Table Preview Modal */}
      <TablePreviewModal
        isOpen={!!previewTable}
        onClose={() => setPreviewTable(null)}
        table={previewTable}
        dbConfig={dataSource?.config || null}
      />
    </div>
  );
};