
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TableData, ChartConfig, DataSource, CustomChartSpec, WebComponentTemplate } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ... (Previous schemas remain unchanged) ...

const chartResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description: "A brief textual analysis or answer to the user's question based on the data.",
    },
    chartConfig: {
      type: Type.OBJECT,
      nullable: true,
      description: "Configuration for a chart if the data supports visualization and the user asked for it (standard charts).",
      properties: {
        type: { 
          type: Type.STRING, 
          enum: ['bar', 'line', 'pie', 'area', 'radar', 'scatter', 'map', 'custom', 'funnel', 'gauge', 'boxplot'],
          description: "Standard types. Use 'map' for geography, 'funnel' for conversion process, 'gauge' for KPI, 'boxplot' for distribution."
        },
        xAxisKey: { type: Type.STRING, description: "The key in the data row to use for the X Axis (categories). For 'map', this MUST be the province name (e.g., '北京', 'Sichuan')." },
        dataKeys: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Array of keys in the data row to use for values (Y Axis)." 
        },
        title: { type: Type.STRING, description: "A creative title for the chart." },
        description: { type: Type.STRING, description: "Short description of what the chart shows." },
        tableName: { type: Type.STRING, description: "The EXACT name of the table from the provided schema that this chart visualizes." },
        sql: { type: Type.STRING, description: "The Oracle SQL query that would generate this result set from the table." },
        customSpec: {
           type: Type.OBJECT,
           nullable: true,
           description: "Required ONLY if type is 'custom'. Defines the visual structure.",
           properties: {
             series: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'scatter'] },
                   dataKeyIndex: { type: Type.INTEGER, description: "Index in dataKeys array this series maps to." },
                   color: { type: Type.STRING, description: "Hex color code" },
                   name: { type: Type.STRING, description: "Legend label override" },
                   stackId: { type: Type.STRING, nullable: true },
                   yAxisId: { type: Type.STRING, enum: ['left', 'right'], nullable: true }
                 },
                 required: ['type', 'dataKeyIndex']
               }
             },
             referenceLines: {
               type: Type.ARRAY,
               nullable: true,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   y: { type: Type.NUMBER },
                   label: { type: Type.STRING },
                   color: { type: Type.STRING }
                 }
               }
             },
             yAxisLeft: {
                type: Type.OBJECT,
                nullable: true,
                properties: { label: { type: Type.STRING }, unit: { type: Type.STRING } }
             },
             yAxisRight: {
                type: Type.OBJECT,
                nullable: true,
                properties: { label: { type: Type.STRING }, unit: { type: Type.STRING } }
             }
           },
           required: ['series']
        }
      },
      required: ['type', 'xAxisKey', 'dataKeys', 'title', 'description', 'tableName', 'sql']
    },
    webComponent: {
      type: Type.OBJECT,
      nullable: true,
      description: "Generate this ONLY if the user explicitly selected a Web Component or requested a custom UI visualization.",
      properties: {
        name: { type: Type.STRING, description: "Name of the component" },
        code: { 
          type: Type.STRING, 
          description: "The complete React functional component code. It must contain the DATA embedded directly as a const variable within the component, populated from the user's dataset." 
        }
      },
      required: ['name', 'code']
    }
  },
  required: ['explanation']
};

const chartTemplateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the chart component (e.g. 'Pareto Chart')" },
    description: { type: Type.STRING, description: "What this chart is good for." },
    type: { 
      type: Type.STRING, 
      enum: ['bar', 'line', 'pie', 'area', 'radar', 'scatter', 'map', 'custom', 'funnel', 'gauge', 'boxplot'],
      description: "The base type of the chart. Use 'custom' for composed charts defined by customSpec."
    },
    customSpec: {
       type: Type.OBJECT,
       description: "The visual definition.",
       properties: {
         series: {
           type: Type.ARRAY,
           items: {
             type: Type.OBJECT,
             properties: {
               type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'scatter'] },
               dataKeyIndex: { type: Type.INTEGER, description: "Use 0 for 1st metric, 1 for 2nd metric, etc." },
               color: { type: Type.STRING },
               name: { type: Type.STRING, description: "Legend label override" },
               stackId: { type: Type.STRING, nullable: true },
               yAxisId: { type: Type.STRING, enum: ['left', 'right'], nullable: true }
             },
             required: ['type', 'dataKeyIndex']
           }
         },
         yAxisLeft: {
            type: Type.OBJECT,
            nullable: true,
            properties: { label: { type: Type.STRING } }
         },
         yAxisRight: {
            type: Type.OBJECT,
            nullable: true,
            properties: { label: { type: Type.STRING } }
         },
         referenceLines: {
            type: Type.ARRAY,
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    y: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                    color: { type: Type.STRING }
                }
            }
         }
       },
       required: ['series']
    }
  },
  required: ['name', 'description', 'type', 'customSpec']
};

const datasetSqlResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sql: { type: Type.STRING, description: "The valid Oracle SQL query to extract the requested dataset." },
    explanation: { type: Type.STRING, description: "Brief explanation of the query logic and joins used." }
  },
  required: ['sql', 'explanation']
};

const webComponentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A short, pascal-case name for the component (e.g. 'UserCard', 'SalesGrid')." },
    description: { type: Type.STRING, description: "Brief description of what the component does." },
    code: { 
      type: Type.STRING, 
      description: "The complete React functional component code. DO NOT include import statements. Use 'Lucide' object for icons (e.g. <Lucide.Home />). Use Tailwind CSS for styling." 
    }
  },
  required: ['name', 'description', 'code']
};

const tableAnnotationsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      columnName: { type: Type.STRING, description: "The original column name" },
      alias: { type: Type.STRING, description: "A short, user-friendly Chinese alias (2-5 characters typically)" },
      description: { type: Type.STRING, description: "A concise business description of what this column represents" }
    },
    required: ['columnName', 'alias', 'description']
  }
};

const generateWithRetry = async (call: () => Promise<any>, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await call();
    } catch (e: any) {
      if (i === retries) throw e;
      // Retry on network errors or 500s
      if (e.message?.includes('fetch failed') || e.message?.includes('Rpc failed') || e.status >= 500) {
        console.warn(`Gemini API call failed, retrying (${i + 1}/${retries})...`, e.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponentialish backoff
        continue;
      }
      throw e;
    }
  }
};

export const generateDataInsight = async (
  tables: TableData[],
  userQuery: string,
  imageBase64?: string,
  referenceContext?: { type: 'chart' | 'component', name: string, code?: string }
): Promise<{ explanation: string; chartConfig?: ChartConfig; webComponent?: { name: string; code: string } }> => {
  
  // Prepare context for multiple tables
  const schemaContext = JSON.stringify(tables.map(t => ({
    name: t.name,
    description: t.description,
    columns: t.columns
  })));

  // Limit rows for each table to avoid token limits
  const dataContext = JSON.stringify(tables.map(t => ({
    name: t.name,
    sampleRows: t.rows.slice(0, 10)
  })));

  let promptParts: any[] = [];
  
  if (imageBase64) {
    promptParts.push({
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png'
      }
    });
    promptParts.push({
      text: `
      [IMAGE ANALYSIS TASK]
      The user has provided an image. Analyze it to determine the chart type and data mapping.
      `
    });
  }

  // Construct chart/component preference instruction
  let preferenceInstruction = "";
  if (referenceContext) {
      if (referenceContext.type === 'component' && referenceContext.code) {
          preferenceInstruction = `
            USER PREFERENCE: The user has explicitly selected a Web Component named '${referenceContext.name}'.
            
            REFERENCE CODE:
            \`\`\`javascript
            ${referenceContext.code}
            \`\`\`
            
            TASK:
            1. Analyze the user's data (Sample Rows) and the user's query ("${userQuery}").
            2. Generate a NEW React Web Component that visualizes the user's data using a style similar to the REFERENCE CODE.
            3. CRITICAL: You MUST embed the relevant data from the Sample Rows directly into the new component code as a 'const data = [...]' variable. The component should be self-contained and render the data immediately.
            4. Output the code in the 'webComponent' field of the JSON response.
          `;
      } else {
          preferenceInstruction = `USER PREFERENCE: The user has explicitly requested to use chart type: '${referenceContext.name}'. Output a standard 'chartConfig' matching this type.`;
      }
  }

  promptParts.push({
    text: `
    You are an expert Data Analyst using an AI Reporting System.
    
    Here are the schemas: ${schemaContext}
    Sample rows: ${dataContext}
    
    User Query: "${userQuery}"
    
    ${preferenceInstruction}
    
    Analyze the data. 

    IMPORTANT: When defining 'dataKeys' for charts, use the EXACT column names from the schema. 
    DO NOT invent aggregation names like 'TOTAL_AMOUNT' or 'SUM_SALES' unless those columns actually exist in the provided schema.
    The frontend will handle aggregation automatically. Just provide the raw column name (e.g. 'amount').
    
    If the user selected a Web Component (see Reference Code above), generate a 'webComponent' in the JSON response.
    
    Otherwise, if a visualization is needed:
    1. For standard charts, use type: 'bar', 'line', 'map', 'funnel', 'gauge', 'boxplot' etc. in 'chartConfig'.
    2. For complex mixed charts (e.g. "Sales vs Target" or "Pareto"), use type: 'custom' and fill 'customSpec'.
    3. If the user asks for a MAP or GEOGRAPHIC view, use type: 'map'. The 'xAxisKey' MUST be the province/region column.
    
    Output JSON format based on the schema.
    `
  });

  try {
    const model = 'gemini-2.5-flash';
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: chartResponseSchema,
      systemInstruction: "You are a helpful, professional business intelligence assistant. Respond in Simplified Chinese. When generating React code, use Tailwind CSS and Lucide icons (via Lucide.IconName)."
    };

    const response = await generateWithRetry(() => ai.models.generateContent({
      model: model,
      contents: { parts: promptParts },
      config: config
    }));

    let text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      explanation: "抱歉，分析数据时遇到错误。请重试或检查您的 API Key。"
    };
  }
};

