import time
import logging
import json
from typing import Callable
from fastapi import Request, Response
from fastapi.routing import APIRoute

# Setup logger
logger = logging.getLogger("api_logger")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class LoggingAPIRoute(APIRoute):
    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            start_time = time.time()
            
            # Log Request
            try:
                # We try to peek at the body. 
                # Note: For large uploads, this might be performance heavy.
                body_bytes = await request.body()
                body_str = body_bytes.decode("utf-8")
                # Try to pretty print JSON if possible
                try:
                    body_json = json.loads(body_str)
                    log_body = json.dumps(body_json, ensure_ascii=False)
                except:
                    log_body = body_str
                
                # Truncate if too long
                if len(log_body) > 1000:
                    log_body = log_body[:1000] + "..."
                    
                logger.info(f"REQUEST: {request.method} {request.url} | Body: {log_body}")
            except Exception as e:
                logger.warning(f"Could not log request body: {e}")

            try:
                response: Response = await original_route_handler(request)
                
                # Log Response
                process_time = time.time() - start_time
                logger.info(f"RESPONSE: {request.method} {request.url} | Status: {response.status_code} | Duration: {process_time:.4f}s")
                
                return response
            except Exception as e:
                process_time = time.time() - start_time
                logger.error(f"ERROR: {request.method} {request.url} | Exception: {str(e)} | Duration: {process_time:.4f}s")
                raise e

        return custom_route_handler
