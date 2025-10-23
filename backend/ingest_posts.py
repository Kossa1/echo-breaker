# backend/ingest_posts.py
import pickle, glob, hashlib
from datetime import datetime
from pathlib import Path
from sqlalchemy import select
from backend.db import SessionLocal
from backend.models import Post

ROOT = Path(__file__).resolve().parents[1]

def norm_dt(s):
    if not s: return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%a %b %d %H:%M:%S %z %Y"):
        try: return datetime.strptime(s, fmt)
        except: pass
    return None

def upsert_post(session, **kw):
    # naive de-dupe: platform + hash(text)
    text = kw.get("text", "").strip()
    if not text:
        return
    extid = kw.get("external_id") or hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    exists = session.execute(
        select(Post).where(Post.platform==kw.get("platform","twitter"), Post.external_id==extid)
    ).scalar_one_or_none()
    if exists:
        return
    p = Post(
        platform=kw.get("platform","twitter"),
        external_id=extid,
        text=text,
        media_url=kw.get("media_url"),
        url=kw.get("url"),
        created_at_ts=kw.get("created_at_ts"),
        topic_id=kw.get("topic_id"),
    )
    session.add(p)

def load_backend_pickle(session):
    p = ROOT / "backend" / "tweet_data.pkl"
    if not p.exists(): return
    with open(p, "rb") as f:
        data = pickle.load(f)
    for item in data if isinstance(data, list) else []:
        if isinstance(item, dict):
            upsert_post(
                session,
                text=item.get("text",""),
                media_url=item.get("media_url"),
                created_at_ts=norm_dt(item.get("created_at")),
                topic_id=item.get("slug"),  # file uses 'slug' but it's the topic id
            )

def load_legacy_pickles(session):
    for pkl in glob.glob(str(ROOT / "twitter_posts" / "*.pkl")):
        with open(pkl, "rb") as f:
            data = pickle.load(f)
        if isinstance(data, list):
            for s in data:
                if isinstance(s, str):
                    upsert_post(session, text=s)

def main():
    with SessionLocal() as s:
        load_backend_pickle(s)
        load_legacy_pickles(s)
        s.commit()

if __name__ == "__main__":
    main()
