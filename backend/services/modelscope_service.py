from typing import Any, Dict, List, Optional
import os
import logging
import time
import json

MODELSCOPE_BASE_URL = os.getenv("MODELSCOPE_API_URL", "https://api-inference.modelscope.cn/v1")
DEFAULT_MODEL = os.getenv("MODESCOPE_MODEL", "")
API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
ENABLE_THINKING = os.getenv("MODELSCOPE_ENABLE_THINKING", "true").lower() == "true"

logger = logging.getLogger("llm_client")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _h = logging.StreamHandler()
    _f = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    _h.setFormatter(_f)
    logger.addHandler(_h)

try:
    from openai import OpenAI  # type: ignore
    _OPENAI_AVAILABLE = True
except Exception:
    _OPENAI_AVAILABLE = False
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util import Retry
    READ_TIMEOUT = int(os.getenv("MODELSCOPE_TIMEOUT", os.getenv("SILICONFLOW_TIMEOUT", "40")))
    RETRIES = int(os.getenv("MODELSCOPE_RETRIES", os.getenv("SILICONFLOW_RETRIES", "2")))
    BACKOFF = float(os.getenv("MODELSCOPE_BACKOFF", os.getenv("SILICONFLOW_BACKOFF", "0.5")))

def call_llm(messages: List[Dict[str, Any]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
    if not API_KEY:
        return {"error": "Missing MODELSCOPE_API_KEY"}
    extra_body: Dict[str, Any] = {"enable_thinking": ENABLE_THINKING}
    try:
        _start = time.time()
        # Avoid logging full message content which may contain base64 images
        logger.info(f"LLM_REQUEST provider=modelscope base_url={MODELSCOPE_BASE_URL} model={DEFAULT_MODEL} messages_count={len(messages)} schema={schema_hint or ''}")
        if _OPENAI_AVAILABLE:
            client = OpenAI(base_url=MODELSCOPE_BASE_URL, api_key=API_KEY)
            resp = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=messages,
                stream=False,
                extra_body=extra_body
            )
            duration = time.time() - _start
            msg = resp.choices[0].message
            content = msg.content or ""
            reasoning = getattr(msg, "reasoning_content", None)
        else:
            # HTTP fallback for environments without OpenAI SDK v1
            url = MODELSCOPE_BASE_URL.rstrip("/") + "/chat/completions"
            headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
            payload: Dict[str, Any] = {
                "model": DEFAULT_MODEL,
                "messages": messages,
                "stream": False,
                "extra_body": extra_body
            }
            session = requests.Session()
            retry = Retry(
                total=RETRIES,
                read=RETRIES,
                connect=RETRIES,
                status=RETRIES,
                backoff_factor=BACKOFF,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=frozenset(["POST"]),
                raise_on_status=False,
            )
            adapter = HTTPAdapter(max_retries=retry)
            session.mount("https://", adapter)
            session.mount("http://", adapter)
            r = session.post(url, json=payload, headers=headers, timeout=(5, READ_TIMEOUT))
            r.raise_for_status()
            data = r.json()
            # Try OpenAI-like shape
            content = None
            reasoning = None
            try:
                content = data["choices"][0]["message"]["content"]
                reasoning = data["choices"][0]["message"].get("reasoning_content")
            except Exception:
                # Fallback shapes commonly used
                content = data.get("output_text") or data.get("text") or ""
            duration = time.time() - _start

        try:
            logger.info(f"LLM_RESPONSE duration={duration:.3f}s size={len(content)}")
            logger.info(f"LLM_RESPONSE_BODY {content}")
        except Exception:
            pass

        try:
            # Clean markdown code blocks if present
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
            
            parsed = json.loads(cleaned_content)
            if reasoning:
                parsed["reasoning"] = reasoning
            return parsed
        except Exception:
            return {"content": content, "reasoning": reasoning}
    except Exception as e:
        logger.error(f"LLM_ERROR provider=modelscope err={str(e)}")
        return {"error": str(e)}

class ModelScopeClient:
    def __init__(self):
        self.base_url = MODELSCOPE_BASE_URL
        self.model = DEFAULT_MODEL
        self.api_key = API_KEY
        self.enable_thinking = ENABLE_THINKING

    def call(self, messages: List[Dict[str, str]], schema_hint: Optional[str] = None) -> Dict[str, Any]:
        return call_llm(messages, schema_hint)
