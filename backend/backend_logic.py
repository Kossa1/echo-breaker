import pickle

# Hardcoded survey for now (mimicking notebook)
SURVEY_HARDCODED = {
    "Should be allowed to vote": {"dem": 97, "ind": 93, "rep": 94},
    "Should NOT be allowed to vote": {"dem": 2, "ind": 5, "rep": 3},
    "Not sure": {"dem": 1, "ind": 2, "rep": 3}
}

def load_tweets(pickle_path="tweet_data.pkl"):
    """Load tweets from pickle file."""
    with open(pickle_path, "rb") as f:
        tweets = pickle.load(f)
    return tweets

def get_survey_for_tweet(tweet_text):
    """
    Hardcode a mapping between tweets and survey stance.
    In the future, you can match using slug or topic.
    """
    return SURVEY_HARDCODED["Should NOT be allowed to vote"]
    