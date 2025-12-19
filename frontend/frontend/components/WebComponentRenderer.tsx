
import React, { useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as Recharts from 'recharts';
import PropTypes from 'prop-types';

interface WebComponentRendererProps {
  code: string;
  config?: any;
  data?: any; // TableData or processed rows
  onConfigChange?: (newConfig: any) => void;
  readOnly?: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Class-based Error Boundary is required to catch errors during rendering (including hooks)
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  
  // Explicitly declare props to satisfy linter if base class inference fails
  props!: Readonly<ErrorBoundaryProps>;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WebComponent Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error!);
    }
    return this.props.children;
  }
}

export const WebComponentRenderer: React.FC<WebComponentRendererProps> = ({ code, config, data, onConfigChange, readOnly }) => {
  const [RenderedComponent, setRenderedComponent] = useState<React.ComponentType<any> | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Prepare props to pass to the component
  const componentProps = React.useMemo(() => {
     const baseProps = { config, onConfigChange, readOnly };
     
     // Smart data adaptation
    if (data && typeof data === 'object') {
       if ('rows' in data && Array.isArray(data.rows)) {
          // It's likely TableData
          // We create a hybrid object that works as both Array (for charts) and Object with metadata (for tables)
          const rowsWithMeta = [...data.rows];
          // Attach metadata to the array instance
          Object.assign(rowsWithMeta, {
            columns: data.columns || [], // Ensure columns is at least an empty array
            table: data,
            ...data // copy other properties like id, name
          });

          return {
             ...baseProps,
             table: data,
             data: rowsWithMeta, // Array with attached metadata
             rows: data.rows,
             columns: data.columns || [] // Ensure columns is at least an empty array
          };
       }
    }
     
     // Fallback / Pass-through
     // If data is undefined, provide sample data so the component doesn't look broken
     if (data === undefined || data === null) {
        // Default Mock Data for preview purposes
        const sampleColumns = [
            { name: 'id', type: 'number' }, 
            { name: 'name', type: 'string' }, 
            { name: 'category', type: 'string' }, 
            { name: 'value', type: 'number' },
            { name: 'status', type: 'string' }
        ];
        const sampleRows = [
            { id: 1, name: '示例项目 A', category: '类别 1', value: 85, status: '运行中' },
            { id: 2, name: '示例项目 B', category: '类别 2', value: 42, status: '等待中' },
            { id: 3, name: '示例项目 C', category: '类别 1', value: 73, status: '已完成' },
            { id: 4, name: '示例项目 D', category: '类别 3', value: 55, status: '异常' },
            { id: 5, name: '示例项目 E', category: '类别 2', value: 91, status: '运行中' },
        ];
        
        const safeData = [...sampleRows];
        Object.assign(safeData, { columns: sampleColumns, rows: sampleRows, table: { rows: sampleRows, columns: sampleColumns } });
        
        return { 
           ...baseProps, 
           data: safeData,
           rows: sampleRows,
           columns: sampleColumns,
           table: { rows: sampleRows, columns: sampleColumns }
        };
     }

     return { ...baseProps, data };
  }, [config, data, onConfigChange, readOnly]);

  useEffect(() => {
    let active = true;
    
    const compile = () => {
      try {
        setCompileError(null);
        setRenderedComponent(null); 

        // 1. Check for Babel
        const Babel = (window as any).Babel;
        if (!Babel) {
            throw new Error("Babel 未加载，无法预览组件。请检查网络连接。");
        }

        // 2. Pre-process code
        let sanitizedCode = code
            .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
            // Transform "export default" into "return" to support definition style
            .replace(/export\s+default\s+/g, 'return ')
            .trim();

        if (!sanitizedCode) return;

        // 3. Heuristic: Determine if code is a "Component Definition" (returns a function) or "Component Body" (hooks + JSX)
        // Check for explicit return of a component (identifier or function/class expression)
        const isDefinition = /return\s+(?:function\s+|class\s+|[A-Z_][a-zA-Z0-9_]*)/.test(sanitizedCode);
        
        let wrapperSource;

        if (isDefinition) {
            // It's a definition: execute it to get the component function.
            // We expect the code to define a component and return it.
            let componentName = 'DynamicComponent';
            const nameMatch = sanitizedCode.match(/(?:const|function)\s+([A-Z]\w+)/);
            if (nameMatch) {
                componentName = nameMatch[1];
            }

            wrapperSource = `
              (function(React, LucideIcons, Recharts, PropTypes) {
                const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = React;
                const Lucide = LucideIcons; 
                const { 
                  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
                  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
                  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
                  Scatter, ScatterChart, ComposedChart, Cell, ReferenceLine
                } = Recharts;

                // User Code (Definition Style)
                ${sanitizedCode}
                
                // Return found component if the code didn't return it (though regex check implies it did)
                if (typeof ${componentName} !== 'undefined') {
                    return ${componentName};
                }
                return null;
              })
            `;
        } else {
            // It's a body: Wrap it in a component function.
            // This ensures hooks like useState are called INSIDE a component.
            
            // Check for variable conflicts in user code to avoid "Identifier already declared" errors
            const hasVar = (name: string) => new RegExp(`(?:const|let|var|function|class)\\s+${name}\\b`).test(sanitizedCode);
            
            const safeDestructure = [
                'config', 'onConfigChange', 'readOnly',
                !hasVar('data') && 'data',
                !hasVar('rows') && 'rows',
                !hasVar('columns') && 'columns',
                !hasVar('table') && 'table'
            ].filter(Boolean).join(', ');

            wrapperSource = `
              (function(React, LucideIcons, Recharts, PropTypes) {
                const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = React;
                const Lucide = LucideIcons; 
                const { 
                  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
                  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
                  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
                  Scatter, ScatterChart, ComposedChart, Cell, ReferenceLine
                } = Recharts;

                // Create a wrapper component that executes the user code as its body
                const WrappedComponent = (props) => {
                   // User Code (Body Style)
                   // We inject common props into local scope for convenience
                   // safely destructuring only variables that are not redeclared in user code
                   const { ${safeDestructure} } = props;
                   
                   ${sanitizedCode}
                };
                return WrappedComponent;
              })
            `;
        }
        
        // 4. Transpile using Babel (handling JSX)
        // @ts-ignore
        const transpiled = Babel.transform(wrapperSource, { 
           presets: ['react'],
           filename: 'dynamic-renderer.js'
        }).code;
        
        // 5. Execute to get the Component Factory
        // eslint-disable-next-line no-eval
        const createComponent = eval(transpiled);
        
        if (typeof createComponent !== 'function') {
           throw new Error("Transpilation failed to produce a valid function.");
        }

        // 6. Create the actual component
        const UserComponentFn = createComponent(React, LucideIcons, Recharts, PropTypes);
        
        if (!UserComponentFn) {
            throw new Error(`Could not resolve component. Ensure your code defines and returns a React component.`);
        }
        
        if (active) {
            setRenderedComponent(() => UserComponentFn);
        }

      } catch (e: any) {
        if (active) {
            console.error("Compilation Error:", e);
            setCompileError(e.message || "Unknown error during compilation");
        }
      }
    };

    compile();
    
    return () => { active = false; };
  }, [code]);

  if (compileError) {
    return (
       <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg w-full h-full overflow-auto text-xs font-mono">
          <h4 className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> 编译错误</h4>
          <pre className="whitespace-pre-wrap">{compileError}</pre>
       </div>
    );
  }

  if (!RenderedComponent) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <span className="text-xs">加载组件预览...</span>
        </div>
     );
  }

  return (
      <div className="w-full h-full overflow-auto p-2 relative">
         <ErrorBoundary fallback={(err) => (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg w-full h-full overflow-auto text-xs">
                <h4 className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> 运行时错误</h4>
                <p>组件在渲染过程中发生崩溃。</p>
                <pre className="mt-2 p-2 bg-amber-100 rounded text-amber-900 font-mono whitespace-pre-wrap">{err.message}</pre>
            </div>
         )}>
            <RenderedComponent {...componentProps} />
         </ErrorBoundary>
      </div>
  );
};