export const generateChartTemplate = async (description: string, imageBase64?: string): Promise<{ name: string; description: string; type: ChartConfig['type']; customSpec: CustomChartSpec }> => {
  let promptParts: any[] = [];
  
  if (imageBase64) {
    promptParts.push({
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png'
      }
    });
    promptParts.push({
      text: `Analyze this image to help create a chart template.`
    });
  }

  promptParts.push({
    text: `
    You are a Data Visualization Architect.
    Create a reusable 'Custom Chart Component' based on this description: "${description}".
    
    Define the 'customSpec' which tells the renderer how to compose the chart using Recharts concepts.
    - Supported series types: bar, line, area, scatter.
    - Use 'dataKeyIndex' (0, 1, 2...) to abstractly refer to data fields.
    - Assign meaningful default colors.
    - Use 'yAxisId': 'right' if dual axis is implied (e.g. different units).
    - If the request implies a standard chart (e.g. "Simple Bar Chart"), use 'type': 'bar' (or line, area, etc).
    - If the request implies a map, use 'type': 'map'.
    - If the request implies a complex/mixed chart (e.g. "Pareto", "Dual Axis"), use 'type': 'custom' and provide 'customSpec'.
    
    Example Description: "Target Achievement Chart"
    Example Spec: Series 0 (Bar, Sales), Series 1 (Line, Target).
    
    Respond in JSON.
    `
  });

  try {
    const response = await generateWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: promptParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: chartTemplateSchema,
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Template Gen Error:", error);
    throw error;
  }
};

export const generateDatasetSQL = async (
  dataSources: DataSource[],
  userQuery: string
): Promise<{ sql: string; explanation: string }> => {
  // Extract schema from data sources, but limit the payload to avoid Rpc errors with huge mock tables
  const schemaContext = JSON.stringify(dataSources.map(ds => ({
    sourceName: ds.name,
    // Just send names and columns, skip description if it's too long or redundant
    tables: ds.tables.slice(0, 50).map(t => ({ // Limit to 50 tables per source to prevent huge payload
      name: t.name, 
      description: t.description?.substring(0, 100), // Truncate desc
      columns: t.columns.map(c => ({ name: c.name, type: c.type, description: c.description }))
    }))
  })));

  const prompt = `
    You are an expert SQL Developer.
    
    I have the following data sources and tables available:
    ${schemaContext}
    
    User Request: "${userQuery}"
    
    Please generate a valid Oracle SQL query to retrieve the dataset requested by the user. 
    You may join tables if they seem related based on column names (e.g., employee_id) even if they are from different defined sources (simulate a federated query).
    
    Output JSON format containing 'sql' and 'explanation'.
  `;

  try {
    const response = await generateWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: datasetSqlResponseSchema,
        systemInstruction: "You are a specialized SQL generation assistant. Respond in Simplified Chinese."
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini SQL Generation Error:", error);
    return {
      sql: "-- AI Generation Failed",
      explanation: "生成 SQL 时遇到错误，请重试。"
    };
  }
};

