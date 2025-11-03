import os
import random
import json
from pathlib import Path

from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
from backend_logic import sample_unique_posts

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

# Default number of questions per quiz
DEFAULT_NUM_QUESTIONS = 5

# Cache available tweet posts on startup for performance
def _load_all_posts():
    """Load all available posts and cache them."""
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
                
                all_posts.append({
                    "id": f"{subdir.name}/{img_path.stem}",
                    "img_path": str(relative_path),
                    "topic": subdir.name,
                    "dem": dem_value,
                    "rep": rep_value
                })
            except (json.JSONDecodeError, KeyError, IOError):
                continue
    
    return all_posts

# Cache posts on startup
_cached_posts = _load_all_posts()

@app.route("/")
def index():
    """Redirect to start a new quiz."""
    return redirect(url_for('start_quiz'))

@app.route("/start")
def start_quiz():
    """Initialize session with 5 unique problems."""
    # Sample 5 unique posts
    problems = sample_unique_posts(n=DEFAULT_NUM_QUESTIONS)
    
    if not problems:
        return render_template("index.html", 
                             error="No posts available",
                             current_idx=0,
                             total_questions=0)
    
    # Initialize session
    session['problems'] = problems
    session['current_idx'] = 0
    session['responses'] = []
    
    # Redirect to first question
    return redirect(url_for('display_problem'))

@app.route("/problem")
def display_problem():
    """Display the current question."""
    problems = session.get('problems')
    current_idx = session.get('current_idx', 0)
    
    # Check if quiz is initialized
    if not problems:
        return redirect(url_for('start_quiz'))
    
    # Check if all questions are answered
    if current_idx >= len(problems):
        return redirect(url_for('show_results'))
    
    # Get current problem
    current_problem = problems[current_idx]
    
    # Get image path (already relative to survey_metadata directory)
    post_image = current_problem['img_path']
    
    return render_template("index.html",
                          post_image=post_image,
                          current_idx=current_idx,
                          total_questions=len(problems),
                          question_number=current_idx + 1)

@app.post("/submit_answer")
def submit_answer():
    """Process user answer and move to next question."""
    problems = session.get('problems')
    current_idx = session.get('current_idx', 0)
    
    if not problems or current_idx >= len(problems):
        return redirect(url_for('start_quiz'))
    
    # Get user guesses
    dem_guess = float(request.form.get("dem_0", 0) or 0)
    rep_guess = float(request.form.get("rep_0", 0) or 0)
    
    # Get current problem data
    current_problem = problems[current_idx]
    dem_gt = current_problem['dem_gt']
    rep_gt = current_problem['rep_gt']
    img_path = current_problem['img_path']
    
    # Compute scores
    dem_score = 100 - abs(dem_guess - dem_gt)
    rep_score = 100 - abs(rep_guess - rep_gt)
    total_score = (dem_score + rep_score) / 2
    
    # Store response
    response = {
        "img_path": img_path,
        "user_dem": dem_guess,
        "user_rep": rep_guess,
        "dem_gt": dem_gt,
        "rep_gt": rep_gt,
        "dem_score": dem_score,
        "rep_score": rep_score,
        "total_score": total_score
    }
    
    # Update session
    responses = session.get('responses', [])
    responses.append(response)
    session['responses'] = responses
    session['current_idx'] = current_idx + 1
    
    # Check if quiz is complete
    if current_idx + 1 >= len(problems):
        return redirect(url_for('show_results'))
    else:
        return redirect(url_for('display_problem'))

@app.route("/results")
def show_results():
    """Display results summary for all questions."""
    responses = session.get('responses', [])
    problems = session.get('problems', [])
    
    if not responses:
        return redirect(url_for('start_quiz'))
    
    # Prepare comparison data for template
    comparison = []
    total_score_sum = 0
    
    for response in responses:
        # Get image path (already relative to survey_metadata directory)
        post_image = response['img_path']
        
        comparison.append({
            "post_image": post_image,
            "user": {
                "dem": response['user_dem'],
                "rep": response['user_rep']
            },
            "actual": {
                "dem": response['dem_gt'],
                "rep": response['rep_gt']
            },
            "scores": {
                "dem_score": response['dem_score'],
                "rep_score": response['rep_score'],
                "total_score": response['total_score']
            }
        })
        
        total_score_sum += response['total_score']
    
    # Calculate average score
    average_score = total_score_sum / len(responses) if responses else 0
    
    return render_template("result.html",
                          comparison=comparison,
                          average_score=average_score,
                          total_questions=len(responses))

@app.route("/reset")
def reset_quiz():
    """Clear session and start a new quiz."""
    session.clear()
    return redirect(url_for('start_quiz'))

@app.route("/api/restart", methods=['POST', 'GET'])
def restart_game():
    """Clear current game session to allow starting a new game."""
    session.pop('game_questions', None)
    session.pop('game_started', None)
    return jsonify({"message": "Game session cleared. Call /api/start_game to begin a new game."})

