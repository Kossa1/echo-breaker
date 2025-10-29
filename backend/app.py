import os

from flask import Flask, render_template, request, jsonify
from backend_logic import load_posts, get_question_with_responses, get_actual_for_question, load_random_tweet_image

from db import SessionLocal
from models import Question
from sqlalchemy import select

app = Flask(__name__)

# ---- temporary hardcoding for explicit lookup ----
TARGET_QUESTION_ID = os.getenv("TARGET_QUESTION_ID")  # explicitly provide question id, if available
TARGET_QUESTION_PROMPT_CONTAINS = os.getenv("TARGET_QUESTION_PROMPT_CONTAINS", "women should or should not be allowed to vote")
TARGET_RESPONSE_TEXT = os.getenv("TARGET_RESPONSE_TEXT", "Should NOT be allowed to vote")

def _resolve_target_question_id():
    """Prefer explicit TARGET_QUESTION_ID; else find one by prompt substring (case-insensitive)."""
    if TARGET_QUESTION_ID:
        try:
            return int(TARGET_QUESTION_ID)
        except ValueError:
            pass
    with SessionLocal() as s:
        # case-insensitive contains
        needle = f"%{TARGET_QUESTION_PROMPT_CONTAINS.lower()}%"
        q = s.execute(
            select(Question.id).where(Question.prompt.is_not(None))
        ).scalars().all()

        # do the case-insensitive filter in Python for SQLite portability
        # (avoids dialect differences with ILIKE)
        for qid in q:
            qrow = s.get(Question, qid)
            if qrow and TARGET_QUESTION_PROMPT_CONTAINS.lower() in (qrow.prompt or "").lower():
                return qrow.id
    return None

RESOLVED_QUESTION_ID = _resolve_target_question_id()

@app.route("/")
def index():
    topic_id = request.args.get("topic_id")
    posts = load_posts(topic_id=topic_id, limit=20)
    tweet_image = load_random_tweet_image()
    return render_template("index.html", tweets=posts, enumerate=enumerate, tweet_image=tweet_image)

@app.post("/results")
def results():
    # fetch the same list the form used, so indexes line up
    posts = load_posts(limit=20)

    user_guesses, comparison = {}, []
    for i, post in enumerate(posts):
        dem_guess = float(request.form.get(f"dem_{i}", 0) or 0)
        rep_guess = float(request.form.get(f"rep_{i}", 0) or 0)
        user_guesses[i] = {"dem": dem_guess, "rep": rep_guess}

        # fallback "actual" (same as the original app) until you wire DB mapping
        actual = get_actual_for_question(RESOLVED_QUESTION_ID, TARGET_RESPONSE_TEXT)

        comparison.append({
            "tweet": post,          # keep key name "tweet" for result.html
            "user": user_guesses[i],
            "actual": actual
        })

    return render_template("result.html", comparison=comparison)

@app.get("/api/posts")
def api_posts():
    topic_id = request.args.get("topic_id")
    limit = int(request.args.get("limit", 50))
    return jsonify(load_posts(limit=limit, topic_id=topic_id))

@app.get("/api/questions/<int:q_id>/responses")
def api_question(q_id: int):
    data = get_question_with_responses(q_id)
    return (jsonify(data), 200) if data else (jsonify({"error":"not found"}), 404)

if __name__ == "__main__":
    app.run(debug=True)