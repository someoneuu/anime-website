from fastapi import FastAPI
# 1. Add this brand new import at the very top 🚀
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 2. Paste this block directly under app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",        # Allows your local Next.js server to connect
        "https://anihall.vercel.app"     # Allows your live Vercel site to connect
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Your existing code continues below ---
# We moved the data out here so multiple routes can use it!
anime_db = [
    {"id": 1, "title": "Naruto", "rating": 8.8, "episodes": 220},
    {"id": 2, "title": "One Piece", "rating": 8.9, "episodes": 1100},
    {"id": 3, "title": "Attack on Titan", "rating": 9.1, "episodes": 87}
]
# ... rest of your code ...
import urllib.request
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnimeCreate(BaseModel):
    title: str
    rating: float
    episodes: int
    genres: list[str] = []

# Local Saved Vault
vault_db = [
    {"id": 1, "title": "Naruto", "rating": 8.8, "episodes": 220, "genres": ["Action", "Adventure", "Fantasy"]},
    {"id": 2, "title": "One Piece", "rating": 8.9, "episodes": 1100, "genres": ["Action", "Adventure", "Fantasy"]},
    {"id": 3, "title": "Attack on Titan", "rating": 9.1, "episodes": 87, "genres": ["Action", "Award Winning", "Drama", "Suspense"]}
]

# Quick Local Fallback just in case of an internet failure
FALLBACK_ANIME = [
    {"title": "Frieren: Beyond Journey's End", "rating": 9.4, "episodes": 28, "genres": ["Adventure", "Drama", "Fantasy"]},
    {"title": "Fullmetal Alchemist: Brotherhood", "rating": 9.1, "episodes": 64, "genres": ["Action", "Adventure", "Drama", "Fantasy"]},
    {"title": "Steins;Gate", "rating": 9.1, "episodes": 24, "genres": ["Drama", "Sci-Fi", "Suspense"]}
]

# --- Helper Function to Query AniList GraphQL API ---
def run_anilist_query(query: str, variables: dict = None):
    url = "https://graphql.anilist.co"
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
        
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode())

# --- 1. Fetch TOP 50 Anime dynamically from AniList ---
@app.get("/api/anime/trending")
def get_trending_anime():
    # GraphQL Query asking for Title, Score, Episodes, and Genres
    query = """
    query {
      Page(page: 1, perPage: 50) {
        media(type: ANIME, sort: TRENDING_DESC) {
          title {
            english
            romaji
          }
          averageScore
          episodes
          genres
        }
      }
    }
    """
    try:
        api_response = run_anilist_query(query)
        media_items = api_response.get("data", {}).get("Page", {}).get("media", [])
        
        trending_list = []
        for item in media_items:
            # Use English title if available, otherwise fall back to Romaji (e.g. Shingeki no Kyojin)
            title = item.get("title", {}).get("english") or item.get("title", {}).get("romaji") or "Unknown Title"
            
            # AniList returns ratings out of 100 (e.g., 85). We divide by 10 to fit our 10-star system (e.g., 8.5)
            raw_score = item.get("averageScore")
            rating = round(raw_score / 10.0, 1) if raw_score else 0.0
            
            trending_list.append({
                "title": title,
                "rating": rating,
                "episodes": item.get("episodes") or 12,
                "genres": item.get("genres") or []
            })
            
        return trending_list
    except Exception as e:
        print(f"⚠️ AniList query failed ({e}). Serving local fallback.")
        return FALLBACK_ANIME

# --- 2. Live Search ---
@app.get("/api/anime/search")
def search_external_anime(q: str):
    query = """
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(type: ANIME, search: $search) {
          title {
            english
            romaji
          }
          averageScore
          episodes
          genres
        }
      }
    }
    """
    try:
        api_response = run_anilist_query(query, {"search": q})
        media_items = api_response.get("data", {}).get("Page", {}).get("media", [])
        
        search_results = []
        for item in media_items:
            title = item.get("title", {}).get("english") or item.get("title", {}).get("romaji") or "Unknown Title"
            raw_score = item.get("averageScore")
            rating = round(raw_score / 10.0, 1) if raw_score else 0.0
            
            search_results.append({
                "title": title,
                "rating": rating,
                "episodes": item.get("episodes") or 12,
                "genres": item.get("genres") or []
            })
            
        return search_results
    except Exception as e:
        print(f"⚠️ Search failed: {e}")
        return []

# --- 3. Saved Vault endpoints ---
@app.get("/api/anime/vault")
def get_vault_anime():
    return vault_db

@app.post("/api/anime/vault")
def add_to_vault(anime: AnimeCreate):
    if any(a["title"].lower() == anime.title.lower() for a in vault_db):
        return {"message": "Already in vault", "status": "exists"}
        
    new_anime = {
        "id": len(vault_db) + 1,
        "title": anime.title,
        "rating": anime.rating,
        "episodes": anime.episodes,
        "genres": anime.genres
    }
    vault_db.append(new_anime)
    return new_anime