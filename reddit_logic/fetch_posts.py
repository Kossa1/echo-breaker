from subreddit_list import sample_subreddit
from reddit_api import reddit_get
import random

def fetch_top_post(subreddit_name: str, limit: int = 5) -> None:
    """Fetch and print top posts from a given subreddit from past day."""
    try:
        response = reddit_get(f"/r/{subreddit_name}/top", params={"t": "day", "limit": limit})
        posts = response.get("data", {}).get("children", [])
        return posts[random.randint(0, len(posts)-1)] if posts else None
    except Exception as e:
        print(f"Error fetching posts from r/{subreddit_name}: {e}")

def fetch_comments(post_id: str, limit: int = 3, length: int = 100) -> None:
    """Fetch and return top comments from a given post. Trimmed to limit and add ... ."""
    try:
        response = reddit_get(f"/comments/{post_id}", params={"limit": limit})
        comments = response[1].get("data", {}).get("children", [])
        return [comment['data'].get('body')[:length] + "..." for comment in comments if comment.get("kind") == "t1"]
    except Exception as e:
        print(f"Error fetching comments for post {post_id}: {e}")
        return []

def execute_main_flow() -> None:
    """Main execution flow to sample subreddits and fetch posts."""
    subreddit_to_content = {}
    while len(subreddit_to_content) < 5:
        subreddit = sample_subreddit()
        if subreddit:
            post = fetch_top_post(subreddit.name)
            if post:
                post_data = post.get("data", {})
                comments = fetch_comments(post_data.get("id", ""), limit=3)
                subreddit_to_content[subreddit.name] = {
                    "post_title": post_data.get("title", "No Title"),
                    "post_url": f"https://reddit.com{post_data.get('permalink', '')}",
                    "comments": comments
                }

        else:
            print("No subreddit sampled.")
    
    return subreddit_to_content


print(execute_main_flow())
    
