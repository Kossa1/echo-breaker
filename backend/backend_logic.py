import pickle
from backend.db import SessionLocal
from backend.models import Survey, Post, Question, Response
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
from .db import SessionLocal
from .models import Response

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
    