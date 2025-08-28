from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents import check_crawlability

app = FastAPI(title="derid api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Backend is running. Use POST /check-url or open /docs for Swagger UI."
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/check-url")
async def check_url(request: URLRequest):
    return check_crawlability(request.url)
