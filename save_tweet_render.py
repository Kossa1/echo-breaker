import pickle

with open("/home/jiaji02/Desktop/Social_Computing/twitter_posts/bbde58fc-a904-11e1-9412-005056900141_Do_you_think_that_women_should_or_should_not_be_al.pkl","rb") as f:
    tweet_texts_list = pickle.load(f)
    
import html
from playwright.sync_api import sync_playwright


# ---------- 1. build tweet card html ----------
def build_tweet_card_html(text, media_url=None, created_at=None):
    safe_text = html.escape(text).replace("\n", "<br>")

    profile_pic_url = "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    fake_name = "User"
    fake_handle = "@anonymous"

    html_block = f"""
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background-color:#f5f8fa; padding:20px;">
    <div style="
        border:1px solid #e1e8ed;
        border-radius:16px;
        padding:12px;
        margin:0 auto;
        font-family:'Segoe UI', Arial, sans-serif;
        font-size:15px;
        line-height:1.4;
        color:#0f1419;
        max-width:520px;
        box-shadow:0 1px 3px rgba(0,0,0,0.08);
        background-color:#ffffff;
    ">
        <div style="display:flex; align-items:center; margin-bottom:8px;">
            <img src="{profile_pic_url}" style="width:40px; height:40px; border-radius:50%; margin-right:10px;">
            <div>
                <div style="font-weight:600;">{fake_name}</div>
                <div style="color:#536471; font-size:14px;">{fake_handle}</div>
            </div>
        </div>

        <div style="white-space:pre-wrap;">{safe_text}</div>
    """

    if media_url:
        html_block += f"""
        <div style="margin-top:10px; text-align:center;">
            <img src="{media_url}" style="max-width:100%; border-radius:12px;"/>
        </div>
        """

    html_block += f"""
        <div style="margin-top:10px; color:#536471; font-size:13px;">
            {created_at or ""}
        </div>
    </div>
    </body></html>
    """
    return html_block


# ---------- 2. convert html to jpeg ----------
def html_to_jpg(html_code, output_path="tweet.jpg"):
    """Render HTML and save cropped JPG using Playwright headless Chromium."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 1600})
        page.set_content(html_code)

        # locate the tweet card div and screenshot only that region
        element = page.query_selector("div")  # outermost tweet container
        if element:
            element.screenshot(path=output_path, type="jpeg", quality=95)
        else:
            # fallback: whole page
            page.screenshot(path=output_path, type="jpeg", quality=95)

        browser.close()
    print(f"saved → {output_path}")


# ---------- 3. example usage ----------
x, y, z = tweet_texts_list[0]
html_code = build_tweet_card_html(x, y, z)
html_to_jpg(html_code, "tweet_images/tweet_card_test.jpg")