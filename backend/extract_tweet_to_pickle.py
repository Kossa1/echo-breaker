import pickle
from uuid import uuid4
from datetime import datetime
import shutil
import os

# --- Step 1: Define image and static folder ---
IMAGE_NAME = "IMG_7471.png"
STATIC_FOLDER = "static"
OUTPUT_FILE = "tweet_data.pkl"

# Make sure the static folder exists
os.makedirs(STATIC_FOLDER, exist_ok=True)

# Copy the image into the static folder
dest_path = os.path.join(STATIC_FOLDER, IMAGE_NAME)
shutil.copy2(IMAGE_NAME, dest_path)

# --- Step 2: Build tweet dictionary ---
tweet_dicts = [
    {
        "text": "",  # No text for this tweet
        "media_url": f"/static/{IMAGE_NAME}",  # Flask static path
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "slug": str(uuid4())
    }
]

# --- Step 3: Save as pickle ---
with open(OUTPUT_FILE, "wb") as f:
    pickle.dump(tweet_dicts, f)

print(f"✅ Tweet saved to {OUTPUT_FILE} with image in static folder!")
