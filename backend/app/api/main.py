from fastapi import APIRouter
from app.api.routes import email, audit, users, login

api_router = APIRouter()
api_router.include_router(email.router)
api_router.include_router(audit.router)
api_router.include_router(login.router)
api_router.include_router(users.router)


# Ref: https://fastapi.tiangolo.com/tutorial/bigger-applications/
