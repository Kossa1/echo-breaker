from flask import Flask, render_template, request, redirect, url_for
from backend_logic import load_tweets, get_survey_for_tweet

app = Flask(__name__)
tweets = load_tweets()


@app.route("/")
def index():
    tweets = load_tweets()
    return render_template("index.html", tweets=tweets, enumerate=enumerate)


@app.route("/results", methods=["POST"])
def results():
    user_guesses = {}
    comparison = []

    for i, tweet in enumerate(tweets):
        dem_guess = float(request.form.get(f"dem_{i}", 0))
        rep_guess = float(request.form.get(f"rep_{i}", 0))
        user_guesses[i] = {"dem": dem_guess, "rep": rep_guess}

        actual = get_survey_for_tweet(tweet["text"])
        comparison.append({
            "tweet": tweet,
            "user": user_guesses[i],
            "actual": actual
        })

    return render_template("result.html", comparison=comparison)

if __name__ == "__main__":
    app.run(debug=True)