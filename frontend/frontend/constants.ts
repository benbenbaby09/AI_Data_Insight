
import { TableData, WebComponentTemplate } from './types';

export const CHART_TYPES_METADATA = [
  { 
    type: 'bar', 
    label: '柱状图', 
    description: '用于对比不同类别的数值大小，适合分类数据比较。',
    detailedDescription: '柱状图通过垂直或水平的柱子长度来表示数据大小，非常适合展示离散类别之间的比较。支持堆叠、分组等多种形式。',
    dataRequirements: '至少包含 1 个分类字段（维度）和 1 个数值字段（度量）。',
    exampleStructure: [
      { category: '产品A', value: 120 },
      { category: '产品B', value: 200 },
      { category: '产品C', value: 150 }
    ]
  },
  { 
    type: 'line', 
    label: '折线图', 
    description: '展示数据随时间变化的趋势，适合连续数据分析。',
    detailedDescription: '折线图通过连接数据点的线段来展示数据的变化趋势，特别适合展示时间序列数据，如销售额随日期的变化。',
    dataRequirements: '需要 1 个时间或有序分类字段（X轴）和 1 个数值字段（Y轴）。',
    exampleStructure: [
      { date: '2024-01', value: 100 },
      { date: '2024-02', value: 120 },
      { date: '2024-03', value: 110 }
    ]
  },
  { 
    type: 'pie', 
    label: '饼图', 
    description: '显示各部分占整体的比例，适合展示占比关系。',
    detailedDescription: '饼图通过扇形的弧度来表示各部分在整体中的占比，适合展示数据的构成比例。',
    dataRequirements: '需要 1 个分类字段（维度）和 1 个数值字段（度量）。建议分类数量不超过 8 个。',
    exampleStructure: [
      { type: '直接访问', count: 335 },
      { type: '邮件营销', count: 310 },
      { type: '联盟广告', count: 234 }
    ]
  },
  { 
    type: 'area', 
    label: '面积图', 
    description: '强调数量随时间变化的程度，亦可展示部分与整体关系。',
    detailedDescription: '面积图在折线图的基础上填充了坐标轴与线之间的区域，强调数据随时间变化的累积量或趋势。',
    dataRequirements: '需要 1 个时间或有序分类字段和 1 个数值字段。',
    exampleStructure: [
      { date: '2024-01', value: 100 },
      { date: '2024-02', value: 120 },
      { date: '2024-03', value: 130 }
    ]
  },
  { 
    type: 'radar', 
    label: '雷达图', 
    description: '对比多个变量的数据指标，适合多维能力评估。',
    detailedDescription: '雷达图将多个维度的数据映射到极坐标系上，适合展示多维数据的综合表现，常用于能力评估或画像分析。',
    dataRequirements: '需要 1 个维度字段（用于多边形顶点）和 1 个或多个数值字段（用于指标值）。',
    exampleStructure: [
      { subject: '数学', score: 120 },
      { subject: '语文', score: 110 },
      { subject: '英语', score: 130 }
    ]
  },
  { 
    type: 'scatter', 
    label: '散点图', 
    description: '分析两个变量之间的相关性与分布模式。',
    detailedDescription: '散点图使用笛卡尔坐标系中的点来表示两个变量的值，用于观察变量之间的相关性、聚类模式或异常值。',
    dataRequirements: '需要 2 个数值字段分别作为 X 轴和 Y 轴，可选 1 个分类字段用于区分颜色。',
    exampleStructure: [
      { height: 170, weight: 60, gender: 'Male' },
      { height: 165, weight: 55, gender: 'Female' },
      { height: 180, weight: 75, gender: 'Male' }
    ]
  },
  { 
    type: 'map', 
    label: '中国地图', 
    description: '基于地理位置的数据分布展示，适合区域数据分析。',
    detailedDescription: '地图用于展示与地理位置相关的数据，通过颜色深浅或气泡大小来表示各区域的数据差异。',
    dataRequirements: '需要 1 个地理位置字段（如省份名称）和 1 个数值字段。',
    exampleStructure: [
      { province: '北京', value: 100 },
      { province: '上海', value: 80 },
      { province: '广东', value: 120 }
    ]
  },
  { 
    type: 'funnel', 
    label: '漏斗图', 
    description: '展示流程各阶段的转化率或流失情况，适合销售或转化分析。',
    detailedDescription: '漏斗图用于展示业务流程中各个环节的数据量，直观地反映转化率和流失情况。',
    dataRequirements: '需要 1 个流程阶段字段和 1 个数值字段（通常是按阶段顺序排列）。',
    exampleStructure: [
      { stage: '浏览', count: 1000 },
      { stage: '加购', count: 400 },
      { stage: '下单', count: 200 }
    ]
  },
  { 
    type: 'gauge', 
    label: '仪表盘', 
    description: '展示核心指标的当前值与目标值的达成情况，适合KPI监控。',
    detailedDescription: '仪表盘模拟物理仪表盘，直观地展示某个核心指标的当前值及其在预设范围内的位置。',
    dataRequirements: '通常需要 1 个单一的数值（当前值），可配置最小值、最大值和目标值。',
    exampleStructure: [
      { name: '完成率', value: 75 }
    ]
  },
  { 
    type: 'boxplot', 
    label: '箱形图', 
    description: '展示一组数据的分布特征（中位数、四分位数、极值），适合统计分析。',
    detailedDescription: '箱形图用于展示数据的分布情况，包含最小值、第一四分位数、中位数、第三四分位数和最大值，可发现异常值。',
    dataRequirements: '需要 1 个分类字段（可选）和 1 个数值字段（用于计算统计量）。',
    exampleStructure: [
      { category: 'A班', score: 85 },
      { category: 'A班', score: 92 },
      { category: 'B班', score: 78 },
      { category: 'B班', score: 88 }
    ]
  },
] as const;

