import os
from pathlib import Path

from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory
from backend_logic import sample_unique_posts

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

# Default number of questions per quiz
DEFAULT_NUM_QUESTIONS = 5

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