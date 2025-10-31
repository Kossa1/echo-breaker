import pickle
import random
import os
import json
from pathlib import Path
from db import SessionLocal
from models import Survey, Post, Question, Response
from sqlalchemy import select, desc

def load_posts(limit=50, topic_id=None):
    with SessionLocal() as s:
        stmt = select(Post).order_by(Post.id.desc()).limit(limit)
        if topic_id:
            stmt = stmt.filter(Post.topic_id == topic_id)
        return [
            {
                "id": p.id,
                "text": p.text,
                "media_url": p.media_url,
                "created_at": p.created_at_ts.isoformat() if p.created_at_ts else None,
                "topic_id": p.topic_id,
            }
            for p in s.execute(stmt).scalars().all()
        ]

def get_question_with_responses(question_id: int):
    with SessionLocal() as s:
        q = s.get(Question, question_id)
        if not q: return None
        return {
            "id": q.id, "prompt": q.prompt, "qnum": q.qnum,
            "responses": [
                {"text": r.response_text, "total": r.total, "dem": r.dem, "ind": r.ind, "rep": r.rep}
                for r in q.responses
            ]
        }

# backend/backend_logic.py
from sqlalchemy import select
from db import SessionLocal
from models import Response

def get_actual_for_question(question_id: int, response_text: str) -> dict:
    """
    Return {"dem": x, "ind": y, "rep": z} for a specific (question_id, response_text).
    Matching is case/whitespace-insensitive and falls back to highest-total if not found.
    """
    if not question_id or not response_text:
        return {"dem": None, "ind": None, "rep": None}

    norm_target = response_text.strip().lower()

    with SessionLocal() as s:
        rows = s.execute(
            select(Response).where(Response.question_id == question_id)
        ).scalars().all()

        # exact (case/space-insensitive) match first
        for r in rows:
            if (r.response_text or "").strip().lower() == norm_target:
                return {"dem": r.dem, "ind": r.ind, "rep": r.rep}

        # optional: tolerant contains-match
        for r in rows:
            if norm_target in (r.response_text or "").strip().lower():
                return {"dem": r.dem, "ind": r.ind, "rep": r.rep}

        # final fallback: highest 'total' for that question
        if rows:
            best = max(rows, key=lambda x: (x.total is not None, x.total))
            return {"dem": best.dem, "ind": best.ind, "rep": best.rep}

    return {"dem": None, "ind": None, "rep": None}


# # Hardcoded survey for now (mimicking notebook)
# SURVEY_HARDCODED = {
#     "Should be allowed to vote": {"dem": 97, "ind": 93, "rep": 94},
#     "Should NOT be allowed to vote": {"dem": 2, "ind": 5, "rep": 3},
#     "Not sure": {"dem": 1, "ind": 2, "rep": 3}
# }
#
# def load_tweets(pickle_path="tweet_data.pkl"):
#     """Load tweets from pickle file."""
#     with open(pickle_path, "rb") as f:
#         tweets = pickle.load(f)
#     return tweets
#
# def get_survey_for_tweet(tweet_text):
#     """
#     Hardcode a mapping between tweets and survey stance.
#     In the future, you can match using slug or topic.
#     """
#     return SURVEY_HARDCODED["Should NOT be allowed to vote"]

def load_random_tweet_image():
    """Load a random tweet image from the tweet_images directory."""
    img_dir = Path(__file__).resolve().parents[1] / "tweet_images"
    imgs = [f.name for f in img_dir.glob("*") if f.suffix.lower() in [".png", ".jpg", ".jpeg"]]
    return f"tweet_images/{random.choice(imgs)}" if imgs else None

def get_random_post(base_dir="survey_metadata"):
    """
    Randomly sample one subdirectory from survey_metadata/, 
    randomly pick one image from that subdirectory,
    read the corresponding JSON file, and return image path and ground truth values.
    
    Returns:
        tuple: (image_path, dem_value, rep_value) or (None, None, None) if no posts found
    """
    base_path = Path(__file__).resolve().parents[1] / base_dir
    
    if not base_path.exists():
        return None, None, None
    
    # Get all subdirectories
    subdirs = [d for d in base_path.iterdir() if d.is_dir()]
    
    if not subdirs:
        return None, None, None
    
    # Randomly choose a subdirectory
    subdir = random.choice(subdirs)
    
    # Find all image files in the subdirectory
    img_files = [
        f for f in subdir.iterdir() 
        if f.suffix.lower() in [".png", ".jpg", ".jpeg"]
    ]
    
    if not img_files:
        return None, None, None
    
    # Randomly choose an image
    img_path = random.choice(img_files)
    
    # Find corresponding JSON file (same basename)
    json_path = subdir / (img_path.stem + ".json")
    
    if not json_path.exists():
        return None, None, None
    
    # Read ground truth from JSON
    try:
        with open(json_path, 'r') as f:
            gt = json.load(f)
        
        dem_value = gt.get("dem", None)
        rep_value = gt.get("rep", None)
        
        # Return relative path from project root for serving
        # relative_path = img_path.relative_to(Path(__file__).resolve().parents[1])
        
        relative_path = img_path.relative_to(base_path.parent)
        print("Relative path:", relative_path)
        
        return str(relative_path), dem_value, rep_value
    
    except (json.JSONDecodeError, KeyError, IOError) as e:
        return None, None, None
    