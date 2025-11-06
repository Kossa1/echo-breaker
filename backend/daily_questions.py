"""
Daily question generation and management module.

This module handles:
- Daily question sampling (5 questions per day, same for all users)
- Timezone handling (America/New_York)
- Database persistence of daily questions
"""
import random
import json
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select
from db import SessionLocal
from models import DailyQuestion, UserAnswer, UserDailyScore

# Timezone for all date operations
EASTERN_TZ = ZoneInfo("America/New_York")
DEFAULT_NUM_QUESTIONS = 5

def get_eastern_date() -> str:
    """
    Get current date in Eastern timezone as YYYY-MM-DD string.
    All date operations should use this function to ensure consistency.
    """
    now_eastern = datetime.now(EASTERN_TZ)
    return now_eastern.strftime("%Y-%m-%d")

def load_all_available_posts():
    """
    Load all available posts from survey_metadata directory.
    Returns list of dicts with keys: id, img_path, dem, rep, topic
    """
    base_path = Path(__file__).resolve().parents[1] / "survey_metadata"
    
    if not base_path.exists():
        return []
    
    all_posts = []
    subdirs = [d for d in base_path.iterdir() if d.is_dir()]
    
    for subdir in subdirs:
        img_files = [
            f for f in subdir.iterdir() 
            if f.suffix.lower() in [".png", ".jpg", ".jpeg"]
        ]
        
        for img_path in img_files:
            json_path = subdir / (img_path.stem + ".json")
            
            if not json_path.exists():
                continue
            
            try:
                with open(json_path, 'r') as f:
                    gt = json.load(f)
                
                dem_value = gt.get("dem", None)
                rep_value = gt.get("rep", None)
                
                if dem_value is None or rep_value is None:
                    continue
                
                # Get relative path from survey_metadata directory
                relative_path = img_path.relative_to(base_path)
                
                # Create question ID: "subdir/image_name" (without extension)
                question_id = f"{subdir.name}/{img_path.stem}"
                
                all_posts.append({
                    "id": question_id,
                    "img_path": str(relative_path),
                    "topic": subdir.name,
                    "dem": float(dem_value),
                    "rep": float(rep_value)
                })
            except (json.JSONDecodeError, KeyError, IOError, ValueError):
                continue
    
    return all_posts

def ensure_daily_questions(date: str) -> list[dict]:
    """
    Ensure daily questions exist for the given date (YYYY-MM-DD).
    If they don't exist, generate and store 5 random unique questions.
    Returns list of daily question dicts with keys: id, img_path, topic, dem, rep, question_order
    """
    with SessionLocal() as session:
        # Check if questions already exist for this date
        existing = session.execute(
            select(DailyQuestion)
            .where(DailyQuestion.date == date)
            .order_by(DailyQuestion.question_order)
        ).scalars().all()
        
        if existing and len(existing) == DEFAULT_NUM_QUESTIONS:
            # Questions already exist, return them
            return [
                {
                    "id": dq.question_id,
                    "img_path": dq.img_path,
                    "topic": dq.topic,
                    "dem": dq.dem,
                    "rep": dq.rep,
                    "question_order": dq.question_order
                }
                for dq in existing
            ]
        
        # Need to generate new questions
        # First, get all available posts
        all_posts = load_all_available_posts()
        
        if len(all_posts) < DEFAULT_NUM_QUESTIONS:
            raise ValueError(f"Not enough posts available. Need {DEFAULT_NUM_QUESTIONS}, have {len(all_posts)}")
        
        # Get questions already used today (to avoid duplicates)
        used_ids = {dq.question_id for dq in existing}
        
        # Filter out already used questions
        available_posts = [p for p in all_posts if p["id"] not in used_ids]
        
        if len(available_posts) < DEFAULT_NUM_QUESTIONS - len(existing):
            # If we can't get enough unique questions, allow duplicates
            available_posts = all_posts
        
        # Sample the remaining questions needed
        needed = DEFAULT_NUM_QUESTIONS - len(existing)
        selected_posts = random.sample(available_posts, needed)
        
        # Store new questions in database
        start_order = len(existing)
        for idx, post in enumerate(selected_posts):
            dq = DailyQuestion(
                date=date,
                question_id=post["id"],
                question_order=start_order + idx,
                img_path=post["img_path"],
                dem=post["dem"],
                rep=post["rep"],
                topic=post.get("topic")
            )
            session.add(dq)
        
        session.commit()
        
        # Return all questions for this date (existing + new)
        all_questions = session.execute(
            select(DailyQuestion)
            .where(DailyQuestion.date == date)
            .order_by(DailyQuestion.question_order)
        ).scalars().all()
        
        return [
            {
                "id": dq.question_id,
                "img_path": dq.img_path,
                "topic": dq.topic,
                "dem": dq.dem,
                "rep": dq.rep,
                "question_order": dq.question_order
            }
            for dq in all_questions
        ]

