import os
from pathlib import Path

from flask import Flask, render_template, request, jsonify, session, send_from_directory
from backend_logic import get_random_post

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

@app.route("/")
def index():
    """Display a random post from survey_metadata with sliders for user guesses."""
    # Get a random post with ground truth
    img_path, dem_gt, rep_gt = get_random_post()
    
    if not img_path or dem_gt is None or rep_gt is None:
        # Fallback if no posts found
        return render_template("index.html", 
                             post_image=None, 
                             dem_gt=None, 
                             rep_gt=None,
                             error="No posts available")
    
    post_image = str(Path(img_path).relative_to("survey_metadata"))
    # Store ground truth in session for scoring later
    session['dem_gt'] = dem_gt
    session['rep_gt'] = rep_gt
    session['img_path'] = img_path
    
    return render_template("index.html", 
                          post_image=post_image,
                          dem_gt=dem_gt,
                          rep_gt=rep_gt)

@app.post("/results")
def results():
    """Process user guesses and compute scores against ground truth."""
    # Get user guesses from form
    dem_guess = float(request.form.get("dem_0", 0) or 0)
    rep_guess = float(request.form.get("rep_0", 0) or 0)
    
    # Get ground truth from session
    dem_gt = session.get('dem_gt')
    rep_gt = session.get('rep_gt')
    img_path = session.get('img_path')
    
    if dem_gt is None or rep_gt is None:
        return render_template("result.html", 
                               comparison=None,
                               error="Ground truth data not found. Please try again.")
    
    # Compute scores
    dem_score = 100 - abs(dem_guess - dem_gt)
    rep_score = 100 - abs(rep_guess - rep_gt)
    total_score = (dem_score + rep_score) / 2
    
    post_image = str(Path(img_path).relative_to("survey_metadata"))
    # Prepare result data
    comparison = [{
        "post_image": post_image,
        "user": {"dem": dem_guess, "rep": rep_guess},
        "actual": {"dem": dem_gt, "rep": rep_gt},
        "scores": {
            "dem_score": dem_score,
            "rep_score": rep_score,
            "total_score": total_score
        }
    }]
    
    return render_template("result.html", comparison=comparison)

@app.route("/<path:filename>")
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