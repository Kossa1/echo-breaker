from flask import Flask, render_template
from reddit_logic.fetch_posts import execute_main_flow

app = Flask(__name__)

@app.route("/")
def index():
    # Fetch 5 posts with images
    posts = execute_main_flow()
    # Only keep posts that have an image
    posts_with_images = [p for p in posts.values() if p.get("image_url")]
    return render_template("index.html", posts=posts_with_images)

if __name__ == "__main__":
    app.run(debug=True)
