from flask import Flask, render_template, request, redirect, url_for
from reddit_logic.fetch_posts import execute_main_flow

app = Flask(__name__)

# In-memory cache of posts for the current session
posts_cache = []

@app.route("/")
def index():
    global posts_cache
    # Fetch all posts
    posts = execute_main_flow()
    all_posts = list(posts.values())

    # Separate posts with images and without
    posts_with_images = [p for p in all_posts if p.get("image_url")]
    posts_without_images = [p for p in all_posts if not p.get("image_url")]

    # Take up to 5 posts
    posts_cache = (posts_with_images[:5] + posts_without_images[:5])[:5]

    return render_template("index.html", posts=posts_cache)

@app.route("/submit", methods=["POST"])
def submit():
    # Grab user scores from the form
    user_scores = [int(request.form[f"score_{i}"]) for i in range(len(posts_cache))]

    # Actual score (currently all 0)
    actual_scores = [0] * len(posts_cache)

    # Compute differences
    differences = [abs(u - a) for u, a in zip(user_scores, actual_scores)]

    # Prepare a list of dicts for template
    results = [
        {
            "post": post,
            "user_score": user,
            "actual_score": actual,
            "difference": diff
        }
        for post, user, actual, diff in zip(posts_cache, user_scores, actual_scores, differences)
    ]

    return render_template("results.html", results=results)

if __name__ == "__main__":
    app.run(debug=True)