export const BASIC_WEB_COMPONENTS: WebComponentTemplate[] = [
  {
    id: -1,
    name: '指标卡片',
    description: '展示关键业务指标，包含标题、数值和趋势图标。',
    code: `const StatCard = () => {
  // 定义数据
  const title = "总销售额";
  const value = "¥ 128,430";
  const trend = "+12.5%";
  const isPositive = true;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-500 text-sm font-medium">{title}</span>
        <div className={\`p-2 rounded-lg \${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}\`}>
          {isPositive ? <Lucide.TrendingUp className="w-4 h-4" /> : <Lucide.TrendingDown className="w-4 h-4" />}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
        <p className={\`text-xs font-medium \${isPositive ? 'text-emerald-600' : 'text-red-600'}\`}>
          较上月 {trend}
        </p>
      </div>
    </div>
  );
};
return StatCard;`,
    createdAt: 0
  },
  {
    id: -2,
    name: '通用信息卡片',
    description: '标准的标题+内容卡片布局，适用于展示说明文字。',
    code: `const InfoCard = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <Lucide.Info className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-slate-800">关于项目</h3>
      </div>
      <div className="p-6 text-slate-600 text-sm leading-relaxed flex-1">
        <p className="mb-4">
          这是一个通用的信息展示卡片组件。您可以使用它来放置任何说明性文本、公告或者业务逻辑解释。
        </p>
        <p>
          组件采用 Flex 布局，高度自适应容器，并带有优雅的边框和阴影效果。
        </p>
      </div>
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
          了解更多 &rarr;
        </button>
      </div>
    </div>
  );
};
return InfoCard;`,
    createdAt: 0
  },
  {
    id: -3,
    name: '基础数据表格',
    description: '支持点击表头排序的表格组件，用于展示结构化数据。',
    code: `const SimpleTable = () => {
  // 模拟数据
  const initialRows = [
    { id: 1, name: "服务器 A", status: "运行中", uptime: "99.9%" },
    { id: 2, name: "数据库主节点", status: "维护中", uptime: "98.5%" },
    { id: 3, name: "缓存集群", status: "运行中", uptime: "99.99%" },
    { id: 4, name: "负载均衡", status: "异常", uptime: "85.2%" },
    { id: 5, name: "日志服务", status: "运行中", uptime: "99.5%" },
  ];

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // 排序逻辑
  const sortedRows = useMemo(() => {
    let sortableItems = [...initialRows];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // 简单的百分比数字处理
        if (typeof aVal === 'string' && aVal.includes('%')) {
           aVal = parseFloat(aVal);
           bVal = parseFloat(bVal);
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (colName) => {
     if (sortConfig.key !== colName) return <Lucide.ArrowUpDown className="w-3 h-3 text-slate-300 ml-1" />;
     return sortConfig.direction === 'asc' 
        ? <Lucide.ArrowUp className="w-3 h-3 text-blue-500 ml-1" />
        : <Lucide.ArrowDown className="w-3 h-3 text-blue-500 ml-1" />;
  };

  return (
    <div className="w-full h-full overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white flex flex-col">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-sm flex justify-between items-center">
        <span>系统状态监控</span>
        <span className="text-[10px] text-slate-400 font-normal">点击表头排序</span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
            <tr>
              <th 
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center">
                  服务名称
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                onClick={() => requestSort('status')}
              >
                <div className="flex items-center">
                  状态
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                onClick={() => requestSort('uptime')}
              >
                <div className="flex items-center justify-end">
                  可用性
                  {getSortIcon('uptime')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-700">{row.name}</td>
                <td className="px-4 py-3">
                  <span className={\`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium \${
                    row.status === '运行中' ? 'bg-emerald-100 text-emerald-700' :
                    row.status === '异常' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }\`}>
                    <span className={\`w-1.5 h-1.5 rounded-full \${
                      row.status === '运行中' ? 'bg-emerald-500' :
                      row.status === '异常' ? 'bg-red-500' :
                      'bg-amber-500'
                    }\`}></span>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{row.uptime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
return SimpleTable;`,
    createdAt: 0
  },
  {
    id: 'basic_image_banner',
    name: '图片横幅',
    description: '展示品牌图片或广告横幅，支持上传自定义图片及编辑文本。',
    code: `const ImageBanner = ({ config, onConfigChange, readOnly }) => {
  const params = config?.chartParams || {};
  const image = params.image || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
  const title = params.title || "数据驱动决策";
  const description = params.description || "通过实时数据分析，洞察业务趋势，把握每一个增长机会。";
  const fileInputRef = useRef(null);

  const updateParam = (key, value) => {
    if (onConfigChange && config) {
      onConfigChange({
        ...config,
        chartParams: { ...params, [key]: value }
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateParam('image', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[200px] rounded-xl overflow-hidden group shadow-md">
      <img 
        src={image} 
        alt="Banner" 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent flex flex-col justify-center px-8">
        {readOnly ? (
           <>
             <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
             <p className="text-slate-200 text-sm max-w-md opacity-90">{description}</p>
           </>
        ) : (
           <>
             <input
               type="text"
               value={title}
               onChange={(e) => updateParam('title', e.target.value)}
               className="text-2xl font-bold text-white mb-2 bg-transparent border border-white/20 rounded px-2 outline-none placeholder-slate-400 w-full hover:border-white/50 focus:border-white"
               placeholder="输入标题"
             />
             <textarea
               value={description}
               onChange={(e) => updateParam('description', e.target.value)}
               className="text-slate-200 text-sm max-w-md opacity-90 bg-transparent border border-white/20 rounded p-2 outline-none resize-none placeholder-slate-400 h-20 hover:border-white/50 focus:border-white"
               placeholder="输入描述内容"
             />
           </>
        )}
      </div>

      {!readOnly && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10"
            title="更换背景图片"
          >
            <Lucide.ImagePlus className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};
return ImageBanner;`,
    createdAt: 0
  }
];

