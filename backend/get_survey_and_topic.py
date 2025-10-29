import os, re, json, requests, pdfplumber, pandas as pd, numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPIC_CSV = ROOT / "backend" / "yougov_topics.csv"
CACHE_DIR = ROOT / "survey_cache"
PDF_DIR = ROOT / "survey_pdfs"
CSV_DIR = ROOT / "survey_res_csv"

for d in [CACHE_DIR, PDF_DIR, CSV_DIR]:
    d.mkdir(exist_ok=True)

def load_random_topic():
    topics_df = pd.read_csv(TOPIC_CSV)
    row = topics_df.sample(n=1).iloc[0]
    return row["id"], row["name"]

def fetch_survey_json(topic_id):
    cache_path = CACHE_DIR / f"{topic_id}.json"
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    url = f"https://today.yougov.com/_pubapis/v5/us/search/entity/{topic_id}/surveys/"
    r = requests.get(url)
    r.raise_for_status()
    data = r.json()
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return data

def download_pdf(topic_id, data):
    pdf_url = data["data"][0].get("document_url", data["data"][0].get("url"))
    pdf_path = PDF_DIR / f"{topic_id}.pdf"
    if not pdf_path.exists():
        r = requests.get(pdf_url)
        r.raise_for_status()
        with open(pdf_path, "wb") as f:
            f.write(r.content)
    return pdf_path

def extract_lines_with_spacing(page, line_tol=3, space_thresh=2.5):
    chars = page.chars
    if not chars: return []
    chars.sort(key=lambda c: (round(c["top"]/line_tol)*line_tol, c["x0"]))
    lines, current_y, current_line, last_x = [], None, [], None
    for c in chars:
        y = round(c["top"]/line_tol)*line_tol
        if current_y is None: current_y = y
        if y != current_y:
            lines.append("".join(current_line).strip())
            current_line, last_x, current_y = [c["text"]], c["x1"], y
            continue
        if last_x is not None and (c["x0"] - last_x) > space_thresh:
            current_line.append(" ")
        current_line.append(c["text"]); last_x = c["x1"]
    if current_line: lines.append("".join(current_line).strip())
    return lines

def parse_yougov_toplines(pdf_path):
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            aspect = page.width / page.height
            if aspect < 1: lines.extend(extract_lines_with_spacing(page))
            else: break
    useful = []
    for ln in lines:
        if re.search(r"Interviewing\s*Dates", ln, re.I): break
        useful.append(ln)
    records, qnum, qtext = [], None, None
    for ln in useful:
        qm = re.match(r"(\d+)\.\s*(.+)", ln)
        if qm:
            qnum, qtext = qm.groups()
            continue
        rm = re.search(r"(.+?)\.*\s*(\d+)%", ln)
        if rm and qnum:
            resp, pct = rm.groups()
            records.append({
                "qnum": int(qnum),
                "question": qtext.strip(),
                "response": resp.strip(". "),
                "percent": int(pct)
            })
    return pd.DataFrame(records)

def extract_label_from_chars(page, top, bottom, x_cut=160, space_thresh=2.5):
    chars = [
        c for c in page.chars
        if top <= c["top"] <= bottom and c["x0"] < x_cut and re.match(r"[A-Za-z’'–-]", c["text"])
    ]
    if not chars: return ""
    chars.sort(key=lambda c: c["x0"])
    label, last_x = [chars[0]["text"]], chars[0]["x1"]
    for c in chars[1:]:
        if c["x0"] - last_x > space_thresh: label.append(" ")
        label.append(c["text"]); last_x = c["x1"]
    text = "".join(label)
    return re.sub(r"\(?\d+\)?%?", "", text).strip()

def extract_responses_partyid_zone(page, x_cut=180, y_split_ratio=0.45, y_tol=6):
    words = [w for w in page.extract_words() if w["top"] > page.height * y_split_ratio]
    if not words: return []
    lines, current_y, current_line = [], None, []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if current_y is None or abs(w["top"] - current_y) > y_tol:
            if current_line: lines.append(current_line)
            current_line, current_y = [w], w["top"]
        else: current_line.append(w)
    if current_line: lines.append(current_line)
    responses = []
    for line in lines:
        top, bottom = min(w["top"] for w in line), max(w["bottom"] for w in line)
        label = extract_label_from_chars(page, top, bottom, x_cut=x_cut)
        pcts = [int(w["text"].strip("%")) for w in line if re.match(r"^\d+%$", w["text"])]
        if label and pcts:
            responses.append({
                "response": label,
                "total": pcts[0] if len(pcts) > 0 else None,
                "dem": pcts[1] if len(pcts) > 1 else None,
                "ind": pcts[2] if len(pcts) > 2 else None,
                "rep": pcts[3] if len(pcts) > 3 else None
            })
    return responses

def parse_yougov_pdf(pdf_path):
    records, q_counter = [], 0
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            if page.width / page.height < 1: continue
            text = "\n".join(extract_lines_with_spacing(page))
            if not text or "Party ID" not in text: continue
            for qblock in re.split(r"\n(?=\d+[A-Za-z]?\.\s)", text):
                q_match = re.match(r"(\d+[A-Za-z]?)\.\s*(.*?)\n(.+?)\n", qblock)
                if not q_match: continue
                orig_id, qtitle, qprompt = q_match.groups()
                q_counter += 1
                responses = extract_responses_partyid_zone(page)
                if not responses: continue
                for r in responses:
                    records.append({
                        "qnum": q_counter,
                        "orig_label": orig_id,
                        "question": qtitle.strip(),
                        "prompt": qprompt.strip(),
                        "response": r["response"],
                        "total": r["total"],
                        "dem": r["dem"],
                        "ind": r["ind"],
                        "rep": r["rep"]
                    })
    return pd.DataFrame(records)

def parse_yougov_combined(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        aspects = [p.width / p.height for p in pdf.pages]
    has_vertical = any(a < 1 for a in aspects)
    df_top = parse_yougov_toplines(pdf_path) if has_vertical else pd.DataFrame()
    df_detail = parse_yougov_pdf(pdf_path)
    if not df_top.empty and not df_detail.empty:
        for q in df_detail["qnum"].unique():
            d_rows = df_detail[df_detail["qnum"] == q].index
            t_rows = df_top[df_top["qnum"] == q]
            if not t_rows.empty:
                question_text = t_rows.iloc[0]["question"]
                df_detail.loc[d_rows, "prompt"] = question_text
                resp_vals = list(t_rows["response"])
                n = min(len(d_rows), len(resp_vals))
                df_detail.loc[d_rows[:n], "response"] = resp_vals[:n]
    return df_detail

def main(force_refresh=False):
    topic_id, topic_name = load_random_topic()
    print(f"Selected topic: {topic_name} ({topic_id})")
    data = fetch_survey_json(topic_id)
    pdf_path = download_pdf(topic_id, data)
    df_res = parse_yougov_combined(pdf_path)
    out_path = CSV_DIR / f"{topic_id}_res.csv"
    df_res.to_csv(out_path, index=False)
    print(f"Saved parsed survey to {out_path}")

if __name__ == "__main__":
    main()