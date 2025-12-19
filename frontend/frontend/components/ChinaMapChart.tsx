
import React, { useMemo, useEffect, useState } from 'react';
import { Loader2, AlertCircle, Map as MapIcon, Star } from 'lucide-react';

interface ChinaMapChartProps {
  data: any[];
  mapDataKey: string; // The province name key
  valueKey: string;   // The value key
  variant?: string;   // 'default' (geo) or 'grid'
}

// --- Grid Map Data (Fallback/Variant) ---
const PROVINCE_GRID = [
  { name: '黑龙江', x: 8, y: 0 },
  { name: '吉林', x: 8, y: 1 },
  { name: '内蒙古', x: 5, y: 1, w: 2 },
  { name: '辽宁', x: 8, y: 2 },
  { name: '北京', x: 7, y: 2 },
  { name: '天津', x: 7, y: 3 },
  { name: '河北', x: 6, y: 3 },
  { name: '山西', x: 5, y: 3 },
  { name: '山东', x: 7, y: 4 },
  { name: '河南', x: 6, y: 4 },
  { name: '陕西', x: 5, y: 4 },
  { name: '宁夏', x: 4, y: 4 },
  { name: '甘肃', x: 3, y: 4 },
  { name: '青海', x: 2, y: 4 },
  { name: '新疆', x: 0, y: 3, w: 2, h: 2 },
  { name: '江苏', x: 8, y: 5 },
  { name: '安徽', x: 7, y: 5 },
  { name: '湖北', x: 6, y: 5 },
  { name: '重庆', x: 5, y: 5 },
  { name: '四川', x: 4, y: 5 },
  { name: '西藏', x: 0, y: 5, w: 3, h: 2 },
  { name: '上海', x: 9, y: 5 },
  { name: '浙江', x: 8, y: 6 },
  { name: '江西', x: 7, y: 6 },
  { name: '湖南', x: 6, y: 6 },
  { name: '贵州', x: 5, y: 6 },
  { name: '云南', x: 4, y: 7 },
  { name: '福建', x: 8, y: 7 },
  { name: '广东', x: 7, y: 7 },
  { name: '广西', x: 6, y: 7 },
  { name: '海南', x: 7, y: 9 },
  { name: '台湾', x: 9, y: 7 },
  { name: '香港', x: 7, y: 8, sm: true },
  { name: '澳门', x: 6, y: 8, sm: true },
];

// --- Simple Projection Logic for Geo Map ---
// Rough bounds for China
const MIN_LON = 73;
const MAX_LON = 136;
const MIN_LAT = 18;
const MAX_LAT = 54;

const project = (lon: number, lat: number, width: number, height: number, padding: number = 20) => {
  const lonRange = MAX_LON - MIN_LON;
  const latRange = MAX_LAT - MIN_LAT;
  
  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;

  const x = padding + ((lon - MIN_LON) / lonRange) * contentWidth;
  // Latitude is inverted in SVG (y goes down)
  const y = height - padding - ((lat - MIN_LAT) / latRange) * contentHeight;
  
  return [x, y];
};

