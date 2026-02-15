from typing import Union
from fastapi import FastAPI
from app.core.config import settings
from starlette.middleware.cors import CORSMiddleware
from app.api.main import api_router

import app.worker as worker

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/submit_task")
def submit_task():
    task = worker.app.send_task("app.tasks.ping", args=[1])
    return {"task_id": task.id}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
