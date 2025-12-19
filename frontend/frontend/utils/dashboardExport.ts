
import { Dashboard, DataSource, Dataset } from '../types';

export const generateDashboardHtml = (
  dashboard: Dashboard,
  dataSources: DataSource[],
  datasets: Dataset[]
): string => {
  // Serialize data for embedding
  const appData = JSON.stringify({
    dashboard,
    dataSources,
    datasets
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${dashboard.name} - AI Insight Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #f1f5f9; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
    <!-- Import Map for Recharts & React -->
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
        "recharts": "https://esm.sh/recharts@2.12.0",
        "lucide-react": "https://esm.sh/lucide-react@0.300.0"
      }
    }
    </script>
</head>
<body>
    <div id="root"></div>

    <script>
      // Embedded Data
      window.__DASHBOARD_DATA__ = ${appData};
    </script>

    <script type="text/babel" data-type="module">
      import React, { useState, useMemo, useEffect } from 'react';
      import { createRoot } from 'react-dom/client';
      import { 
        BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
        Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
        ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
        ResponsiveContainer, Cell, ComposedChart, ReferenceLine, FunnelChart, Funnel, LabelList
      } from 'recharts';
      import { Database, Filter, ArrowLeft, LayoutDashboard, AlertCircle, Loader2 } from 'lucide-react';

      // --- Constants & Helpers ---
      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      const COL_SPAN_CLASSES = {
        1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
        5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
        9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12'
      };

      // --- Chart Renderer Component (Simplified) ---
      const ChartRenderer = ({ config, data }) => {
        const processedData = useMemo(() => {
           if (!data || data.length === 0) return [];
           // Simple pass-through for demo, in real app includes aggregation logic
           return data; 
        }, [data]);

        if (!data || data.length === 0) return <div className="text-gray-400 text-sm flex items-center justify-center h-full">暂无数据</div>;

        const renderChart = () => {
           const variant = config.variant || 'default';
           const commonProps = { data: processedData, margin: { top: 10, right: 10, bottom: 0, left: 0 } };
           const isStacked = variant === 'stacked';

           switch(config.type) {
              case 'bar':
                 return (
                    <BarChart {...commonProps}>
                       <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                       <XAxis dataKey={config.xAxisKey} fontSize={11} tickLine={false} axisLine={false} />
                       <YAxis fontSize={11} tickLine={false} axisLine={false} />
                       <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0/0.1)'}} />
                       <Legend wrapperStyle={{fontSize:'12px', paddingTop:'10px'}}/>
                       {config.dataKeys.map((key, i) => (
                          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} stackId={isStacked ? 'a' : undefined} />
                       ))}
                    </BarChart>
                 );
              case 'line':
                 return (
                    <LineChart {...commonProps}>
                       <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                       <XAxis dataKey={config.xAxisKey} fontSize={11} tickLine={false} axisLine={false} />
                       <YAxis fontSize={11} tickLine={false} axisLine={false} />
                       <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0/0.1)'}} />
                       <Legend wrapperStyle={{fontSize:'12px', paddingTop:'10px'}}/>
                       {config.dataKeys.map((key, i) => (
                          <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{r:3}} />
                       ))}
                    </LineChart>
                 );
              case 'pie':
                 return (
                    <PieChart>
                       <Tooltip />
                       <Legend wrapperStyle={{fontSize:'12px', paddingTop:'10px'}}/>
                       <Pie
                          data={processedData}
                          dataKey={config.dataKeys[0]}
                          nameKey={config.xAxisKey}
                          cx="50%" cy="50%"
                          innerRadius={variant === 'donut' ? '60%' : '0%'}
                          outerRadius="80%"
                          fill="#8884d8"
                          label
                       >
                          {processedData.map((entry, index) => (
                             <Cell key={'cell-'+index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                          ))}
                       </Pie>
                    </PieChart>
                 );
              case 'area':
                 return (
                    <AreaChart {...commonProps}>
                       <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                       <XAxis dataKey={config.xAxisKey} fontSize={11} tickLine={false} axisLine={false} />
                       <YAxis fontSize={11} tickLine={false} axisLine={false} />
                       <Tooltip />
                       <Legend />
                       {config.dataKeys.map((key, i) => (
                          <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} />
                       ))}
                    </AreaChart>
                 );
              case 'radar':
                 return (
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData}>
                       <PolarGrid />
                       <PolarAngleAxis dataKey={config.xAxisKey} tick={{fontSize:11}} />
                       <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                       <Tooltip />
                       <Legend />
                       {config.dataKeys.map((key, i) => (
                          <Radar key={key} name={key} dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
                       ))}
                    </RadarChart>
                 );
              case 'web-component':
                 // Basic simulation for web components - simplified for export
                 return (
                    <div className="w-full h-full p-4 overflow-auto border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">
                        Web Component Content (Rendered by React Code)
                    </div>
                 );
              default:
                 return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Chart type '{config.type}' not fully supported in standalone mode</div>;
           }
        };

        return (
           <div className="w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                 {renderChart()}
              </ResponsiveContainer>
           </div>
        );
      };

      // --- Widget Card Component ---
      const WidgetCard = ({ widget, data, filters }) => {
         const colSpan = widget.layout.colSpan || 6;
         const height = widget.layout.height === 'tall' ? 600 : (typeof widget.layout.height === 'number' ? widget.layout.height : 400);
         
         // Client-side filtering for standalone
         const filteredData = useMemo(() => {
            if (!data || !filters) return data;
            return data.filter(row => {
               return Object.entries(filters).every(([col, val]) => {
                  return String(row[col]) === val;
               });
            });
         }, [data, filters]);

         return (
            <div 
               className={\`\${COL_SPAN_CLASSES[colSpan] || 'md:col-span-6'} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-6\`}
               style={{ gridRowEnd: \`span \${height}\`, height: height }}
            >
               <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center h-12 shrink-0">
                  <h3 className="font-semibold text-slate-800">{widget.config.title}</h3>
               </div>
               <div className="flex-1 w-full min-h-0 p-4 relative">
                  <ChartRenderer config={widget.config} data={filteredData} />
               </div>
            </div>
         );
      };

      // --- Main App Component ---
      const DashboardApp = () => {
         const { dashboard, dataSources, datasets } = window.__DASHBOARD_DATA__;
         const [topFilters, setTopFilters] = useState({});

         // Consolidate data for lookup
         const allTables = useMemo(() => {
            return [...dataSources.flatMap(ds => ds.tables), ...datasets.map(d => ({...d.previewData, id: d.id, name: d.name}))];
         }, []);

         // Extract Filters Logic (Simplified)
         const extractedFilters = useMemo(() => {
            if (!dashboard.extractedFilterWidgetIds) return [];
            const widgets = dashboard.widgets.filter(w => dashboard.extractedFilterWidgetIds.includes(w.id));
            const cols = new Set();
            widgets.forEach(w => w.config.filters?.forEach(f => cols.add(f.column)));
            
            return Array.from(cols).map(col => {
               const options = new Set();
               widgets.forEach(w => {
                  if(w.config.filters?.some(f => f.column === col)) {
                     const table = allTables.find(t => t.id === w.tableId || t.name === w.config.tableName);
                     table?.rows.forEach(r => r[col] && options.add(String(r[col])));
                  }
               });
               return { column: col, options: Array.from(options).sort() };
            });
         }, []);

         const handleFilterChange = (col, val) => {
            setTopFilters(prev => {
               const next = { ...prev };
               if (val === '__ALL__') delete next[col];
               else next[col] = val;
               return next;
            });
         };

         return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
               <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 shrink-0 z-20">
                  <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                           <LayoutDashboard size={20} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">{dashboard.name}</h1>
                     </div>
                     <div className="text-sm text-slate-400">
                        独立部署版本 • {new Date().toLocaleDateString()}
                     </div>
                  </div>
               </header>

               {extractedFilters.length > 0 && (
                  <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm z-10">
                     <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2">
                           <Filter size={16} /> 全局筛选:
                        </div>
                        {extractedFilters.map(fc => (
                           <div key={fc.column} className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-slate-600 uppercase">{fc.column}</label>
                              <select 
                                 className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500"
                                 onChange={(e) => handleFilterChange(fc.column, e.target.value)}
                              >
                                 <option value="__ALL__">全部</option>
                                 {fc.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               <main className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-[1600px] mx-auto">
                     <div className="grid grid-cols-12 gap-6">
                        {dashboard.widgets.map(widget => {
                           // Try datasetId, fallback to tableId
                           const dsId = widget.datasetId || widget.tableId;
                           const table = allTables.find(t => t.id === dsId || t.name === widget.config.tableName);
                           const isExtracted = dashboard.extractedFilterWidgetIds?.includes(widget.id);
                           const currentFilters = isExtracted ? topFilters : undefined;
                           
                           // Simple web component check - for standalone we skip advanced web component rendering unless standardized
                           if (widget.config.type === 'web-component') {
                              return <WidgetCard key={widget.id} widget={widget} data={null} filters={null} />;
                           }

                           if (!table) return null;
                           
                           return (
                              <WidgetCard 
                                 key={widget.id} 
                                 widget={widget} 
                                 data={table.rows} 
                                 filters={currentFilters}
                              />
                           );
                        })}
                     </div>
                  </div>
               </main>
            </div>
         );
      };

      const root = createRoot(document.getElementById('root'));
      root.render(<DashboardApp />);
    </script>
</body>
</html>`;
};
