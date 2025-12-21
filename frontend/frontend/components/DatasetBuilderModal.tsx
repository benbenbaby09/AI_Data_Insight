import React, { useState, useEffect, useMemo } from 'react';
import { X, Database, Wand2, Play, Save, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2, Table as TableIcon, Check, Layers, Search, Eye, Copy, FileText, XCircle, Circle } from 'lucide-react';
import { DataSource, TableData, Dataset } from '../types';
import { apiService } from '../services/api';
import { format } from 'sql-formatter';
import { TableAnnotationModal } from './TableAnnotationModal';

interface GenerationStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
}

interface DatasetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSources: DataSource[];
  onSave: (dataset: Dataset) => void;
  initialDataset?: Dataset | null;
  preSelectedDataSourceId?: number | null;
}

type Step = 'select-source' | 'generate-query' | 'preview-save';

const PAGE_SIZE = 10;

export const DatasetBuilderModal: React.FC<DatasetBuilderModalProps> = ({ 
  isOpen, 
  onClose, 
  dataSources, 
  onSave,
  initialDataset,
  preSelectedDataSourceId
}) => {
  const [step, setStep] = useState<Step>('select-source');
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [activeDataSourceId, setActiveDataSourceId] = useState<number | ''>('');
  const [userQuery, setUserQuery] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [sqlExplanation, setSqlExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<TableData | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDesc, setDatasetDesc] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTable, setPreviewTable] = useState<TableData | null>(null);
  const [annotationTable, setAnnotationTable] = useState<TableData | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [copied, setCopied] = useState(false);
  const [isTableSelectionLocked, setIsTableSelectionLocked] = useState(false);
  const stopGenerationRef = React.useRef(false);

  const handleStopGeneration = () => {
    stopGenerationRef.current = true;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  // Initialize/Reset state when modal opens or initialDataset changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsTableSelectionLocked(false); // Reset lock state on open
      if (initialDataset) {
        setDatasetName(initialDataset.name);
        setDatasetDesc(initialDataset.description || '');
        try {
            // Try to format existing SQL if possible, though it might be already formatted
            setGeneratedSql(initialDataset.sql ? format(initialDataset.sql, { language: 'sql' }) : '');
        } catch {
            setGeneratedSql(initialDataset.sql || '');
        }
        setPreviewData(initialDataset.previewData || null);
        setStep('preview-save');
        setSelectedTableIds([]);
        setUserQuery('');
        setSearchTerm('');
        // For editing, we might need to know the original source.
        if (initialDataset.dataSourceId) {
            setActiveDataSourceId(initialDataset.dataSourceId);
        }
      } else {
        // New Mode
        setStep('select-source');
        setSelectedTableIds([]);
        setUserQuery('');
        setGeneratedSql('');
        setPreviewData(null);
        setDatasetName('');
        setDatasetDesc('');
        setSearchTerm('');
        
        if (preSelectedDataSourceId) {
            setActiveDataSourceId(preSelectedDataSourceId);
        } else if (dataSources.length > 0) {
            setActiveDataSourceId(dataSources[0].id);
        }
      }
    }
  }, [isOpen, initialDataset, preSelectedDataSourceId, dataSources]);

  const handleDataSourceChange = (sourceId: string) => {
    const id = sourceId ? parseInt(sourceId, 10) : '';
    if (id !== activeDataSourceId) {
        setActiveDataSourceId(id);
        setSelectedTableIds([]); // Clear selection when switching source
        setSearchTerm('');
    }
  };

  const handleTableToggle = (tableId: number) => {
    if (isTableSelectionLocked) return;
    setSelectedTableIds(prev => 
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const activeDS = dataSources.find(ds => ds.id === activeDataSourceId);

  // Fetch preview rows when previewTable changes
  useEffect(() => {
    if (!previewTable || !activeDS) return;
    
    const fetchRows = async () => {
        setIsPreviewLoading(true);
        try {
            const payload = {
                type: activeDS.config.type,
                host: activeDS.config.host,
                port: activeDS.config.port,
                username: activeDS.config.username,
                password: activeDS.config.password,
                serviceName: activeDS.config.serviceName,
                database: (activeDS.config as any).database,
                tableName: previewTable.name,
                limit: 20
            };
            const res = await apiService.previewTableRows(payload);
            if (res.success) {
                setPreviewRows(res.rows);
            } else {
                setPreviewRows([]);
            }
        } catch (e) {
            console.error(e);
            setPreviewRows([]);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    fetchRows();
  }, [previewTable, activeDS]);
  
  const filteredTables = useMemo(() => {
    if (!activeDS) return [];
    if (!searchTerm.trim()) return activeDS.tables;
    const lowerTerm = searchTerm.toLowerCase();
    return activeDS.tables.filter(t => 
        t.name.toLowerCase().includes(lowerTerm) || 
        (t.description || '').toLowerCase().includes(lowerTerm)
    );
  }, [activeDS, searchTerm]);

  if (!isOpen) return null;

  const handleSelectAllFiltered = () => {
    if (!activeDS || isTableSelectionLocked) return;
    
    const allFilteredIds = filteredTables.map(t => t.id);
    const allSelected = allFilteredIds.every(id => selectedTableIds.includes(id));
    
    if (allSelected) {
      // Deselect all visible
      setSelectedTableIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all visible (merge with existing selection)
      const newIds = [...selectedTableIds];
      allFilteredIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
      });
      setSelectedTableIds(newIds);
    }
  };

  const handleDirectCreate = async () => {
    // For each selected table, create a dataset directly without SQL generation
    // This is useful for simple "select * from table" datasets
    if (selectedTableIds.length === 0 || !activeDataSourceId) return;

    try {
        const activeDS = dataSources.find(ds => ds.id === activeDataSourceId);
        if (!activeDS) return;

        const tables = activeDS.tables.filter(t => selectedTableIds.includes(t.id));
        
        for (const table of tables) {
            // Generate simple SQL
            const sql = `SELECT * FROM ${table.name}`;
            
            // Create dataset object
            const newDataset: Dataset = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: table.name, // Use table name as dataset name
                description: table.description || `Created from ${table.name}`,
                dataSourceId: activeDS.id, // Use single ID
                sql: sql,
                previewData: {
                    id: table.id,
                    name: table.name,
                    columns: table.columns,
                    rows: [], // We don't have rows here, but that's fine for now
                    description: table.description,
                    dataSourceId: activeDS.id
                },
                createdAt: Date.now()
            };
            
            // Save/Create
            onSave(newDataset);
        }
        
        onClose();
    } catch (err) {
        console.error("Failed to direct create datasets", err);
        setErrorMsg("批量创建失败");
    }
  };

  const handleGenerateSQL = async () => {
    // Valid check: if selection is locked, user MUST select tables.
    // However, user requested to "skip intelligent selection and use selected tables".
    // If we have selected tables, we use them (which is default behavior).
    // If we have NO selected tables, we use empty list (and tell backend not to auto-select).
    // So we remove the blocking check here.
    /*
    if (isTableSelectionLocked && selectedTableIds.length === 0) {
        setErrorMsg("请先选择数据表");
        return;
    }
    */
    
    setIsGenerating(true);
    stopGenerationRef.current = false;
    // Reset all previous states
    setGenerationSteps([{ id: 'init', label: '正在准备上下文...', status: 'success' }]);
    setGeneratedSql('');
    setSqlExplanation('');
    setErrorMsg(null);
    
    // Filter data sources to only include selected tables for context
    // Since we now have single source
    const activeDS = dataSources.find(ds => ds.id === activeDataSourceId);
    if (!activeDS) {
        setIsGenerating(false);
        return;
    }
    
    // Check if we need auto-selection
    let effectiveSelectedTableIds = [...selectedTableIds];
    
    // Run auto-select if NOT locked (regardless of whether tables are already selected)
    if (!isTableSelectionLocked) {
        setGenerationSteps(prev => [...prev, { id: 'auto-select', label: 'AI 智能选表', status: 'running' }]);
        try {
            const selectResult = await apiService.aiSelectTables(activeDataSourceId, userQuery);
            if (stopGenerationRef.current) return;
            
            if (selectResult.selectedTableIds && selectResult.selectedTableIds.length > 0) {
                effectiveSelectedTableIds = selectResult.selectedTableIds;
                setSelectedTableIds(effectiveSelectedTableIds);
                setGenerationSteps(prev => prev.map(s => s.id === 'auto-select' ? { ...s, status: 'success' } : s));
            } else {
                 setGenerationSteps(prev => prev.map(s => s.id === 'auto-select' ? { ...s, status: 'error', message: '未找到相关表' } : s));
                 setErrorMsg("AI 未能找到相关表，请尝试手动选择或修改问题。");
                 setIsGenerating(false);
                 return;
            }
        } catch (e) {
            console.error("Auto-selection failed", e);
            setGenerationSteps(prev => prev.map(s => s.id === 'auto-select' ? { ...s, status: 'error', message: '选表失败' } : s));
            setErrorMsg("自动选表失败，请手动选择表。");
            setIsGenerating(false);
            return;
        }
    }

    const queryToSend = userQuery.trim() || "查询选中表的所有数据";
    
    // setErrorMsg(null); // Moved to top
    
    let attempts = 0;
    const maxAttempts = 5; // Increased to 5 as per requirement
    let success = false;
    let currentQuery = queryToSend;
    let lastError = "";

    // Initial Generation Step
    setGenerationSteps(prev => [...prev, { id: 'gen-1', label: 'AI 生成 SQL (第 1 次尝试)', status: 'running' }]);

    while (attempts < maxAttempts && !success) {
        if (stopGenerationRef.current) break;

        attempts++;
        const currentStepId = attempts === 1 ? 'gen-1' : `gen-${attempts}`;
        
        try {
            console.log(`Generating SQL attempt ${attempts}/${maxAttempts} with query:`, currentQuery);
            if (attempts > 1) {
                 // Update status to show retry
                 setErrorMsg(`SQL 执行失败，正在尝试第 ${attempts} 次重新生成...`);
                 
                 // Add retry step if not already present (handled in previous loop iteration usually)
            }
            
            // If this is a retry due to execution error, append the error to the query
            const prompt = attempts === 1 ? currentQuery : `${currentQuery}\n\nPrevious generated SQL failed with error: ${lastError}. Please fix the SQL.`;

            if (stopGenerationRef.current) break;
            // Changed: Send only IDs instead of full schema
            // Also pass skipAutoSelect flag if locked
            const result = await apiService.aiGenerateDatasetSQL(activeDataSourceId, effectiveSelectedTableIds, prompt, isTableSelectionLocked);
            if (stopGenerationRef.current) break;
            console.log("Generation result:", result);
            
            // Note: Auto-select logic is now handled before the loop, so result.relevantTableIds usage is redundant but harmless.

            // Mark generation as success
            setGenerationSteps(prev => prev.map(s => s.id === currentStepId ? { ...s, status: 'success' } : s));

            let generatedSqlCandidate = "";
            let explanationCandidate = "";

            if (result && result.sql) {
                generatedSqlCandidate = result.sql;
                explanationCandidate = result.explanation;
            } else if (result && (result as any).content) {
                 // ... (fallback parsing logic same as before) ...
                 try {
                    let content = (result as any).content;
                    content = content.trim();
                    if (content.startsWith("```")) {
                        const firstLine = content.indexOf('\n');
                        if (firstLine > -1) content = content.substring(firstLine + 1);
                        if (content.endsWith("```")) content = content.substring(0, content.length - 3);
                    }
                    content = content.trim();
                    const parsed = JSON.parse(content);
                    if (parsed.sql) {
                        generatedSqlCandidate = parsed.sql;
                        explanationCandidate = parsed.explanation || (result as any).reasoning || "";
                    }
                } catch (e) {
                    console.warn("Failed to parse fallback content", e);
                }
            }

            if (generatedSqlCandidate) {
                // Auto-Execute Test
                const testStepId = `test-${attempts}`;
                setGenerationSteps(prev => [...prev, { id: testStepId, label: '自动执行测试 SQL', status: 'running' }]);

                if (stopGenerationRef.current) break;
                console.log("Auto-testing generated SQL:", generatedSqlCandidate);
                try {
                    const payload = {
                        type: activeDS.config.type,
                        host: activeDS.config.host,
                        port: activeDS.config.port,
                        username: activeDS.config.username,
                        password: activeDS.config.password,
                        serviceName: activeDS.config.serviceName,
                        database: (activeDS.config as any).database,
                        sql: generatedSqlCandidate,
                        limit: 1 // We only need to check if it runs
                    };
                    const execResult = await apiService.executeSql(payload);
                    if (stopGenerationRef.current) break;
                    
                    if (execResult.success) {
                        // Success!
                        setGenerationSteps(prev => prev.map(s => s.id === testStepId ? { ...s, status: 'success' } : s));
                        
                        try {
                            const formattedSql = format(generatedSqlCandidate, { language: 'sql' });
                            setGeneratedSql(formattedSql);
                        } catch (e) {
                            setGeneratedSql(generatedSqlCandidate);
                        }
                        setSqlExplanation(explanationCandidate);
                         if (step !== 'generate-query' && step !== 'select-source') {
                            setStep('generate-query'); 
                        }
                        success = true;
                        setErrorMsg(null); // Clear any retry messages
                    } else {
                        // Execution failed
                        console.warn("SQL Auto-test failed:", execResult.message);
                        lastError = execResult.message || "Unknown SQL execution error";
                        setGenerationSteps(prev => prev.map(s => s.id === testStepId ? { ...s, status: 'error', message: lastError } : s));
                        // Don't set success, loop will continue
                    }
                } catch (execErr) {
                    console.warn("SQL Auto-test exception:", execErr);
                    lastError = execErr instanceof Error ? execErr.message : "Unknown execution exception";
                    setGenerationSteps(prev => prev.map(s => s.id === testStepId ? { ...s, status: 'error', message: lastError } : s));
                }
            } else {
                 console.warn(`Attempt ${attempts} returned empty or invalid result`);
                 setGenerationSteps(prev => prev.map(s => s.id === currentStepId ? { ...s, status: 'error', message: '生成结果为空' } : s));
            }
            
            if (!success && attempts < maxAttempts) {
                if (stopGenerationRef.current) break;
                // Prepare for next attempt
                setGenerationSteps(prev => [...prev, { id: `gen-${attempts + 1}`, label: `AI 修正 SQL (第 ${attempts + 1} 次尝试)`, status: 'running' }]);
                // Wait 1s before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (!success && attempts >= maxAttempts) {
                console.error("Failed to generate working SQL after max attempts");
                setErrorMsg(`生成 SQL 失败，已重试 ${maxAttempts} 次。最后一次错误: ${lastError}`);
            }
        } catch (error) {
            console.error(`Attempt ${attempts} failed:`, error);
            lastError = error instanceof Error ? error.message : "Unknown error";
            setGenerationSteps(prev => prev.map(s => s.id === currentStepId ? { ...s, status: 'error', message: lastError } : s));
            
            if (attempts < maxAttempts) {
                if (stopGenerationRef.current) break;
                setGenerationSteps(prev => [...prev, { id: `gen-${attempts + 1}`, label: `AI 修正 SQL (第 ${attempts + 1} 次尝试)`, status: 'running' }]);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                setErrorMsg("生成 SQL 失败: " + lastError);
            }
        }
    }

    if (stopGenerationRef.current) {
        setErrorMsg("已停止生成");
        // Optional: Mark running steps as error or cancelled
        setGenerationSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', message: '用户已停止' } : s));
    }
    
    setIsGenerating(false);
  };

  const handleExecuteMock = async () => {
    if (!generatedSql || !activeDataSourceId) return;
    const activeDS = dataSources.find(ds => ds.id === activeDataSourceId);
    if (!activeDS) return;

    setIsExecuting(true);
    try {
        const payload = {
            type: activeDS.config.type,
            host: activeDS.config.host,
            port: activeDS.config.port,
            username: activeDS.config.username,
            password: activeDS.config.password,
            serviceName: activeDS.config.serviceName,
            database: (activeDS.config as any).database,
            sql: generatedSql,
            limit: 20
        };
        const result = await apiService.executeSql(payload);
        
        if (result.success) {
            let columns: any[] = [];
            
            if (result.columns && result.columns.length > 0) {
                 columns = result.columns.map(name => ({
                     name: name,
                     type: 'string' 
                 }));
                 if (result.rows && result.rows.length > 0) {
                      columns = columns.map(col => ({
                          ...col,
                          type: typeof result.rows[0][col.name] === 'number' ? 'number' : 'string'
                      }));
                 }
            } else if (result.rows && result.rows.length > 0) {
                columns = Object.keys(result.rows[0]).map(key => ({
                    name: key,
                    type: typeof result.rows[0][key] === 'number' ? 'number' : 'string'
                }));
            }

            setPreviewData({
                id: Date.now(), // Ensure numeric ID
                name: 'SQL Execution Result',
                columns: columns,
                rows: result.rows || [],
                description: 'Generated from SQL execution',
                dataSourceId: activeDataSourceId as number
            });
            
            // Auto-fill description with SQL explanation if available
            if (sqlExplanation) {
                setDatasetDesc(sqlExplanation);
            }
            
            setCurrentPage(1);
            setStep('preview-save');
        } else {
            alert(result.message || "执行查询失败或无数据返回");
        }
    } catch (error) {
        console.error("SQL execution failed:", error);
        alert("执行查询失败，请检查数据库连接或 SQL 语法");
    } finally {
        setIsExecuting(false);
    }
  };

  const handleFinalSave = () => {
    if (!datasetName.trim() || !previewData) return;

    // Identify which DataSources were used based on selected tables
    // Simplified to activeDataSourceId
    let usedDataSourceId: number = typeof activeDataSourceId === 'number' ? activeDataSourceId : -1;
    
    if (initialDataset && selectedTableIds.length === 0) {
        // If editing and didn't re-select tables (just renamed), keep original sources
        usedDataSourceId = initialDataset.dataSourceId;
    }

    const newDataset: Dataset = {
      id: initialDataset ? initialDataset.id : Date.now(),
      name: datasetName,
      description: datasetDesc,
      dataSourceId: usedDataSourceId,
      sql: generatedSql,
      previewData: previewData, // Snapshot
      createdAt: initialDataset ? initialDataset.createdAt : Date.now()
    };
    onSave(newDataset);
    
    onClose();
  };

  // Pagination Logic
  const totalRows = previewData?.rows.length || 0;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const currentRows = previewData?.rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">{initialDataset ? '编辑数据集' : '新建数据集'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2 text-sm shrink-0">
           <div className={`flex items-center gap-2 ${step === 'select-source' || step === 'generate-query' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
             <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">1</span>
             配置数据集
           </div>
           <div className="w-8 h-px bg-slate-300" />
           <div className={`flex items-center gap-2 ${step === 'preview-save' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
             <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">2</span>
             预览与保存
           </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Select Tables & Generate Query */}
          {(step === 'select-source' || step === 'generate-query') && (
            <div className="h-full flex flex-col gap-6">
              <div className="flex items-start gap-4 flex-1 min-h-0">
                
                {/* Column 1: Config & Query Generation */}
                <div className="w-1/4 flex flex-col gap-4 h-full">
                   <div className="shrink-0">
                       <h3 className="text-lg font-semibold text-slate-800">1. 配置与生成</h3>
                       <p className="text-sm text-slate-500">选择数据源并描述任务</p>
                   </div>
                   
                   <div className="flex flex-col gap-3 flex-1 min-h-0">
                       {/* Data Source Selection (Moved to Column 1) */}
                       <div className="flex flex-col gap-1 shrink-0">
                            <label className="text-xs font-medium text-slate-700">数据源</label>
                            <div className="w-full">
                                {preSelectedDataSourceId ? (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm">
                                        <Database className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium truncate">{activeDS?.name || '未知数据源'}</span>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select 
                                            value={activeDataSourceId} 
                                            onChange={(e) => handleDataSourceChange(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none text-slate-700 cursor-pointer shadow-sm"
                                        >
                                            <option value="" disabled>请选择数据源...</option>
                                            {dataSources.map(ds => (
                                                <option key={ds.id} value={ds.id}>{ds.name}</option>
                                            ))}
                                        </select>
                                        <Database className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                       </div>

                       <div className="flex flex-col gap-2 shrink-0">
                          <textarea 
                            value={userQuery}
                            onChange={(e) => setUserQuery(e.target.value)}
                            placeholder="例如：查询所有 2024 年第一季度的销售订单..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none h-24"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isGenerating) handleGenerateSQL();
                                }
                            }}
                          />
                          {isGenerating ? (
                            <button 
                              onClick={handleStopGeneration}
                              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2 text-sm transition-colors"
                              title="点击停止生成"
                            >
                                <XCircle className="w-4 h-4" />
                                停止生成
                            </button>
                          ) : (
                            <button 
                              onClick={handleGenerateSQL}
                              disabled={!activeDataSourceId || (isTableSelectionLocked && selectedTableIds.length === 0)}
                              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-colors"
                              title={!activeDataSourceId ? "请先选择数据源" : "点击生成 SQL"}
                            >
                                <Wand2 className="w-4 h-4" />
                                生成 SQL
                            </button>
                          )}
                       </div>
                       
                       {/* Status / Steps Area */}
                       <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 shadow-inner overflow-y-auto p-3">
                           {generationSteps.length > 0 ? (
                               <div className="flex flex-col gap-2.5">
                                   {generationSteps.map((step, idx) => (
                                       <div key={step.id} className="flex items-start gap-2 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                                           <div className="mt-0.5 shrink-0 relative">
                                               {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                                               {step.status === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                               {step.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                                               {step.status === 'pending' && <Circle className="w-3 h-3 text-slate-300" />}
                                           </div>
                                           <div className="flex flex-col min-w-0 flex-1">
                                               <span className={`font-medium ${
                                                   step.status === 'error' ? 'text-red-600' : 
                                                   step.status === 'success' ? 'text-slate-700' : 
                                                   step.status === 'running' ? 'text-indigo-600' :
                                                   'text-slate-500'
                                               }`}>
                                                   {step.label}
                                               </span>
                                               {step.message && (
                                                   <span className="text-[10px] text-red-500 mt-1 bg-red-50 p-1 rounded border border-red-100 block break-words font-mono">
                                                       {step.message}
                                                   </span>
                                               )}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                                   <Layers className="w-8 h-8 mb-2 opacity-20" />
                                   <p>任务状态将在此显示</p>
                               </div>
                           )}
                           
                           {errorMsg && (
                               <div className={`text-xs flex items-center gap-2 ${generationSteps.length > 0 ? 'pt-2 border-t border-slate-200 mt-2' : ''} text-red-600`}>
                                   <AlertCircle className="w-3 h-3 shrink-0" />
                                   {errorMsg}
                               </div>
                           )}
                       </div>
                   </div>
                </div>

                {/* Column 2: Table Selection (Split into Available and Selected) */}
                <div className="flex-1 flex gap-4 h-full border-l border-slate-200 pl-4">
                   
                   {/* Left Sub-column: Available Tables */}
                   <div className={`flex-1 flex flex-col gap-4 h-full min-w-0 transition-opacity duration-200 ${isTableSelectionLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                       <div className="shrink-0">
                           <h3 className="text-lg font-semibold text-slate-800">2. 选择数据表</h3>
                           <p className="text-sm text-slate-500">选择参与分析的数据表</p>
                       </div>
                       
                       {dataSources.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 border border-dashed rounded-lg">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>暂无可用数据源</p>
                            </div>
                       ) : !activeDataSourceId ? (
                            <div className="text-center py-10 text-slate-400 border border-dashed rounded-lg">
                              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>请先在左侧选择数据源</p>
                            </div>
                       ) : (
                            <div className="flex flex-col gap-3 flex-1 min-h-0">
                               {/* Table List */}
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col flex-1 min-h-0">
                                    <div className="p-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50 shrink-0">
                                        <div className="relative flex-1">
                                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                                            <input 
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="搜索表..."
                                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                                disabled={isTableSelectionLocked}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSelectAllFiltered}
                                            disabled={isTableSelectionLocked}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap px-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {filteredTables.length > 0 && filteredTables.every(t => selectedTableIds.includes(t.id)) ? '全不选' : '全选'}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 bg-slate-50/30">
                                        {filteredTables.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-xs">无匹配表</div>
                                        ) : (
                                            filteredTables.map(table => {
                                                const isSelected = selectedTableIds.includes(table.id);
                                                return (
                                                    <div 
                                                        key={table.id}
                                                        className={`group flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${
                                                            isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'
                                                        } ${isTableSelectionLocked ? 'cursor-not-allowed' : ''}`}
                                                        onClick={() => handleTableToggle(table.id)}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                                            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                                                        }`}>
                                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className={`text-xs font-medium truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                                {table.name}
                                                            </div>
                                                            {table.description && (
                                                                <div className={`text-[10px] truncate ${isSelected ? 'text-blue-700/70' : 'text-slate-500'}`}>
                                                                    {table.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAnnotationTable(table);
                                                                }}
                                                                className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded"
                                                                title="标注"
                                                            >
                                                                <FileText className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewTable(table);
                                                                }}
                                                                className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                                                                title="预览"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                       )}
                   </div>

                   {/* Right Sub-column: Selected Tables */}
                   <div className="w-1/3 flex flex-col gap-4 h-full min-w-0">
                       <div className="shrink-0 flex items-start justify-between gap-2">
                           <div>
                               <h3 className="text-sm font-semibold text-slate-800">已选表 ({selectedTableIds.length})</h3>
                               <p className="text-xs text-slate-500">已选择的数据表清单</p>
                           </div>
                           <label className={`flex items-center gap-1.5 mt-1 select-none ${selectedTableIds.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                               <div className="relative flex items-center">
                                   <input 
                                       type="checkbox" 
                                       checked={isTableSelectionLocked}
                                       onChange={(e) => setIsTableSelectionLocked(e.target.checked)}
                                       className="sr-only peer"
                                       disabled={selectedTableIds.length === 0}
                                   />
                                   <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                               </div>
                               <span className={`text-xs font-medium ${isTableSelectionLocked ? 'text-blue-600' : 'text-slate-500'}`}>
                                   {isTableSelectionLocked ? '已锁定' : '锁定'}
                               </span>
                           </label>
                       </div>
                       
                       <div className="flex flex-col gap-3 flex-1 min-h-0">
                           <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-inner flex flex-col flex-1 min-h-0">
                                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                                    {selectedTableIds.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs">
                                            <p>未选择任何表</p>
                                        </div>
                                    ) : (
                                        selectedTableIds.map(id => {
                                            const table = activeDS?.tables.find(t => t.id === id);
                                            if (!table) return null;
                                            return (
                                                <div 
                                                    key={id}
                                                    className={`flex items-center justify-between gap-2 p-2 rounded-md bg-white border border-slate-200 shadow-sm group ${isTableSelectionLocked ? 'opacity-80' : ''}`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-medium truncate text-slate-700">
                                                            {table.name}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleTableToggle(id)}
                                                        disabled={isTableSelectionLocked}
                                                        className={`p-1 text-slate-400 rounded transition-colors ${
                                                            isTableSelectionLocked 
                                                                ? 'cursor-not-allowed opacity-50' 
                                                                : 'hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                        title={isTableSelectionLocked ? "已锁定" : "移除"}
                                                    >
                                                        {isTableSelectionLocked ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                           </div>
                       </div>
                   </div>

                </div>

                {/* Column 3: SQL Editor */}
                <div className="w-1/3 flex flex-col gap-4 h-full border-l border-slate-200 pl-4">
                   <div className="shrink-0">
                       <h3 className="text-lg font-semibold text-slate-800">3. SQL 结果</h3>
                       <p className="text-sm text-slate-500">AI 生成的 SQL 语句</p>
                   </div>
                   
                   <div className="flex flex-col gap-3 flex-1 min-h-0">
                       <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-900 shadow-sm min-h-0">
                             <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-300 font-mono">SQL Editor</span>
                                    <button
                                        onClick={handleCopy}
                                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded"
                                        title="复制 SQL"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                {sqlExplanation && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                       <CheckCircle2 className="w-3 h-3" /> AI Ready
                                    </span>
                                )}
                             </div>
                             <textarea
                                value={generatedSql}
                                onChange={(e) => setGeneratedSql(e.target.value)}
                                className="flex-1 p-3 font-mono text-xs text-blue-100 bg-transparent border-none outline-none resize-none focus:ring-0"
                                spellCheck={false}
                                placeholder="生成的 SQL 将显示在这里..."
                             />
                             {sqlExplanation && (
                               <div className="bg-slate-800/50 px-3 py-2 border-t border-slate-700 text-xs text-slate-400 shrink-0">
                                  <span className="font-semibold text-slate-300">AI 说明: </span>
                                  {sqlExplanation}
                               </div>
                             )}
                          </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Table Preview Modal Overlay */}
          {previewTable && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4 animate-in fade-in duration-200">
              <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TableIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{previewTable.name}</h3>
                      <p className="text-xs text-slate-500">{previewTable.description || '暂无描述'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPreviewTable(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col relative">
                   {isPreviewLoading && (
                      <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                   )}
                   
                   <div className="flex-1 overflow-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                           <tr>
                              <th className="px-6 py-3 border-b border-slate-200 font-semibold text-slate-600 w-16 text-center bg-slate-50">#</th>
                              {previewTable.columns.map(col => (
                                 <th key={col.name} className="px-6 py-3 border-b border-slate-200 font-semibold text-slate-600 whitespace-nowrap bg-slate-50">
                                    <div className="flex items-center gap-2">
                                       {col.name}
                                       <span className="text-xs font-normal text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                                          {col.type}
                                       </span>
                                    </div>
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {previewRows.length === 0 ? (
                              <tr>
                                 <td colSpan={previewTable.columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                    {isPreviewLoading ? '正在加载数据...' : '暂无数据预览'}
                                 </td>
                              </tr>
                           ) : (
                              previewRows.map((row, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3 text-center text-slate-400 text-xs border-r border-slate-50">{idx + 1}</td>
                                    {previewTable.columns.map(col => {
                                        const val = row[col.name] ?? 
                                                    row[col.name.toUpperCase()] ?? 
                                                    row[col.name.toLowerCase()] ??
                                                    Object.entries(row).find(([k]) => k.toLowerCase() === col.name.toLowerCase())?.[1];
                                        return (
                                           <td key={col.name} className="px-6 py-3 text-slate-700 whitespace-nowrap max-w-xs truncate">
                                              {val !== undefined && val !== null ? String(val) : <span className="text-slate-300">-</span>}
                                           </td>
                                        );
                                    })}
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                   </div>
                </div>
                
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                   <span>仅显示前 20 条记录供预览</span>
                   <button 
                     onClick={() => setPreviewTable(null)}
                     className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                   >
                     关闭预览
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Save */}
          {step === 'preview-save' && previewData && (
             <div className="space-y-6 h-full flex flex-col">
                <div className="flex gap-6 h-full">
                   {/* Left: Save Form */}
                   <div className="w-1/4 space-y-4 shrink-0">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                           <Save className="w-4 h-4 text-blue-600" />
                           {initialDataset ? '更新数据集' : '保存数据集'}
                        </h4>
                        <div className="space-y-3">
                           <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">数据集名称</label>
                              <input 
                                type="text" 
                                value={datasetName}
                                onChange={(e) => setDatasetName(e.target.value)}
                                placeholder="输入名称..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">描述 (可选)</label>
                              <textarea 
                                value={datasetDesc}
                                onChange={(e) => setDatasetDesc(e.target.value)}
                                placeholder="描述此数据集的用途..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[80px]"
                              />
                           </div>
                           <div className="pt-2">
                              <button 
                                onClick={handleFinalSave}
                                disabled={!datasetName.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {initialDataset ? '确认更新' : '确认保存'}
                              </button>
                           </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-500 flex flex-col min-h-[200px]">
                         <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-slate-700">SQL 查询</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedSql);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="复制 SQL"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                         </div>
                         <div className="relative flex-1 min-h-0">
                            <textarea 
                                readOnly
                                value={generatedSql}
                                className="w-full h-full font-mono bg-slate-50 p-2 rounded border border-slate-100 resize-none outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
                            />
                         </div>
                      </div>
                   </div>

                   {/* Right: Data Preview Table */}
                   <div className="flex-1 flex flex-col min-w-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                         <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                           <TableIcon className="w-4 h-4 text-slate-400" />
                           数据预览
                         </h4>
                         <span className="text-xs text-slate-500">共 {totalRows} 条记录</span>
                      </div>
                      <div className="flex-1 overflow-auto">
                         <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                               <tr>
                                  <th className="px-4 py-2 border-b font-medium text-slate-500 w-12 text-center">#</th>
                                  {previewData.columns.map(col => (
                                     <th key={col.name} className="px-4 py-2 border-b font-medium text-slate-500 whitespace-nowrap">
                                        {col.name}
                                     </th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {currentRows.length === 0 ? (
                                  <tr>
                                     <td colSpan={previewData.columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-20" />
                                            <p>暂无数据预览或查询执行失败</p>
                                            <p className="text-xs text-slate-300">请检查 SQL 或选择的数据表是否为空</p>
                                        </div>
                                     </td>
                                  </tr>
                               ) : (
                                  currentRows.map((row, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-center text-slate-400 text-xs">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                                        {previewData.columns.map(col => {
                                            const val = row[col.name] ?? 
                                                        row[col.name.toUpperCase()] ?? 
                                                        row[col.name.toLowerCase()] ??
                                                        Object.entries(row).find(([k]) => k.toLowerCase() === col.name.toLowerCase())?.[1];
                                            return (
                                                <td key={col.name} className="px-4 py-2 text-slate-700 whitespace-nowrap max-w-xs truncate">
                                                   {val !== undefined && val !== null ? String(val) : '-'}
                                                </td>
                                            );
                                        })}
                                     </tr>
                                  ))
                               )}
                            </tbody>
                         </table>
                      </div>
                      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                         <button 
                           onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                           disabled={currentPage === 1}
                           className="p-1 rounded hover:bg-white disabled:opacity-50"
                         >
                            <ChevronLeft className="w-4 h-4" />
                         </button>
                         <span className="text-xs text-slate-500">第 {currentPage} 页 / 共 {totalPages || 1} 页</span>
                         <button 
                           onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                           disabled={currentPage === totalPages}
                           className="p-1 rounded hover:bg-white disabled:opacity-50"
                         >
                            <ChevronRight className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          
          <div className="flex gap-3">
             {step === 'preview-save' && (
                <button 
                  onClick={() => setStep('select-source')}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  上一步
                </button>
             )}
             
             {(step === 'select-source' || step === 'generate-query') && (
                <>
                  {!initialDataset && (
                      <button 
                        onClick={handleDirectCreate}
                        disabled={selectedTableIds.length === 0}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        title="跳过 SQL 生成，直接为每个选中表创建一个数据集"
                      >
                        <Layers className="w-4 h-4" />
                        直接创建 ({selectedTableIds.length})
                      </button>
                  )}
                  <button 
                    onClick={handleExecuteMock}
                    disabled={!generatedSql || isExecuting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    执行并预览
                  </button>
                </>
             )}
          </div>
        </div>
      </div>

      <TableAnnotationModal 
        isOpen={!!annotationTable}
        onClose={() => setAnnotationTable(null)}
        table={annotationTable}
      />
    </div>
  );
};
