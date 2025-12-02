import requests
from scipy.stats import ttest_rel

BACKEND_URL = "https://echo-breaker-backend.onrender.com/api/users/progress"

def main():
    # 1. Get progress data
    resp = requests.get(BACKEND_URL)
    resp.raise_for_status()
    data = resp.json()
    
    # 2. Extract paired scores
    first_scores = []
    last_scores = []
    for user in data:
        try:
            first = float(user["first_score"])
            last = float(user["last_score"])
            first_scores.append(first)
            last_scores.append(last)
        except Exception as e:
            # Just skip if something's missing or broken
            continue

    if not first_scores or not last_scores:
        print("No valid user scores found.")
        return
    
    # 3. Compute difference list
    differences = [last - first for first, last in zip(first_scores, last_scores)]

    print(f"Found {len(differences)} users with paired scores.")
    print(f"Mean start score: {sum(first_scores)/len(first_scores):.2f}")
    print(f"Mean finish score: {sum(last_scores)/len(last_scores):.2f}")
    print(f"Mean difference: {sum(differences)/len(differences):.2f}")

    # 4. Paired t-test
    t_stat, p_value = ttest_rel(last_scores, first_scores)
    print(f"Paired t-test statistic: {t_stat:.4f}")
    print(f"Paired t-test p-value   : {p_value:.5f}")
    
    if p_value < 0.05:
        print("Result: Statistically significant improvement! 🎉")
    else:
        print("Result: Not statistically significant.")

if __name__ == "__main__":
    main()