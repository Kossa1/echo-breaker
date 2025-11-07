from playwright.sync_api import sync_playwright

### read json file, get question and prompt, automatically generate Grok prompt. (specify link only)

import os, json
import re
meta_root = "/home/jiaji02/Desktop/EchoBreaker/echo-breaker/survey_metadata"
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import x_search
client = Client(api_key="xai")

def parse_tweet_urls(raw_text):
    # find all http/https URLs that look like x.com or twitter.com links
    urls = re.findall(r'https?://(?:x|twitter)\.com/[^\s)>\]]+', raw_text, flags=re.IGNORECASE)
    clean_urls = []
    for u in urls:
        u = u.strip().rstrip('.,;')
        # normalize domain
        u = re.sub(r'^(https?://)(?:www\.)?(?:x|twitter)\.com', r'\1fxtwitter.com', u, flags=re.IGNORECASE)
        clean_urls.append(u)
    return clean_urls

def screenshot_tweet(url, out_path):
    """take cropped tweet screenshot"""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox"],
        )
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        page.goto(url, wait_until="load", timeout=15000)
        try:
            page.wait_for_selector("article", timeout=10000)
            tweet = page.query_selector("article")
            if tweet:
                tweet.screenshot(path=out_path)
                print(f"✅ saved tweet-only screenshot → {out_path}")
            else:
                page.screenshot(path=out_path, full_page=False)
                print(f"⚠️ saved full page (tweet not found) → {out_path}")
        except Exception as e:
            print(f"❌ error capturing {url}: {e}")
        browser.close()

for root, dirs, files in os.walk(meta_root):
    try:
        print(f"\n=== {os.path.basename(root)} ===\n")
        if "ground_truth.json" not in files:
            continue
        
        json_path = os.path.join(root, "ground_truth.json")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        question = data.get("question", "").strip()
        prompt = data.get("prompt", "").strip()
        responses = [r["response"] for r in data.get("responses", []) if r.get("response")]
        opts_in_prompt = " | ".join(responses)

        # construct Grok prompt
        grok_prompt = (
            "Please find 3 (ideally recent) tweets from well-known individuals (activists, commentators, influencers), "
            "that discuss or are relevant to the topic this survey question is about:\n"
            f"'{question}. {prompt}. {opts_in_prompt}'\n"
            "Each tweet should clearly express a stance or opinion that could be naturally mapped "
            "Exclude posts by official parties or organizations.\n"
            "Exclude any tweets that discuss or reference poll results, surveys, or voting outcomes.\n"
            "Only include tweets that are text + image OR text alone, but no videos.\n"
            "Only include tweets that have significant engagement (lots of likes/retweets).\n"
            "Return only tweet URLs, one per line, no markdown, no quotes, no extra text.\n"
        )
        
        print(grok_prompt)
        
        chat = client.chat.create(
            model="grok-4-fast",  # reasoning model
            tools=[x_search()],
        )
        chat.append(user(grok_prompt))
        response = chat.sample()
        print(response.content)
        tweet_urls_list = parse_tweet_urls(response.content)
        print("parsed urls:", tweet_urls_list)
        
        for i, url in enumerate(tweet_urls_list, start=1):
            out_path = os.path.join(root, f"tweet_{i}.png")
            screenshot_tweet(url, out_path)
    except Exception as e:
        continue