def get_user_answers_for_date(user_id: str, date: str) -> list[dict]:
    """
    Get all answers for a user on a specific date.
    Returns list of answer dicts with keys: question_id, dem_guess, rep_guess, score, score_dem, score_rep
    """
    with SessionLocal() as session:
        answers = session.execute(
            select(UserAnswer)
            .where(UserAnswer.user_id == user_id, UserAnswer.date == date)
            .order_by(UserAnswer.submitted_at)
        ).scalars().all()
        
        return [
            {
                "question_id": ans.question_id,
                "dem_guess": ans.dem_guess,
                "rep_guess": ans.rep_guess,
                "score": ans.score,
                "score_dem": ans.score_dem,
                "score_rep": ans.score_rep
            }
            for ans in answers
        ]

def has_user_completed_date(user_id: str, date: str) -> bool:
    """
    Check if user has completed all 5 questions for a given date.
    """
    answers = get_user_answers_for_date(user_id, date)
    return len(answers) >= DEFAULT_NUM_QUESTIONS

def compute_rankings_for_date(date: str) -> dict:
    """
    Compute rankings for all users who completed the date.
    Returns dict with:
    - daily_ranks: {user_id: rank} based on avg_score
    - daily_ranks_dem: {user_id: rank} based on avg_score_dem
    - daily_ranks_rep: {user_id: rank} based on avg_score_rep
    - question_ranks: {question_id: {user_id: rank}} based on per-question scores
    - question_ranks_dem: {question_id: {user_id: rank}} based on per-question score_dem
    - question_ranks_rep: {question_id: {user_id: rank}} based on per-question score_rep
    """
    with SessionLocal() as session:
        # Get all daily scores for this date
        daily_scores = session.execute(
            select(UserDailyScore)
            .where(UserDailyScore.date == date)
            .order_by(UserDailyScore.avg_score.desc())
        ).scalars().all()
        
        # Compute daily ranks (ties place user at top of tie)
        daily_ranks = {}
        current_rank = 1
        prev_score = None
        
        for score in daily_scores:
            if prev_score is not None and score.avg_score < prev_score:
                current_rank = len(daily_ranks) + 1
            daily_ranks[score.user_id] = current_rank
            prev_score = score.avg_score
        
        # Compute daily ranks for Democrat scores
        daily_scores_dem = session.execute(
            select(UserDailyScore)
            .where(UserDailyScore.date == date)
            .order_by(UserDailyScore.avg_score_dem.desc())
        ).scalars().all()
        
        daily_ranks_dem = {}
        current_rank_dem = 1
        prev_score_dem = None
        
        for score in daily_scores_dem:
            if prev_score_dem is not None and score.avg_score_dem < prev_score_dem:
                current_rank_dem = len(daily_ranks_dem) + 1
            daily_ranks_dem[score.user_id] = current_rank_dem
            prev_score_dem = score.avg_score_dem
        
        # Compute daily ranks for Republican scores
        daily_scores_rep = session.execute(
            select(UserDailyScore)
            .where(UserDailyScore.date == date)
            .order_by(UserDailyScore.avg_score_rep.desc())
        ).scalars().all()
        
        daily_ranks_rep = {}
        current_rank_rep = 1
        prev_score_rep = None
        
        for score in daily_scores_rep:
            if prev_score_rep is not None and score.avg_score_rep < prev_score_rep:
                current_rank_rep = len(daily_ranks_rep) + 1
            daily_ranks_rep[score.user_id] = current_rank_rep
            prev_score_rep = score.avg_score_rep
        
        # Get all answers for this date, grouped by question
        all_answers = session.execute(
            select(UserAnswer)
            .where(UserAnswer.date == date)
            .order_by(UserAnswer.score.desc())
        ).scalars().all()
        
        # Group by question_id and compute per-question ranks
        question_ranks = {}
        question_ranks_dem = {}
        question_ranks_rep = {}
        question_groups = {}
        
        for ans in all_answers:
            if ans.question_id not in question_groups:
                question_groups[ans.question_id] = []
            question_groups[ans.question_id].append(ans)
        
        for question_id, answers_list in question_groups.items():
            # Overall question ranks
            question_ranks[question_id] = {}
            current_q_rank = 1
            prev_q_score = None
            
            for ans in sorted(answers_list, key=lambda x: x.score, reverse=True):
                if prev_q_score is not None and ans.score < prev_q_score:
                    current_q_rank = len([k for k in question_ranks[question_id].keys()]) + 1
                question_ranks[question_id][ans.user_id] = current_q_rank
                prev_q_score = ans.score
            
            # Democrat question ranks
            question_ranks_dem[question_id] = {}
            current_q_rank_dem = 1
            prev_q_score_dem = None
            
            for ans in sorted(answers_list, key=lambda x: x.score_dem, reverse=True):
                if prev_q_score_dem is not None and ans.score_dem < prev_q_score_dem:
                    current_q_rank_dem = len([k for k in question_ranks_dem[question_id].keys()]) + 1
                question_ranks_dem[question_id][ans.user_id] = current_q_rank_dem
                prev_q_score_dem = ans.score_dem
            
            # Republican question ranks
            question_ranks_rep[question_id] = {}
            current_q_rank_rep = 1
            prev_q_score_rep = None
            
            for ans in sorted(answers_list, key=lambda x: x.score_rep, reverse=True):
                if prev_q_score_rep is not None and ans.score_rep < prev_q_score_rep:
                    current_q_rank_rep = len([k for k in question_ranks_rep[question_id].keys()]) + 1
                question_ranks_rep[question_id][ans.user_id] = current_q_rank_rep
                prev_q_score_rep = ans.score_rep
        
        return {
            "daily_ranks": daily_ranks,
            "daily_ranks_dem": daily_ranks_dem,
            "daily_ranks_rep": daily_ranks_rep,
            "question_ranks": question_ranks,
            "question_ranks_dem": question_ranks_dem,
            "question_ranks_rep": question_ranks_rep
        }

def get_user_historical_average(user_id: str) -> dict | None:
    """
    Get user's historical average score across all days they've completed.
    Returns dict with keys: 'overall', 'dem', 'rep' or None if user has no completed days.
    """
    with SessionLocal() as session:
        scores = session.execute(
            select(UserDailyScore)
            .where(UserDailyScore.user_id == user_id)
        ).scalars().all()
        
        if not scores:
            return None
        
        total_overall = sum(s.avg_score for s in scores)
        total_dem = sum(s.avg_score_dem for s in scores)
        total_rep = sum(s.avg_score_rep for s in scores)
        count = len(scores)
        
        return {
            'overall': total_overall / count,
            'dem': total_dem / count,
            'rep': total_rep / count
        }

