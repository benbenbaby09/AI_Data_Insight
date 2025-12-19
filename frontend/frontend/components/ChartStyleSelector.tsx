
import React from 'react';
import { BarChart3, Layers, LayoutList, Activity, Circle, PieChart, Map, LayoutGrid, Filter, Gauge, BoxSelect } from 'lucide-react';
import { ChartConfig } from '../types';

interface ChartStyleSelectorProps {
  type: ChartConfig['type'];
  value?: string;
  onChange: (variant: string) => void;
}

export const ChartStyleSelector: React.FC<ChartStyleSelectorProps> = ({ type, value, onChange }) => {
  const getStyles = () => {
     switch (type) {
       case 'bar':
         return [
           { id: 'default', label: '默认', icon: BarChart3 },
           { id: 'stacked', label: '堆叠', icon: Layers },
           { id: 'horizontal', label: '横向', icon: LayoutList }
         ];
       case 'line':
         return [
           { id: 'monotone', label: '平滑', icon: Activity },
           { id: 'linear', label: '折线', icon: Activity },
           { id: 'step', label: '阶梯', icon: LayoutList }
         ];
       case 'area':
         return [
           { id: 'default', label: '默认', icon: Layers },
           { id: 'stacked', label: '堆叠', icon: Layers }
         ];
        case 'pie':
         return [
           { id: 'donut', label: '环形', icon: Circle },
           { id: 'pie', label: '饼状', icon: PieChart }
         ];
        case 'map':
         return [
           { id: 'default', label: '热力图', icon: Map },
           { id: 'grid', label: '网格图', icon: LayoutGrid }
         ];
        case 'funnel':
         return [
           { id: 'default', label: '默认', icon: Filter }
         ];
        case 'gauge':
         return [
           { id: 'default', label: '默认', icon: Gauge }
         ];
        case 'boxplot':
         return [
           { id: 'default', label: '默认', icon: BoxSelect }
         ];
       default:
         return [];
     }
  };

  const styles = getStyles();

  if (styles.length === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
      {styles.map((style) => {
        const Icon = style.icon;
        
        // Determine active state
        let active = false;
        if (value) {
            active = value === style.id;
        } else {
            // Default fallbacks matching ChartRenderer logic
            if (type === 'line' && style.id === 'monotone') active = true;
            else if (type === 'pie' && style.id === 'donut') active = true;
            else if (type === 'map' && style.id === 'default') active = true;
            else if (type !== 'line' && type !== 'pie' && type !== 'map' && style.id === 'default') active = true;
        }

        return (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              active 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
            title={style.label}
          >
            <Icon className="w-3.5 h-3.5" />
            {style.label}
          </button>
        );
      })}
    </div>
  );
};