export const generateWebComponent = async (
  description: string, 
  imageBase64?: string,
  contextData?: TableData
): Promise<{ name: string; description: string; code: string }> => {
  let promptParts: any[] = [];

  if (imageBase64) {
    promptParts.push({
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png'
      }
    });
    promptParts.push({
      text: `[IMAGE ANALYSIS] Use this image as a visual reference for the React component.`
    });
  }

  // Construct Context Data Prompt
  let contextInstruction = "";
  if (contextData) {
     const sampleData = JSON.stringify(contextData.rows.slice(0, 15)); // Provide more rows for component preview
     const schema = JSON.stringify(contextData.columns);
     contextInstruction = `
       CONTEXT DATASET:
       - Table Name: ${contextData.name}
       - Schema: ${schema}
       - Sample Data: ${sampleData}

       INSTRUCTIONS:
       1. You MUST use the provided 'Sample Data' to populate the component.
       2. CRITICAL: Define a variable 'const data = ${sampleData};' inside the component (or a similar variable name) and use it. 
       3. IMPORTANT: The 'Sample Data' provided above is a JSON string. When embedding it into your code, ensure you treat it as a valid JavaScript Object Literal. BE VERY CAREFUL with escaping quotes. If a value in the JSON contains a double quote (e.g., "Monitor 27\\""), ensure the generated code preserves the escape sequence so the code is syntactically valid.
       4. Adapt the UI (Table, Card Grid, Kanban, etc.) to best visualize this specific dataset structure.
     `;
  }

  promptParts.push({
    text: `
    You are an Expert React Developer.
    Create a reusable functional React component based on this description: "${description}".

    ${contextInstruction}

    Requirements:
    1. Output raw JSX/TSX code for the component body/function.
    2. DO NOT include 'import' statements. Assume 'React', 'Lucide' (for icons), and 'Recharts' are available globally.
    3. Use Tailwind CSS for styling. Make it look modern, clean, and professional.
    4. Access icons via 'Lucide.IconName' (e.g., <Lucide.Home />, <Lucide.User />).
    5. The component should be self-contained.
    6. Return ONLY the JSON object defined in the schema.
    7. All UI text, labels, and placeholders MUST be in Simplified Chinese.

    Example Code Output:
    "const MyComponent = () => { const data = [...]; return <div className='p-4 bg-white shadow'><Lucide.User className='w-6 h-6' /> {data[0].name}</div> }; return MyComponent;"

    Ideally, return just the function definition so it can be evaluated.
    `
  });

  try {
    const response = await generateWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: promptParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: webComponentSchema,
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Web Component Gen Error:", error);
    throw error;
  }
};

export const generateTableAnnotations = async (
  tableName: string, 
  tableDescription: string | undefined, 
  columns: { name: string, type: string }[]
): Promise<{ columnName: string, alias: string, description: string }[]> => {
  const schemaContext = JSON.stringify(columns);
  
  const prompt = `
    You are a Data Dictionary Specialist.
    
    Table Name: ${tableName}
    Table Description: ${tableDescription || 'N/A'}
    Columns: ${schemaContext}
    
    Task:
    Generate user-friendly Simplified Chinese metadata for each column.
    
    1. 'alias': A short, concise name (2-5 characters) suitable for chart axis labels or table headers (e.g., "sales_amt" -> "销售额").
    2. 'description': A brief business explanation of what this field represents.
    
    Infer meaning from the column name (often English/Pinyin abbreviations) and type.
    
    Return a JSON array where each object matches the schema.
  `;

  try {
    const response = await generateWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tableAnnotationsSchema,
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Annotation Gen Error:", error);
    throw error;
  }
};
