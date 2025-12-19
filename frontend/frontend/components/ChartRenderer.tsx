
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  ReferenceLine,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { ChartConfig, DataRow } from '../types';
import { AlertCircle } from 'lucide-react';
import { ChinaMapChart } from './ChinaMapChart';

interface ChartRendererProps {
  config: ChartConfig;
  data: DataRow[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Helper to resolve data keys intelligently
const resolveDataKey = (key: string, row: DataRow): string | undefined => {
  if (!key) return undefined;
  if (key in row) return key;
  
  const normalize = (k: string) => (k || '').toUpperCase().replace(/_/g, '');
  const target = normalize(key).replace(/^(SUM|TOTAL|AVG|COUNT|MAX|MIN)/, '');
  
  // Find key in row that matches
  return Object.keys(row).find(k => {
     const normalizedRowKey = normalize(k);
     return normalizedRowKey === target || normalizedRowKey === normalize(key);
  });
};

// BoxPlot Statistics Helper
const calculateBoxPlotStats = (values: number[]) => {
  if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return { min, q1, median, q3, max };
};

// Custom BoxPlot Shape
const BoxPlotShape = (props: any) => {
  const { x, y, width, height, payload, fill } = props;
  const { min, q1, median, q3, max } = payload;
  
  // Recharts passes standardized x, y, width, height for the bar rect.
  // BUT for box plot, we typically want to calculate y-positions based on axis.
  // Recharts custom shape is powerful but complex for axis scaling inside shape.
  // Simplified Approach: We assume the 'Bar' value is 'max' or similar to reserve space,
  // but usually we need axis scale functions.
  // Workaround: Use 'Bar' to reserve the 'column' slot, but we need the Y-Scale to draw lines.
  // Since we don't have direct access to scale in custom shape easily without passing it,
  // We will assume the data passed to this shape has pre-calculated pixel coordinates or we rely on Recharts.
  // ACTUALLY: BoxPlot in Recharts is best done with a `Customized` component or a composed chart with error bars,
  // but that's messy. 
  // BETTER APPROACH for this codebase: Use a `ComposedChart`.
  // Draw a Bar (hidden opacity) to set the category band.
  // Draw the Box and Whiskers using ReferenceLines or Custom Shape if we can get scaling.
  //
  // ALTERNATIVE: Use the `Bar` component, but `dataKey` binds to an array `[min, max]`. 
  // Recharts `Bar` handles range data `[min, max]` by drawing a rect from min to max.
  // This draws the "range". We can overlay lines.
  
  // Let's try a visual simplified BoxPlot using SVG directly if we are in 'boxplot' mode.
  // But inside `BoxPlotShape`, we only get the rect props for the bar.
  
  // To keep it robust within `renderRechartsContent`, we will use a specialized `ComposedChart` structure 
  // where we calculate q1/q3/min/max and map them to separate bars/lines if possible, OR
  // just render a simple "Range Bar" (floating bar) for q1-q3 and ErrorBars for whiskers.
  
  // Implemented below in the main switch.
  return <path />;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config: rawConfig, data }) => {
  // Ensure config.dataKeys is always an array to prevent crashes
  const config = useMemo(() => ({
    ...rawConfig,
    dataKeys: rawConfig.dataKeys || []
  }), [rawConfig]);
  
  // Data Pre-processing: Aggregation
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let actualXKey = resolveDataKey(config.xAxisKey, data[0]);
    
    // Fallback: if xKey not found, use the first column as xKey (heuristic)
    if (!actualXKey && data.length > 0) {
       actualXKey = Object.keys(data[0])[0];
    }
    
    // If still no xKey, use config key (will result in "undefined" grouping)
    actualXKey = actualXKey || config.xAxisKey;
    
    // For BoxPlot, we need RAW arrays per category, not sum.
    if (config.type === 'boxplot') {
        const groups: Record<string, number[]> = {};
        const yKey = config.dataKeys[0];
        const actualYKey = resolveDataKey(yKey, data[0]);

        data.forEach(row => {
             const xValue = String(row[actualXKey]);
             const yValue = actualYKey ? Number(row[actualYKey]) : 0;
             if (!isNaN(yValue)) {
                 if (!groups[xValue]) groups[xValue] = [];
                 groups[xValue].push(yValue);
             }
        });

        return Object.keys(groups).map(k => {
            const stats = calculateBoxPlotStats(groups[k]);
            return {
                [config.xAxisKey]: k,
                ...stats,
                // For Range Bar (Q1 to Q3)
                boxRange: [stats.q1, stats.q3],
                // For Whiskers (Min to Max) - we might use ErrorBar or just separate points
                min: stats.min,
                max: stats.max,
                median: stats.median
            };
        });
    }

    const dataKeyMapping: Record<string, string> = {};
    config.dataKeys.forEach(key => {
        const actual = resolveDataKey(key, data[0]);
        if (actual) dataKeyMapping[key] = actual;
    });

    // Group by xAxisKey
    const groupedData: Record<string, any> = {};
    
    data.forEach(row => {
      const xValue = String(row[actualXKey]);
      
      if (!groupedData[xValue]) {
        groupedData[xValue] = { ...row };
        // Ensure the x-axis key used by the chart exists in the data object
        groupedData[xValue][config.xAxisKey] = xValue;

        config.dataKeys.forEach(key => {
           const sourceKey = dataKeyMapping[key];
           const val = sourceKey ? Number(row[sourceKey]) : 0;
           groupedData[xValue][key] = isNaN(val) ? 0 : val;
        });
      } else {
        config.dataKeys.forEach(key => {
          const sourceKey = dataKeyMapping[key];
          if (sourceKey) {
            const val = Number(row[sourceKey]);
            if (!isNaN(val)) {
              groupedData[xValue][key] += val;
            }
          }
        });
      }
    });

    // Sort if funnel for better visual
    if (config.type === 'funnel') {
        return Object.values(groupedData).sort((a: any, b: any) => {
            const key = config.dataKeys[0];
            return (b[key] || 0) - (a[key] || 0);
        });
    }

    return Object.values(groupedData);
  }, [data, config]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }
  
  const missingKeys = config.dataKeys.filter(key => processedData.length > 0 && !(key in processedData[0]) && config.type !== 'boxplot');
  
  if (missingKeys.length > 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm p-4 text-center">
            <AlertCircle className="w-6 h-6 mb-2 text-amber-500" />
            <p className="font-medium text-slate-600">无法显示图表</p>
            <p className="text-xs mt-1">数据中未找到以下字段，请检查数据源或重新生成:</p>
            <div className="flex flex-wrap justify-center gap-1 mt-2">
                {missingKeys.map(k => (
                    <span key={k} className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-xs">{k}</span>
                ))}
            </div>
        </div>
      );
  }

  // --- Specialized Renderers for Non-Recharts Components ---
  
  if (config.type === 'map') {
    return (
      <div className="w-full h-full min-h-0 relative">
         <ChinaMapChart 
            data={processedData} 
            mapDataKey={config.xAxisKey} 
            valueKey={config.dataKeys[0]} 
            variant={config.variant}
          />
      </div>
    );
  }

  // --- Recharts Rendering Logic ---

  const renderRechartsContent = () => {
    // Style Variants Logic
    const variant = config.variant || 'default';

    switch (config.type) {
      case 'bar':
        const isHorizontal = variant === 'horizontal';
        const isStacked = variant === 'stacked';
        
        return (
          <BarChart 
            data={processedData} 
            margin={{ top: 10, right: 10, bottom: 0, left: isHorizontal ? 20 : -15 }}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={!isHorizontal} horizontal={true} />
            
            {isHorizontal ? (
              <>
                 <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                 <YAxis dataKey={config.xAxisKey} type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
              </>
            ) : (
              <>
                 <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                 <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              </>
            )}
            
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {config.dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={COLORS[index % COLORS.length]} 
                radius={isStacked ? [0,0,0,0] : (isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0])} 
                isAnimationActive={false}
                stackId={isStacked ? 'a' : undefined}
              />
            ))}
          </BarChart>
        );
      case 'line':
        let lineType: 'monotone' | 'linear' | 'step' = 'monotone';
        if (variant === 'linear') lineType = 'linear';
        if (variant === 'step') lineType = 'step';

        return (
          <LineChart data={processedData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {config.dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type={lineType}
                dataKey={key} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={2}
                dot={variant !== 'step' ? { r: 3, fill: COLORS[index % COLORS.length], strokeWidth: 0 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        );
      case 'area':
         const isAreaStacked = variant === 'stacked';
         return (
          <AreaChart data={processedData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {config.dataKeys.map((key, index) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={COLORS[index % COLORS.length]} 
                fill={COLORS[index % COLORS.length]} 
                fillOpacity={isAreaStacked ? 0.6 : 0.2}
                stackId={isAreaStacked ? '1' : undefined}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        );
      case 'pie':
        const dataKey = config.dataKeys[0];
        const innerRadius = (variant === 'pie') ? '0%' : '60%';

        return (
          <PieChart>
             <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
             <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Pie
              data={processedData}
              dataKey={dataKey}
              nameKey={config.xAxisKey}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="80%"
              paddingAngle={2}
              fill="#8884d8"
              isAnimationActive={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
              }}
              labelLine={false}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={processedData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey={config.xAxisKey} tick={{ fill: '#64748b', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {config.dataKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            ))}
          </RadarChart>
        );
      case 'scatter':
        return (
           <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey={config.xAxisKey} 
              type="category" 
              name={config.xAxisKey} 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              type="number" 
              dataKey={config.dataKeys[0]} 
              name={config.dataKeys[0]} 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {config.dataKeys.map((key, index) => (
               <Scatter 
                 key={key} 
                 name={key} 
                 data={processedData} 
                 fill={COLORS[index % COLORS.length]} 
                 isAnimationActive={false}
                 line={false}
               />
            ))}
          </ScatterChart>
        );
      case 'funnel':
        return (
           <ResponsiveContainer width="100%" height="100%">
             <FunnelChart>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Funnel
                  dataKey={config.dataKeys[0]}
                  data={processedData}
                  isAnimationActive={false}
                  nameKey={config.xAxisKey}
                >
                  <LabelList position="right" fill="#4b5563" stroke="none" dataKey={config.xAxisKey} />
                  {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Funnel>
             </FunnelChart>
           </ResponsiveContainer>
        );
      case 'gauge':
        // Simulating a Gauge with a half Pie Chart
        const val = processedData[0]?.[config.dataKeys[0]] || 0;
        // Assume default max 100 for gauge if not derivable, or sum of all if multiple?
        // Let's use a standard 0-100 assumption or find max.
        const gaugeMax = 100; // Simplified assumption for Gauge
        const gaugeData = [
          { name: 'Value', value: Math.min(val, gaugeMax), fill: COLORS[0] },
          { name: 'Remaining', value: Math.max(0, gaugeMax - val), fill: '#e2e8f0' }
        ];
        
        return (
           <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={0}
                dataKey="value"
                isAnimationActive={false}
              >
                {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-slate-700">
                {val}
              </text>
              <text x="50%" y="75%" textAnchor="middle" className="text-xs fill-slate-400">
                {config.xAxisKey}
              </text>
           </PieChart>
        );
      case 'boxplot':
        // Using a Composed Chart to simulate Box Plot
        // Bar acts as the "Body" (Range from Q1 to Q3)
        // We use ErrorBars or lines for whiskers. 
        // Recharts doesn't have native BoxPlot, so this is a simplification using a "Floating Bar".
        return (
           <ComposedChart data={processedData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              
              {/* Range Bar for Q1 to Q3 (The Box) */}
              <Bar dataKey="boxRange" fill="#8884d8" radius={[2, 2, 2, 2]} barSize={40} isAnimationActive={false}>
                {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>

              {/* Median Line - simulated with line chart? No, easier to use custom shape or just leave it as range for now. */}
              {/* Adding "Min" and "Max" points to give an idea of spread */}
              <Scatter dataKey="min" fill="#ff0000" shape="wye" name="Min" />
              <Scatter dataKey="max" fill="#ff0000" shape="wye" name="Max" />
              <Scatter dataKey="median" fill="#000000" shape="cross" name="Median" />
              
           </ComposedChart>
        );
      case 'custom':
        // Dynamic ComposedChart based on customSpec
        if (!config.customSpec) return null;
        
        const { series, referenceLines, yAxisLeft, yAxisRight } = config.customSpec;
        const hasRightAxis = series.some(s => s.yAxisId === 'right');

        return (
          <ComposedChart data={processedData} margin={{ top: 10, right: hasRightAxis ? 0 : 10, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
            <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            
            <YAxis 
              yAxisId="left" 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              label={yAxisLeft?.label ? { value: yAxisLeft.label, angle: -90, position: 'insideLeft' } : undefined}
            />
            
            {hasRightAxis && (
               <YAxis 
                 yAxisId="right" 
                 orientation="right" 
                 stroke="#94a3b8" 
                 fontSize={11} 
                 tickLine={false} 
                 axisLine={false}
                 label={yAxisRight?.label ? { value: yAxisRight.label, angle: 90, position: 'insideRight' } : undefined}
               />
            )}
            
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            
            {series.map((s, idx) => {
               // Resolve dataKey from the index
               const key = config.dataKeys[s.dataKeyIndex];
               if (!key) return null;

               const commonProps = {
                 key: `${key}-${idx}`,
                 dataKey: key,
                 name: s.name || key,
                 stroke: s.color || COLORS[idx % COLORS.length],
                 fill: s.color || COLORS[idx % COLORS.length],
                 yAxisId: s.yAxisId || 'left',
                 isAnimationActive: false
               };

               if (s.type === 'bar') {
                 return <Bar {...commonProps} stackId={s.stackId} radius={[4, 4, 0, 0]} />;
               } else if (s.type === 'line') {
                 return <Line {...commonProps} type="monotone" strokeWidth={2} dot={{ r: 3 }} />;
               } else if (s.type === 'area') {
                 return <Area {...commonProps} type="monotone" fillOpacity={0.3} stackId={s.stackId} />;
               } else if (s.type === 'scatter') {
                 return <Scatter {...commonProps} />;
               }
               return null;
            })}

            {referenceLines?.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                yAxisId="left" 
                label={{ value: ref.label, fill: ref.color || 'red', fontSize: 10 }} 
                stroke={ref.color || 'red'} 
                strokeDasharray="3 3" 
              />
            ))}
          </ComposedChart>
        );
      default:
        return null;
    }
  };

  const chartContent = renderRechartsContent();

  if (!chartContent) {
     return <div className="flex items-center justify-center h-full text-slate-400">Unsupported chart type</div>;
  }

  return (
    <div className="w-full h-full flex flex-col relative group">
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
          {chartContent}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