// Original Mock Data
const BASE_TABLES: TableData[] = [
  {
    id: 't1',
    name: 'SALES_Q1_2024',
    description: '季度销售数据，包含区域和产品详细信息',
    columns: [
      { name: 'date', type: 'date' },
      { name: 'region', type: 'string' },
      { name: 'province', type: 'string' },
      { name: 'product', type: 'string' },
      { name: 'amount', type: 'number' },
      { name: 'units', type: 'number' },
    ],
    rows: [
      { date: '2024-01-15', region: 'North', province: '北京', product: 'Laptop X1', amount: 15000, units: 10 },
      { date: '2024-01-16', region: 'South', province: '广东', product: 'Laptop X1', amount: 12000, units: 8 },
      { date: '2024-01-20', region: 'East', province: '上海', product: 'Monitor 27 inch', amount: 5000, units: 20 },
      { date: '2024-02-05', region: 'North', province: '河北', product: 'Monitor 27 inch', amount: 7500, units: 30 },
      { date: '2024-02-10', region: 'West', province: '四川', product: 'Keyboard Pro', amount: 2000, units: 50 },
      { date: '2024-03-01', region: 'South', province: '海南', product: 'Laptop X1', amount: 18000, units: 12 },
      { date: '2024-03-15', region: 'East', province: '浙江', product: 'Mouse Wireless', amount: 1500, units: 60 },
      { date: '2024-03-20', region: 'West', province: '陕西', product: 'Laptop X1', amount: 22500, units: 15 },
    ]
  },
  {
    id: 't2',
    name: 'EMPLOYEE_PERFORMANCE',
    description: '关于员工销售目标和完成情况的 HR 数据',
    columns: [
      { name: 'employee_id', type: 'string' },
      { name: 'full_name', type: 'string' },
      { name: 'department', type: 'string' },
      { name: 'target', type: 'number' },
      { name: 'achieved', type: 'number' },
    ],
    rows: [
      { employee_id: 'E001', full_name: 'John Doe', department: 'Sales', target: 50000, achieved: 55000 },
      { employee_id: 'E002', full_name: 'Jane Smith', department: 'Sales', target: 50000, achieved: 48000 },
      { employee_id: 'E003', full_name: 'Alice Brown', department: 'Marketing', target: 20000, achieved: 22000 },
      { employee_id: 'E004', full_name: 'Bob White', department: 'Sales', target: 50000, achieved: 60000 },
      { employee_id: 'E005', full_name: 'Charlie Green', department: 'Marketing', target: 20000, achieved: 19000 },
    ]
  },
  {
    id: 't3',
    name: 'PROJECT_MILESTONES_2024',
    description: '企业重点项目里程碑及实施进度追踪表',
    columns: [
      { name: 'project_id', type: 'string' },
      { name: 'project_name', type: 'string' },
      { name: 'phase', type: 'string', description: '项目阶段 (Planning, Development, Testing, etc.)' },
      { name: 'milestone', type: 'string' },
      { name: 'status', type: 'string', description: '当前状态 (Completed, In Progress, Delayed, Pending)' },
      { name: 'progress', type: 'number', description: '完成百分比 (0-100)' },
      { name: 'due_date', type: 'date' },
      { name: 'owner', type: 'string' },
    ],
    rows: [
      { project_id: 'P001', project_name: 'AI 转型计划', phase: 'Planning', milestone: '需求调研与立项', status: 'Completed', progress: 100, due_date: '2024-01-15', owner: 'Alice' },
      { project_id: 'P001', project_name: 'AI 转型计划', phase: 'Development', milestone: '核心模型训练', status: 'In Progress', progress: 65, due_date: '2024-04-30', owner: 'Bob' },
      { project_id: 'P001', project_name: 'AI 转型计划', phase: 'Testing', milestone: 'UAT 用户验收测试', status: 'Pending', progress: 0, due_date: '2024-06-15', owner: 'Charlie' },
      { project_id: 'P002', project_name: 'ERP 系统升级', phase: 'Migration', milestone: '历史数据清洗迁移', status: 'Delayed', progress: 40, due_date: '2024-03-20', owner: 'David' },
      { project_id: 'P002', project_name: 'ERP 系统升级', phase: 'Go-Live', milestone: '系统正式上线', status: 'Pending', progress: 0, due_date: '2024-05-01', owner: 'Eve' },
      { project_id: 'P003', project_name: '新零售电商平台', phase: 'Design', milestone: 'UI/UX 交互设计', status: 'Completed', progress: 100, due_date: '2024-02-10', owner: 'Frank' },
      { project_id: 'P003', project_name: '新零售电商平台', phase: 'Development', milestone: '移动端 APP 开发', status: 'In Progress', progress: 85, due_date: '2024-03-30', owner: 'Grace' },
      { project_id: 'P003', project_name: '新零售电商平台', phase: 'Marketing', milestone: '首发营销活动策划', status: 'In Progress', progress: 20, due_date: '2024-04-10', owner: 'Helen' },
      { project_id: 'P004', project_name: '混合云架构迁移', phase: 'Infrastructure', milestone: '服务器环境部署', status: 'Completed', progress: 100, due_date: '2024-02-28', owner: 'Henry' },
    ]
  }
];

