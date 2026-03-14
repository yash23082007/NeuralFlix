from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import movies, recommendations

app = FastAPI(title="Movie Recommendation API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])

@app.get("/")
def root():
    return {"message": "Welcome to the Movie Recommendation API"}