@app.route("/api/start_game", methods=['POST', 'GET'])
def start_game():
    """Initialize a game session with 5 unique questions."""
    global _cached_posts
    
    # Reload cache if empty (in case survey_metadata was updated)
    if not _cached_posts:
        _cached_posts = _load_all_posts()
    
    if not _cached_posts:
        return jsonify({"error": "No posts available"}), 404
    
    # Sample 5 unique posts (ensuring no duplicates)
    if len(_cached_posts) < DEFAULT_NUM_QUESTIONS:
        # If not enough posts, use what we have
        selected_posts = _cached_posts
    else:
        # Sample without replacement
        selected_posts = random.sample(_cached_posts, DEFAULT_NUM_QUESTIONS)
    
    # Store full question data in session (including ground truth)
    session['game_questions'] = selected_posts
    session['game_started'] = True
    
    # Return list of question indices and total count
    return jsonify({
        "total_questions": len(selected_posts),
        "question_ids": list(range(len(selected_posts)))
    })

@app.route("/api/get_question/<int:index>", methods=['GET'])
def get_question(index):
    """Return question at specified index (0-based) without ground truth."""
    questions = session.get('game_questions')
    
    if not questions:
        return jsonify({"error": "Game not started. Call /api/start_game first"}), 400
    
    if index < 0 or index >= len(questions):
        return jsonify({"error": f"Invalid question index. Must be between 0 and {len(questions)-1}"}), 400
    
    post = questions[index]
    
    # Build image URL using url_for to point to the Flask-served static path
    image_url = url_for('serve_survey_image', filename=post['img_path'])
    
    # Return only ID and image URL (no ground truth)
    return jsonify({
        "id": post["id"],
        "image_url": image_url,
        "topic": post.get("topic", "unknown"),
        "index": index
    })

@app.route("/api/submit_results", methods=['POST'])
def submit_results():
    """Accept user answers for all questions and return scored feedback."""
    questions = session.get('game_questions')
    
    if not questions:
        return jsonify({"error": "Game not started. Call /api/start_game first"}), 400
    
    # Get user answers from request
    data = request.get_json()
    if not data or 'answers' not in data:
        return jsonify({"error": "Missing 'answers' in request body"}), 400
    
    user_answers = data['answers']
    
    if len(user_answers) < len(questions):
        return jsonify({"error": f"Expected at least {len(questions)} answers, got {len(user_answers)}"}), 400
    
    # Process each answer and compute scores
    # Create a lookup map by question ID for efficient matching
    question_map = {q['id']: q for q in questions}
    
    results = []
    total_score_sum = 0
    
    for answer in user_answers:
        answer_id = answer.get('id')
        if not answer_id or answer_id not in question_map:
            continue
        
        question = question_map[answer_id]
        user_dem = float(answer.get('user', {}).get('dem', 0))
        user_rep = float(answer.get('user', {}).get('rep', 0))
        
        # Get ground truth
        dem_gt = question['dem']
        rep_gt = question['rep']
        
        # Compute scores (100 - absolute difference)
        dem_score = max(0, 100 - abs(user_dem - dem_gt))
        rep_score = max(0, 100 - abs(user_rep - rep_gt))
        total_score = (dem_score + rep_score) / 2
        total_score_sum += total_score
        
        # Build image URL
        image_url = url_for('serve_survey_image', filename=question['img_path'])
        
        results.append({
            "id": question["id"],
            "image_url": image_url,
            "topic": question.get("topic", "unknown"),
            "user": {
                "dem": user_dem,
                "rep": user_rep
            },
            "actual": {
                "dem": dem_gt,
                "rep": rep_gt
            },
            "scores": {
                "dem_score": round(dem_score, 2),
                "rep_score": round(rep_score, 2),
                "total_score": round(total_score, 2)
            }
        })
    
    # Calculate average score
    average_score = round(total_score_sum / len(results), 2) if results else 0
    
    # Clear game session
    session.pop('game_questions', None)
    session.pop('game_started', None)
    
    return jsonify({
        "results": results,
        "average_score": average_score,
        "total_questions": len(results)
    })

@app.route("/api/random_tweet", methods=['GET'])
def random_tweet():
    """Return one randomly sampled tweet + metadata."""
    global _cached_posts
    
    # Reload cache if empty (in case survey_metadata was updated)
    if not _cached_posts:
        _cached_posts = _load_all_posts()
    
    if not _cached_posts:
        return jsonify({"error": "No posts available"}), 404
    
    # Randomly sample one post
    post = random.choice(_cached_posts)
    
    # Build image URL using url_for to point to the Flask-served static path
    image_url = url_for('serve_survey_image', filename=post['img_path'])
    
    # Return JSON without ground-truth for gameplay fairness
    # The frontend will get dem/rep values after submission if needed
    return jsonify({
        "id": post["id"],
        "image_url": image_url,
        "topic": post["topic"],
        # Include dem/rep in response (can be hidden later if needed for fairness)
        "dem": post["dem"],
        "rep": post["rep"]
    })

@app.route("/survey_metadata/<path:filename>")
def serve_survey_image(filename):
    """Serve images from survey_metadata directory, handling nested paths."""
    base_path = Path(__file__).resolve().parents[1] / "survey_metadata"
    file_path = base_path / filename
    
    # Security check: ensure the file is within the base directory
    try:
        file_path.resolve().relative_to(base_path.resolve())
    except ValueError:
        return "File not found", 404
    
    if not file_path.exists():
        return "File not found", 404

    directory = str(file_path.parent)
    filename_only = file_path.name
    return send_from_directory(directory, filename_only)

if __name__ == "__main__":
    app.run(debug=True)