export const ChinaMapChart: React.FC<ChinaMapChartProps> = ({ data, mapDataKey, valueKey, variant = 'default' }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Load GeoJSON on mount if using default variant
  useEffect(() => {
    if (variant === 'grid') return;
    if (geoData) return; // Already loaded

    setLoading(true);
    // Reliable source for China GeoJSON (Aliyun DataV)
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load map data');
        return res.json();
      })
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("GeoJSON load failed", err);
        setError(true);
        setLoading(false);
      });
  }, [variant]);

  const processedData = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      const key = item[mapDataKey];
      // Normalize: remove suffix
      const normalizedKey = typeof key === 'string' 
        ? key.replace(/(省|市|自治区|维吾尔|壮族|回族|特别行政区)/g, '').trim()
        : String(key);
      map.set(normalizedKey, item[valueKey] || 0);
    });
    return map;
  }, [data, mapDataKey, valueKey]);

  // Calculations for Color Scale
  const values = Array.from(processedData.values()) as number[];
  const maxVal = Math.max(...values, 100);
  const minVal = Math.min(...values, 0);

  // Helper to identify top N provinces for Stars
  const topProvinces = useMemo(() => {
     return [...data]
       .sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0))
       .slice(0, 5)
       .map(item => {
          const key = item[mapDataKey];
          return typeof key === 'string' ? key.replace(/(省|市|自治区|维吾尔|壮族|回族|特别行政区)/g, '').trim() : String(key);
       });
  }, [data, mapDataKey, valueKey]);

  const getColor = (val: number | undefined, isGeo = false) => {
    if (val === undefined) return isGeo ? '#e2e8f0' : '#f1f5f9'; // Default gray for empty
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    
    // Unified Darker Blue Scale for both Geo and Grid
    // Base: Blue-900 (#1e3a8a)
    // Opacity range: 0.2 to 1.0 (Rich depth)
    const opacity = 0.2 + ratio * 0.8;
    return `rgba(30, 58, 138, ${opacity})`; 
  };

  // --- Render: Grid Variant (Fallback or explicit choice) ---
  if (variant === 'grid' || (error && !geoData)) {
    const CELL_SIZE = 40;
    const GAP = 4;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-4 relative">
        {error && (
           <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" /> Map data unavailable, using grid mode.
           </div>
        )}
        <div className="relative" style={{ width: 10 * (CELL_SIZE + GAP), height: 10 * (CELL_SIZE + GAP) }}>
          {PROVINCE_GRID.map((p) => {
            const val = processedData.get(p.name);
            const color = getColor(val, false);
            const w = (p.w || 1) * CELL_SIZE + ((p.w || 1) - 1) * GAP;
            const h = (p.h || 1) * CELL_SIZE + ((p.h || 1) - 1) * GAP;
            const isTop = topProvinces.includes(p.name);
            const isDark = val !== undefined && val > maxVal * 0.4;
            
            return (
              <div
                key={p.name}
                className="absolute flex items-center justify-center rounded-md border border-white/20 text-xs font-medium hover:z-10 hover:shadow-lg transition-all cursor-default group hover:scale-[1.02]"
                style={{
                  left: p.x * (CELL_SIZE + GAP),
                  top: p.y * (CELL_SIZE + GAP),
                  width: w,
                  height: h,
                  backgroundColor: color,
                  color: isDark ? 'white' : '#334155'
                }}
              >
                <span className="scale-90 z-10 relative">{p.name}</span>
                {isTop && (
                   <Star className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-yellow-400 fill-yellow-400 opacity-80" />
                )}
                
                {/* Tooltip - Centered relative to the cell */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 whitespace-nowrap bg-slate-900 text-white text-xs px-2 py-1.5 rounded shadow-xl pointer-events-none">
                  <div className="font-bold text-center">{p.name}</div>
                  <div className="text-center text-blue-200">{val !== undefined ? val : 'N/A'}</div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            );
          })}
        </div>
        <Legend min={minVal} max={maxVal} />
      </div>
    );
  }

  // --- Render: Loading State ---
  if (loading || !geoData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
        <span className="text-xs">Loading Map Data...</span>
      </div>
    );
  }

  // --- Render: Geographic SVG Map ---
  const WIDTH = 800;
  const HEIGHT = 600;

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-50/50 rounded-xl">
       <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full max-h-[90%] drop-shadow-xl filter">
          {/* Defs for gradients or effects if needed */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {geoData.features.map((feature: any, idx: number) => {
             const name = feature.properties.name;
             // Normalize name for matching
             const matchName = name.replace(/(省|市|自治区|维吾尔|壮族|回族|特别行政区)/g, '').trim();
             const val = processedData.get(matchName);
             const color = getColor(val, true);
             const isTop = topProvinces.includes(matchName);

             // Process Geometry to SVG Path d
             let d = '';
             const geometry = feature.geometry;
             
             const drawPolygon = (coords: any[]) => {
                let path = '';
                coords.forEach((ring: any[], i) => {
                   let ringPath = '';
                   ring.forEach((point: any, j) => {
                      const [x, y] = project(point[0], point[1], WIDTH, HEIGHT);
                      ringPath += `${j === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                   });
                   ringPath += 'Z';
                   path += ringPath;
                });
                return path;
             };

             if (geometry.type === 'Polygon') {
                d = drawPolygon(geometry.coordinates);
             } else if (geometry.type === 'MultiPolygon') {
                geometry.coordinates.forEach((polygon: any) => {
                   d += drawPolygon(polygon);
                });
             }

             // Calculate roughly center for label/star
             const center = feature.properties.center 
                ? project(feature.properties.center[0], feature.properties.center[1], WIDTH, HEIGHT)
                : (feature.properties.centroid 
                    ? project(feature.properties.centroid[0], feature.properties.centroid[1], WIDTH, HEIGHT) 
                    : [0, 0]); // Fallback, though DataV usually has center

             return (
               <g key={idx} className="group transition-opacity duration-300">
                 <path
                   d={d}
                   fill={color}
                   stroke="#94a3b8" 
                   strokeWidth="0.5"
                   strokeLinejoin="round"
                   className="transition-colors duration-200 cursor-pointer hover:opacity-80"
                 >
                   <title>{name}: {val !== undefined ? val : 'N/A'}</title>
                 </path>
                 
                 {/* Province Label (Only show for larger areas or if spacing allows, simple check logic often omitted for brevity, showing all here) */}
                 {/* Only show label if it's main province or has value */}
                 {center[0] !== 0 && (
                    <text 
                      x={center[0]} 
                      y={center[1]} 
                      textAnchor="middle" 
                      alignmentBaseline="middle"
                      className="text-[8px] fill-slate-700 font-medium pointer-events-none opacity-60 group-hover:opacity-100 group-hover:font-bold group-hover:fill-slate-900 transition-all select-none"
                      style={{ fontSize: '8px' }}
                    >
                       {matchName}
                    </text>
                 )}

                 {/* Star for Top Values */}
                 {isTop && center[0] !== 0 && (
                    <g transform={`translate(${center[0] - 4}, ${center[1] - 12})`}>
                       <path 
                         d="M5.5 0L7 3H11L8 5.5L9 9L5.5 7L2 9L3 5.5L0 3H4L5.5 0Z" 
                         className="fill-yellow-400 stroke-yellow-600 stroke-[0.5] animate-pulse" 
                       />
                    </g>
                 )}
               </g>
             );
          })}
       </svg>
       
       <Legend min={minVal} max={maxVal} />
    </div>
  );
};

// Reusable Legend Component
const Legend = ({ min, max }: { min: number, max: number }) => (
  <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-white/90 backdrop-blur-sm p-3 rounded-lg text-xs border border-slate-200 shadow-sm z-10">
      <div className="flex items-center gap-2 mb-1">
         <span className="font-semibold text-slate-600">数据指标</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(30, 58, 138, 1)' }}></span>
        <span>高 (&gt; {Math.round(max * 0.7)})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(30, 58, 138, 0.6)' }}></span>
        <span>中 ({Math.round(max * 0.3)} - {Math.round(max * 0.7)})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}></span>
        <span>低 (&lt; {Math.round(max * 0.3)})</span>
      </div>
  </div>
);
