from typing import Any, Dict, List, Optional
import os
import requests
import logging
import time
import json

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
API_KEY = os.getenv("OPENROUTER_API_KEY", "")

logger = logging.getLogger("llm_client")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _h = logging.StreamHandler()
    _f = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    _h.setFormatter(_f)
    logger.addHandler(_h)

def call_llm(messages: List[Dict[str, Any]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
    provider = "openrouter"
    logger.info(f"LLM_REQUEST provider={provider} messages={len(messages)} schema={schema_hint or ''}")
    if not API_KEY:
        return {"error": "Missing OPENROUTER_API_KEY"}
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", # Optional
        "X-Title": "AI Data Insight Pro", # Optional
    }
    
    payload: Dict[str, Any] = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }
    
    # Some models on OpenRouter might strictly follow tool_choice, others might not.
    # We keep it consistent with other services.
    if schema_hint:
        payload["tool_choice"] = "none"
        
    try:
        _start = time.time()
        # Avoid logging full message content which may contain base64 images
        logger.info(f"LLM_REQUEST url={OPENROUTER_API_URL} model={DEFAULT_MODEL} messages_count={len(messages)} schema={schema_hint or ''}")
        resp = requests.post(OPENROUTER_API_URL, json=payload, headers=headers, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        
        if "error" in data:
             return {"error": str(data["error"])}
             
        content = data["choices"][0]["message"]["content"]
        logger.info(f"LLM_RESPONSE status={resp.status_code} duration={(time.time()-_start):.3f}s size={len(resp.text)}")
        
        try:
            preview = content if isinstance(content, str) else str(content)

            logger.info(f"LLM_RESPONSE_BODY {preview}")
        except Exception:
            pass
        
        # Clean markdown code blocks if present (Standard robust parsing)
        cleaned_content = content.strip()
        if cleaned_content.startswith("```"):
            # Find first newline
            first_newline = cleaned_content.find("\n")
            if first_newline != -1:
                # Remove first line (```json or just ```)
                cleaned_content = cleaned_content[first_newline+1:]
            
            # Remove trailing ``` if present
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
        
        cleaned_content = cleaned_content.strip()

        return json.loads(cleaned_content)
    except Exception as e:
        logger.error(f"LLM_ERROR provider=openrouter err={str(e)}")
        return {"error": str(e)}
