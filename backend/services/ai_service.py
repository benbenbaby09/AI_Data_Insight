from typing import Any, Dict, List, Optional
import os
import logging
import time

logger = logging.getLogger("llm_client")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _h = logging.StreamHandler()
    _f = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    _h.setFormatter(_f)
    logger.addHandler(_h)

class LLMStrategy:
    def call(self, messages: List[Dict[str, Any]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

class SiliconFlowStrategy(LLMStrategy):
    def call(self, messages: List[Dict[str, Any]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
        from backend.services.siliconflow_service import call_llm as sf_call
        return sf_call(messages, schema_hint)

class ModelScopeStrategy(LLMStrategy):
    def call(self, messages: List[Dict[str, Any]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
        from backend.services.modelscope_service import call_llm as ms_call
        return ms_call(messages, schema_hint)

STRATEGY_REGISTRY: Dict[str, LLMStrategy] = {
    "siliconflow": SiliconFlowStrategy(),
    "modelscope": ModelScopeStrategy(),
}

def get_strategy() -> LLMStrategy:
    provider = os.getenv("AI_PROVIDER", "siliconflow").lower()
    return STRATEGY_REGISTRY.get(provider, STRATEGY_REGISTRY["siliconflow"])

def _call_llm(messages: List[Dict[str, Any]], schema_hint: Optional[str] = None, provider_override: Optional[str] = None) -> Dict[str, Any]:
    strategy = STRATEGY_REGISTRY.get(provider_override, get_strategy()) if provider_override else get_strategy()
    return strategy.call(messages, schema_hint)

def _get_provider_override(kind: str) -> Optional[str]:
    if kind == "chart":
        return os.getenv("AI_CHART_PROVIDER")
    if kind == "web_component":
        return os.getenv("AI_WEB_COMPONENT_PROVIDER")
    return None

from sqlalchemy.orm import Session
from backend.models.orm import DataSource, TableEntry

def select_relevant_tables(user_query: str, all_tables_summary: List[Dict[str, Any]]) -> List[int]:
    """
    Selects relevant table IDs based on user query.
    """
    system = {
        "role": "system",
        "content": "You are a Database Expert. Given a user query and a list of table summaries, identify the most relevant tables. Return a JSON object with a key 'relevant_table_ids' containing a list of table IDs."
    }
    
    # Context could be large, so we format it concisely
    # Limit summary length per table to avoid token overflow
    tables_context_lines = []
    for t in all_tables_summary:
        desc = (t['description'] or "")[:100] # Truncate description
        tables_context_lines.append(f"ID: {t['id']}, Name: {t['name']}, Desc: {desc}")
    
    tables_context = "\n".join(tables_context_lines)
    
    user = {
        "role": "user",
        "content": f"User Query: \"{user_query}\"\n\nAvailable Tables:\n{tables_context}\n\nPlease select the table IDs that are necessary to answer the query. Return JSON with 'relevant_table_ids'."
    }
    
    result = _call_llm([system, user], schema_hint="table_selection")
    
    if "error" in result:
        logger.error(f"Table selection failed: {result['error']}")
        return []
        
    ids = result.get("relevant_table_ids", [])
    if isinstance(ids, list):
        return [int(i) for i in ids if isinstance(i, (int, str)) and str(i).isdigit()]
    return []

def auto_select_tables(db: Session, data_source_id: int, user_query: str) -> Dict[str, Any]:
    """
    Selects relevant tables based on user query.
    Returns a dict with 'selectedTableIds' and possibly 'reasoning' or just the ids.
    """
    all_tables = db.query(TableEntry).filter(TableEntry.dataSourceId == data_source_id).all()
    annotated_tables = [t for t in all_tables if t.simple_description]
    
    if not annotated_tables:
        raise ValueError("当前数据源没有已标注的表，无法进行自动选择。请先对表进行标注（添加简要描述）。")

    table_summaries = [
        {"id": t.id, "name": t.name, "description": t.simple_description}
        for t in annotated_tables
    ]
    
    selected_ids = select_relevant_tables(user_query, table_summaries)
    
    # Fallback logic same as generate_dataset_sql
    if not selected_ids:
        if len(annotated_tables) <= 3:
            selected_ids = [t.id for t in annotated_tables]
        else:
            selected_ids = []
            
    return {"selectedTableIds": selected_ids}

def generate_dataset_sql(db: Session, data_source_id: int, table_ids: List[int], user_query: str, skip_auto_select: bool = False) -> Dict[str, Any]:
    # Fetch data source and tables from database
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise ValueError(f"DataSource with id {data_source_id} not found")

    if not table_ids:
        if skip_auto_select:
             tables = []
        else:
            # Auto-selection mode: Fetch all tables for this data source
            all_tables = db.query(TableEntry).filter(TableEntry.dataSourceId == data_source_id).all()
            
            # Filter only annotated tables
            annotated_tables = [t for t in all_tables if t.simple_description]
            
            if not annotated_tables:
                raise ValueError("当前数据源没有已标注的表，无法进行自动选择。请先对表进行标注（添加简要描述）。")

            # Prepare summary for AI selection
            table_summaries = [
                {"id": t.id, "name": t.name, "description": t.simple_description}
                for t in annotated_tables
            ]
            
            # Use AI to select relevant tables
            selected_ids = select_relevant_tables(user_query, table_summaries)
            
            if not selected_ids:
                 # If AI selects nothing, but we have few tables, maybe use all?
                 # For now, let's trust the AI or fallback to all if very few (< 3)
                 if len(annotated_tables) <= 3:
                     tables = annotated_tables
                 else:
                     # If we return empty, the SQL generation will likely fail or be generic.
                     # Let's try to proceed with empty and let the next step handle it (which will result in empty context)
                     tables = []
                     logger.warning("AI selected no tables for query: %s", user_query)
            else:
                 tables = [t for t in annotated_tables if t.id in selected_ids]
                 
            if not tables and len(annotated_tables) > 0:
                 # Fallback: if AI selection failed entirely (returned empty), maybe just pick top 5?
                 # Or just error out.
                 # Let's try to return a helpful error in the SQL explanation later if context is empty.
                 pass

    else:
        tables = db.query(TableEntry).filter(TableEntry.id.in_(table_ids)).all()
        if not tables:
             raise ValueError(f"No valid tables found for ids {table_ids}")

    processed_tables = []
    for t in tables:
        simple_desc = t.simple_description
        if not simple_desc:
            raise ValueError(f"Table '{t.name}' is missing simple_description. Please save table annotations first.")
        
        # Parse columns from JSON if needed (TableEntry columns is JSON field)
        cols = t.columns if isinstance(t.columns, list) else []
        
        processed_tables.append({
            "name": t.name,
            "description": simple_desc,
            "columns": [{"name": c.get("name"), "type": c.get("type"), "alias": c.get("alias"), "description": c.get("description")} for c in cols]
        })

    schema_context = [{
        "tables": processed_tables
    }]
    
    system = {
        "role": "system",
        "content": "You are a specialized SQL generation assistant. Respond in Simplified Chinese and return valid JSON with fields 'sql' and 'explanation'."
    }
    user = {
        "role": "user",
        "content": f"I have the following data sources and tables available:\n{schema_context}\n\nUser Request: \"{user_query}\"\n\nPlease generate a valid Oracle SQL query to retrieve the dataset requested by the user. Output JSON with 'sql' and 'explanation'."
    }
    result = _call_llm([system, user], schema_hint="dataset_sql")
    if "error" in result:
        return {"sql": "-- AI Generation Failed", "explanation": f"生成 SQL 失败：{result['error']}", "relevantTableIds": [t.id for t in tables]}
    
    result["relevantTableIds"] = [t.id for t in tables]
    return result

def generate_table_annotations(table_name: str, table_description: Optional[str], columns: List[Dict[str, str]]) -> List[Dict[str, str]]:
    system = {
        "role": "system",
        "content": "You are a Data Dictionary Specialist. Respond in Simplified Chinese. Return a JSON object with a key 'annotations' containing an array of objects. Each object must have exactly these keys: 'columnName' (must match input column name exactly), 'alias' (Chinese short name), 'description' (business meaning)."
    }
    user = {
        "role": "user",
        "content": f"Table Name: {table_name}\nTable Description: {table_description or 'N/A'}\nColumns: {columns}\n\nGenerate user-friendly metadata for each column."
    }
    result = _call_llm([system, user], schema_hint="table_annotations")
    if "error" in result:
        return []
    # Try common keys
    raw_list = []
    if isinstance(result, list):
        raw_list = result
    else:
        for key in ["annotations", "columns", "data", "result"]:
            if key in result and isinstance(result[key], list):
                raw_list = result[key]
                break
    
    # Normalize keys to ensure frontend compatibility
    normalized = []
    for item in raw_list:
        if not isinstance(item, dict):
            continue
        new_item = {
            "columnName": item.get("columnName") or item.get("column_name") or item.get("name"),
            "alias": item.get("alias") or item.get("chinese_name") or item.get("title"),
            "description": item.get("description") or item.get("desc") or item.get("business_meaning")
        }
        if new_item["columnName"]:
            normalized.append(new_item)
            
    return normalized

def generate_data_insight(tables: List[Dict[str, Any]], user_query: str, reference_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    system = {
        "role": "system",
        "content": "You are a helpful BI assistant. Respond in Simplified Chinese. Return JSON with 'explanation' and optionally 'chartConfig' or 'webComponent'."
    }
    schema_context = [
        {
            "name": t.get("name"),
            "description": t.get("description"),
            "columns": t.get("columns")
        }
        for t in tables
    ]
    data_context = [
        {
            "name": t.get("name"),
            "sampleRows": (t.get("rows") or [])[:10]
        }
        for t in tables
    ]
    preference = ""
    if reference_context:
        if reference_context.get("type") == "chart":
            preference = f"User prefers chart type: {reference_context.get('name')}."
        elif reference_context.get("type") == "component":
            preference = f"User selected a Web Component named {reference_context.get('name')}."
    user = {
        "role": "user",
        "content": f"Schemas: {schema_context}\nSample rows: {data_context}\nUser Query: \"{user_query}\"\n{preference}\nReturn JSON."
    }
    override = None
    if reference_context and isinstance(reference_context, dict):
        if reference_context.get("type") == "chart":
            override = _get_provider_override("chart")
        elif reference_context.get("type") == "component":
            override = _get_provider_override("web_component")
    logger.info(f"generate_data_insight override: {override}")
    result = _call_llm([system, user], schema_hint="data_insight", provider_override=override)
    if "error" in result:
        return {"explanation": f"分析失败：{result['error']}"}
    return result

def generate_chart_template(description: str, image_base64: Optional[str] = None) -> Dict[str, Any]:
    system = {
        "role": "system",
        "content": "You are a Data Visualization Architect. Respond in Simplified Chinese. Return JSON with 'name','description','type' and 'customSpec' when type is 'custom'."
    }
    user_content = f"Create a reusable chart template.\nDescription: {description}\nReturn JSON."
    if image_base64:
        user_content += "\nThere is also a reference image provided. Use it to infer style."
    user = {
        "role": "user",
        "content": user_content
    }
    result = _call_llm([system, user], schema_hint="chart_template", provider_override=_get_provider_override("chart"))
    if "error" in result:
        return {"name": "AI图表", "description": "生成失败", "type": "bar", "customSpec": None}
    return result

def generate_web_component(description: str, image_base64: Optional[str] = None, context_data: Optional[Dict[str, Any]] = None, template_code: Optional[str] = None) -> Dict[str, Any]:
    style_guide = """
    Style Guide (Tailwind CSS):
    - Container: w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col
    - Header: px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center
    - Table Wrapper: flex-1 overflow-auto relative
    - Table: w-full text-left text-sm border-collapse
    - Thead: bg-slate-50 text-slate-500 font-medium sticky top-0 z-10
    - Th: px-4 py-3 font-medium whitespace-nowrap
    - Tbody: divide-y divide-slate-100
    - Tr: hover:bg-slate-50 transition-colors
    - Td: px-4 py-3 text-slate-700 whitespace-nowrap
    - Status Badge: inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
    """
    system = {
        "role": "system",
        "content": f"You are an Expert React Developer. Respond in Simplified Chinese. Return JSON with 'name','description','code'.\n{style_guide}\nEnsure the component handles props data gracefully."
    }
    ctx = ""
    if context_data:
        sample = (context_data.get("rows") or [])[:15]
        ctx = f"Context table {context_data.get('name')} sample rows: {sample} with columns {context_data.get('columns')}."
    
    template_instruction = ""
    if template_code:
        template_instruction = f"\n\nHere is a base template code you MUST use as a starting point. Modify it according to the description, but keep the overall structure if possible:\n```jsx\n{template_code}\n```"

    user_text = f"Create a reusable functional React component.\nDescription: {description}\n{ctx}{template_instruction}\nReturn JSON."
    
    if image_base64:
        user_content = [
            {"type": "text", "text": user_text},
            {
                "type": "image_url",
                "image_url": {
                    "url": image_base64
                }
            }
        ]
    else:
        user_content = user_text

    user = {
        "role": "user",
        "content": user_content
    }
    result = _call_llm([system, user], schema_hint="web_component", provider_override=_get_provider_override("web_component"))
    if "error" in result:
        return {"name": "AI组件", "description": "生成失败", "code": "const Fallback = () => <div>生成失败</div>; return Fallback;"}
    return result
