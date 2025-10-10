import pickle

# Dummy tweet data, using the existing image and adding the slug
tweet_dicts = [
    {
        "text": "REPEAL THE 19TH. #RepealThe19th",
        "media_url": "https://pbs.twimg.com/media/G2VSZQCWcAABelf.jpg",
        "created_at": "2025-10-03 07:30:38",
        "slug": "67c191e0-4b64-11e5-9438-005056a8759d"
    }
]

# Save as pickle
with open("tweet_data.pkl", "wb") as f:
    pickle.dump(tweet_dicts, f)

print("Tweet saved to pickle with YouGov topic slug!")
