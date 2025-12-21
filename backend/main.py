from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass
from .apis import (
    datasource_router,
    dataset_router,
    dashboard_router,
    web_component_router,
    chart_template_router,
    ai_router,
    saved_component_router,
    template_router,
    widget_router
)

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(datasource_router)
app.include_router(dataset_router)
app.include_router(dashboard_router)
# app.include_router(web_component_router)  # Deprecated
# app.include_router(chart_template_router) # Deprecated
app.include_router(widget_router)           # New consolidated router
app.include_router(ai_router)
app.include_router(saved_component_router)
app.include_router(template_router, prefix="/api/templates", tags=["templates"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
