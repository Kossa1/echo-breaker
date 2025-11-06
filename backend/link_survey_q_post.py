import os, random, pandas as pd, json

# directory containing parsed survey csvs
csv_dir = "survey_res_csv"
out_dir = "frontend/src/survey_metadata"
os.makedirs(out_dir, exist_ok=True)

# sample a random csv file
csv_files = [f for f in os.listdir(csv_dir) if f.endswith(".csv")]
if not csv_files:
    raise FileNotFoundError("no csv files found in survey_res_csv")

sampled_csv = random.choice(csv_files)
csv_path = os.path.join(csv_dir, sampled_csv)

# load dataframe
df = pd.read_csv(csv_path)
print(f"loaded: {sampled_csv} ({len(df)} rows)")

# filter out malformed or aggregate rows
df = df[df["response"].str.lower().ne("totals") & df["response"].notna()]

# sample one question id (qnum)
qnum = random.choice(df["qnum"].unique().tolist())
q_df = df[df["qnum"] == qnum].copy()

# extract metadata
question_text = q_df["question"].iloc[0]
prompt_text = q_df["prompt"].iloc[0]
orig_label = str(q_df["orig_label"].iloc[0])

# extract responses and partisan breakdowns
responses = []
for _, row in q_df.iterrows():
    responses.append({
        "response": row["response"],
        "dem": float(row["dem"]) if not pd.isna(row["dem"]) else None,
        "rep": float(row["rep"]) if not pd.isna(row["rep"]) else None
    })

# assemble JSON object
data = {
    "file_source": sampled_csv,
    "qnum": int(qnum),
    "orig_label": orig_label,
    "question": question_text,
    "prompt": prompt_text,
    "responses": responses
}

# make output dir for this question
qid_dir = os.path.join(out_dir, f"{os.path.splitext(sampled_csv)[0]}_q{qnum}")
os.makedirs(qid_dir, exist_ok=True)

# save json inside it
out_path = os.path.join(qid_dir, "ground_truth.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"saved question {qnum} → {out_path}")