// Helper to generate massive mock data
const generateMockTables = (count: number): TableData[] => {
  const tables: TableData[] = [];
  const categories = ['FIN', 'HR', 'LOGISTICS', 'CRM', 'IOT', 'APP'];
  
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const id = `mock_t_${i + 4}`; // Start from 4 since we have 3 base tables now
    tables.push({
      id,
      name: `${category}_DATA_${1000 + i}`,
      description: `系统自动生成的 ${category} 业务模块测试表 ${i + 1}`,
      columns: [
        { name: 'id', type: 'string', description: 'Primary Key' },
        { name: 'created_at', type: 'date', description: 'Creation Timestamp' },
        { name: 'status', type: 'string', description: 'Status Code' },
        { name: 'value', type: 'number', description: 'Measurement Value' }
      ],
      rows: [] // Empty rows for lightweight mock
    });
  }
  return tables;
};

export const MOCK_AVAILABLE_TABLES: TableData[] = [
  ...BASE_TABLES,
  ...generateMockTables(1000)
];

// Reusable Preview Data for Chart Components
export const PREVIEW_DATA: TableData = {
  id: 'preview',
  name: 'Preview Data',
  columns: [
    { name: 'category', type: 'string' },
    { name: 'value1', type: 'number' },
    { name: 'value2', type: 'number' },
    { name: 'value3', type: 'number' }
  ],
  rows: [
    { category: '北京', value1: 4000, value2: 2400, value3: 2400 },
    { category: '上海', value1: 3000, value2: 1398, value3: 2210 },
    { category: '广东', value1: 2000, value2: 9800, value3: 2290 },
    { category: '四川', value1: 2780, value2: 3908, value3: 2000 },
    { category: '浙江', value1: 1890, value2: 4800, value3: 2181 },
  ]
};
