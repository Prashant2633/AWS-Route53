import uvicorn
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
from routers import auth, zones, records, dashboard
from seed import seed_data

app = FastAPI(
    title="AWS Route53 Clone API",
    description="REST API for the Route53 Clone web application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await seed_data()

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(records.router)
app.include_router(dashboard.router)

@app.get("/")
async def root():
    return {
        "message": "AWS Route53 Clone API is running.",
        "docs": "/docs"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "message": exc.detail,
            "error": exc.detail,
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err["loc"][1:]) if len(err["loc"]) > 1 else str(err["loc"][0])
        errors.append(f"Field '{loc}': {err['msg']}")
    
    detail_msg = "; ".join(errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "data": None,
            "message": "Validation failed: " + detail_msg,
            "error": "Unprocessable Entity",
            "detail": errors,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "data": None,
            "message": "An unexpected server error occurred.",
            "error": str(exc),
            "detail": str(exc),
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
    )

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
