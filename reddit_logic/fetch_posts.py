from .reddit_api import reddit_get
from html import unescape
import random
from .subreddit_list import sample_subreddit


def fetch_top_post(subreddit_name: str, limit: int = 5):
    """Fetch one random post from the top posts in the past day."""
    try:
        # raw_json=1 prevents HTML entity escaping in URLs
        response = reddit_get(f"/r/{subreddit_name}/top", params={"t": "day", "limit": limit, "raw_json": 1})
        posts = response.get("data", {}).get("children", [])
        return posts[random.randint(0, len(posts)-1)] if posts else None
    except Exception as e:
        print(f"Error fetching posts from r/{subreddit_name}: {e}")

def _clean_url(u: str | None) -> str | None:
    return unescape(u) if u else None

def extract_image_url(post_data: dict) -> str | None:
    """Return a direct image URL for a post if available."""
    # For crossposts, media often lives in the parent
    if post_data.get("crosspost_parent_list"):
        parent = post_data["crosspost_parent_list"][0]
        url = extract_image_url(parent)
        if url:
            return url

    url_overridden = post_data.get("url_overridden_by_dest") or post_data.get("url")
    post_hint = post_data.get("post_hint", "")
    domain = post_data.get("domain", "")

    exts = (".jpg", ".jpeg", ".png", ".gif", ".webp")
    if url_overridden and any(url_overridden.lower().endswith(ext) for ext in exts):
        return _clean_url(url_overridden)
    if post_hint == "image" or domain in ("i.redd.it", "i.imgur.com"):
        if url_overridden:
            return _clean_url(url_overridden)

    preview = post_data.get("preview")
    if preview and preview.get("images"):
        # Highest quality available
        src = preview["images"][0].get("source") or {}
        if src.get("url"):
            return _clean_url(src["url"])
        # Fallback to largest resolution
        res = (preview["images"][0].get("resolutions") or [])
        if res:
            return _clean_url(res[-1].get("url"))

    # Fallback thumbnail if it looks like a URL
    thumb = post_data.get("thumbnail")
    if thumb and thumb.startswith("http"):
        return _clean_url(thumb)

    return None

def extract_gallery_images(post_data: dict) -> list[str]:
    """Return list of gallery image URLs if this is a gallery post."""
    urls: list[str] = []
    if post_data.get("is_gallery") and post_data.get("media_metadata") and post_data.get("gallery_data"):
        items = post_data["gallery_data"].get("items", [])
        media = post_data["media_metadata"]
        for it in items:
            mid = it.get("media_id")
            meta = media.get(mid, {}) if mid else {}
            if not meta:
                continue
            # Prefer 's' (source), else largest in 'p'
            url = (meta.get("s") or {}).get("u")
            if not url:
                previews = meta.get("p") or []
                if previews:
                    url = previews[-1].get("u")
            if url:
                urls.append(unescape(url))
    return urls

def extract_video(post_data: dict) -> dict | None:
    """Return Reddit-hosted video info or oEmbed for external providers."""
    # For crossposts, fetch from parent
    if post_data.get("crosspost_parent_list"):
        parent = post_data["crosspost_parent_list"][0]
        vid = extract_video(parent)
        if vid:
            return vid

    media = post_data.get("secure_media") or post_data.get("media") or {}
    preview = post_data.get("preview") or {}

    rv = media.get("reddit_video") or preview.get("reddit_video_preview")
    if rv:
        return {
            "fallback_url": rv.get("fallback_url"),  # mp4
            "hls_url": rv.get("hls_url"),
            "dash_url": rv.get("dash_url"),
            "is_gif": rv.get("is_gif", False),
            "duration": rv.get("duration"),
            "width": rv.get("width"),
            "height": rv.get("height"),
            "is_reddit_hosted": True,
        }

    # External providers (imgur, gfycat, youtube) via oembed/type
    if media.get("oembed"):
        return {
            "oembed": media["oembed"],
            "provider": media.get("type"),
            "is_reddit_hosted": False,
        }

    return None

def build_post_view(post_data: dict) -> dict:
    """Normalize a Reddit post into a UI-friendly structure."""
    gallery = extract_gallery_images(post_data)
    image_url = extract_image_url(post_data) or (gallery[0] if gallery else None)
    video = extract_video(post_data)

    return {
        "post_id": post_data.get("id"),
        "subreddit": post_data.get("subreddit"),
        "title": post_data.get("title"),
        "author": post_data.get("author"),
        "selftext": post_data.get("selftext") or "",
        "permalink": f"https://reddit.com{post_data.get('permalink', '')}",
        "external_url": post_data.get("url_overridden_by_dest") or post_data.get("url"),
        "domain": post_data.get("domain"),
        "thumbnail": post_data.get("thumbnail") if str(post_data.get("thumbnail", "")).startswith("http") else None,

        # Media
        "image_url": image_url,
        "gallery": gallery,
        "video": video,

        # Flags
        "flags": {
            "is_self": post_data.get("is_self", False),
            "is_video": bool(video),
            "is_gallery": bool(gallery),
            "over_18": post_data.get("over_18", False),
            "spoiler": post_data.get("spoiler", False),
            "stickied": post_data.get("stickied", False),
            "locked": post_data.get("locked", False),
        },

        # Flair
        "flair": {
            "text": post_data.get("link_flair_text"),
            "richtext": post_data.get("link_flair_richtext"),
            "background_color": post_data.get("link_flair_background_color"),
        },

        # Stats
        "stats": {
            "score": post_data.get("score"),
            "ups": post_data.get("ups"),
            "upvote_ratio": post_data.get("upvote_ratio"),
            "num_comments": post_data.get("num_comments"),
            "awards": post_data.get("total_awards_received"),
            "created_utc": post_data.get("created_utc"),
        },
    }

def fetch_comments(post_id: str, limit: int = 3, length: int = 120) -> list[dict]:
    """Fetch top-level comments for a post."""
    try:
        response = reddit_get(f"/comments/{post_id}", params={"limit": limit, "raw_json": 1})
        comments = response[1].get("data", {}).get("children", [])
        out: list[dict] = []
        for c in comments:
            if c.get("kind") != "t1":
                continue
            d = c.get("data", {})
            body = d.get("body") or ""
            trimmed = body[:length] + ("..." if len(body) > length else "")
            out.append({
                "author": d.get("author"),
                "score": d.get("score"),
                "body": trimmed,
                "permalink": f"https://reddit.com{d.get('permalink', '')}",
            })
        return out
    except Exception as e:
        print(f"Error fetching comments for post {post_id}: {e}")
        return []

def execute_main_flow() -> dict:
    """Sample subreddits and return normalized post views."""
    subreddit_to_content: dict = {}
    while len(subreddit_to_content) < 5:
        subreddit = sample_subreddit()
        if not subreddit:
            print("No subreddit sampled.")
            continue

        post = fetch_top_post(subreddit.name)
        if not post:
            continue

        post_data = post.get("data", {})
        view = build_post_view(post_data)
        view["comments"] = fetch_comments(post_data.get("id", ""), limit=3, length=160)
        subreddit_to_content[subreddit.name] = view

    return subreddit_to_content


print(execute_main_flow())