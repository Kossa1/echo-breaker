# backend/ingest_surveys.py
import os, glob, csv
from pathlib import Path
from sqlalchemy import select
from backend.db import SessionLocal, engine, Base
from backend.models import Topic, Survey, Question, Response

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "survey_res_csv"
PDF_DIR = ROOT / "survey_pdfs"
TOPICS_CSV = ROOT / "yougov_topics.csv"

def upsert_topics(session):
    if TOPICS_CSV.exists():
        with open(TOPICS_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                tid = row.get("id") or row.get("topic_id")
                if not tid:
                    continue
                t = session.get(Topic, tid)
                if not t:
                    t = Topic(id=tid, name=row.get("name"), slug=row.get("slug"))
                    session.add(t)

def coalesce(*names):
    for n in names:
        if n is not None:
            return n
    return None

def parse_csv(session, csv_path: Path):
    survey_id = csv_path.name.split("_")[0]  # bb750f... part
    # survey title from filename tail
    title = csv_path.stem.replace("_res","")
    # try to find pdf
    pdf = next((str(p) for p in PDF_DIR.glob(f"{survey_id}*.pdf")), None)

    survey = session.get(Survey, survey_id) or Survey(id=survey_id, title=title, cached_pdf_url=pdf)
    session.add(survey)

    # Heuristic CSV parse (works with most crosstab exports)
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        # Expect columns like: qnum/question/label/response, total/dem/ind/rep
        # We group rows by qnum (or by question text if no qnum)
        by_key = {}
        for row in reader:
            qnum = int(row.get("qnum") or row.get("question_number") or row.get("QNum") or 0)
            prompt = coalesce(row.get("prompt"), row.get("question"), row.get("prompt_text"), row.get("Question"))
            orig_label = coalesce(row.get("label"), row.get("Label"), row.get("subquestion"))
            resp_text = coalesce(row.get("response"), row.get("Response"), row.get("answer"), row.get("Answer"))

            key = (qnum, prompt or orig_label or "unknown")
            by_key.setdefault(key, []).append(row)

        for (qnum, keytxt), rows in by_key.items():
            q = Question(survey=survey, qnum=qnum or None, orig_label=None, prompt=keytxt)
            session.add(q)
            for r in rows:
                resp_text = coalesce(r.get("response"), r.get("Response"), r.get("answer"), r.get("Answer")) or "N/A"
                def num(x):
                    try: return float(str(x).replace("%","").strip())
                    except: return None
                session.add(Response(
                    question=q,
                    response_text=resp_text,
                    total=num(coalesce(r.get("total"), r.get("Total"))),
                    dem=num(coalesce(r.get("dem"), r.get("Dem"))),
                    ind=num(coalesce(r.get("ind"), r.get("Ind"))),
                    rep=num(coalesce(r.get("rep"), r.get("Rep")))
                ))

def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as s:
        upsert_topics(s)
        for csvf in sorted(glob.glob(str(CSV_DIR / "*_res.csv"))):
            parse_csv(s, Path(csvf))
        s.commit()

if __name__ == "__main__":
    main()
