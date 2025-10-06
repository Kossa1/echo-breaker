from __future__ import annotations

import json
from bisect import bisect_left
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Sequence
import random


@dataclass(frozen=True)
class PoliticalSubreddit:
	name: str
	score: float  # Normalized community size (0.0 to 1.0), update with actual data
	notes: str = ""
	ideology: str = ""  # "left", "center-left", "center", "center-right", "right"
	sub_count: int = 0  # Optional: actual subscriber count if known


DATA_PATH = Path(__file__).with_name("subreddit_list.json")
_SCORE_PRECISION = 12


def load_subreddits_from_json(path: Path | str | None = None) -> List[PoliticalSubreddit]:
	"""Load ordered subreddit definitions from a JSON array."""
	actual_path = Path(path) if path is not None else DATA_PATH
	try:
		text = actual_path.read_text(encoding="utf-8")
	except FileNotFoundError as exc:
		raise FileNotFoundError(f"Subreddit data file not found: {actual_path}") from exc
	try:
		payload = json.loads(text)
	except json.JSONDecodeError as exc:
		raise ValueError(f"Invalid JSON in {actual_path}: {exc}") from exc
	if not isinstance(payload, list):
		raise ValueError(f"Expected a top-level JSON array in {actual_path}")
	subreddits: List[PoliticalSubreddit] = []
	for entry in payload:
		if not isinstance(entry, dict):
			raise ValueError(f"Expected objects inside JSON array in {actual_path}")
		name = entry.get("name")
		if not name:
			raise ValueError(f"Encountered subreddit entry without a name in {actual_path}")
		score_raw = entry.get("score", 0.0)
		try:
			score = float(score_raw)
		except (TypeError, ValueError):
			score = 0.0
		notes = entry.get("notes") or ""
		ideology = entry.get("ideology") or ""
		sub_count_raw = entry.get("sub_count", 0)
		try:
			sub_count = int(sub_count_raw)
		except (TypeError, ValueError):
			sub_count = 0
		subreddits.append(PoliticalSubreddit(
			name=str(name),
			score=score,
			notes=str(notes),
			ideology=str(ideology),
			sub_count=sub_count,
		))
	return subreddits


def save_subreddits_to_json(
	subreddits: Sequence[PoliticalSubreddit],
	path: Path | str | None = None,
	*,
	score_precision: int | None = _SCORE_PRECISION,
) -> None:
	"""Persist subreddit definitions (including weights) back to JSON."""
	actual_path = Path(path) if path is not None else DATA_PATH
	data = []
	for sub in subreddits:
		entry = asdict(sub)
		score_value = float(entry.get("score", 0.0))
		if score_precision is not None:
			score_value = round(score_value, score_precision)
		entry["score"] = score_value
		try:
			entry["sub_count"] = int(entry.get("sub_count", 0))
		except (TypeError, ValueError):
			entry["sub_count"] = 0
		data.append(entry)
	actual_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _build_cumulative(subs: Sequence[PoliticalSubreddit]) -> tuple[List[float], List[float], float]:
	"""Return (weights, cumulative probabilities, total weight)."""
	weights = [max(s.score, 0.0) for s in subs]
	total = sum(weights)
	if total <= 0:
		return weights, [], total
	cumulative: List[float] = []
	acc = 0.0
	for w in weights:
		acc += w / total
		cumulative.append(acc)
	# guard against floating point leaving last slightly below 1.0
	if cumulative:
		cumulative[-1] = 1.0
	return weights, cumulative, total

ORDERED_SUBREDDITS: List[PoliticalSubreddit] = []
subreddit_list: List[str] = []
_SAMPLING_WEIGHTS: List[float] = []
_SAMPLING_CUMULATIVE: List[float] = []
_SAMPLING_TOTAL: float = 0.0


def refresh_sampling_cache() -> None:
	"""Recompute cached sampling weights and name list from current ORDERED_SUBREDDITS."""
	global _SAMPLING_WEIGHTS, _SAMPLING_CUMULATIVE, _SAMPLING_TOTAL
	_SAMPLING_WEIGHTS, _SAMPLING_CUMULATIVE, _SAMPLING_TOTAL = _build_cumulative(ORDERED_SUBREDDITS)
	subreddit_list[:] = [s.name for s in ORDERED_SUBREDDITS]


def _initialize_from_json() -> None:
	"""Load subreddit definitions at import time."""
	global ORDERED_SUBREDDITS
	ORDERED_SUBREDDITS = load_subreddits_from_json()
	refresh_sampling_cache()


try:
	_initialize_from_json()
except FileNotFoundError:
	# Leave structures empty; consumer can populate and call refresh manually.
	ORDERED_SUBREDDITS = []
	refresh_sampling_cache()


def recompute_weights_with_alpha(alpha: float, apply: bool = False, normalize: bool = True) -> List[PoliticalSubreddit]:
	"""Return a list of PoliticalSubreddit with scores recomputed using a power-law alpha.

	Formula: scaled_i = (sub_count_i ** alpha) for sub_count_i > 0 else 0.
	If normalize=True, scores are scaled so they sum to 1 (probability distribution).
	If apply=True, ORDERED_SUBREDDITS is updated in-place (scores replaced) and sampling
	caches rebuilt.

	Parameters
	----------
	alpha : float
		Exponent (0 < alpha <= 1 typically). Smaller -> flatter distribution.
	apply : bool
		Whether to mutate global ORDERED_SUBREDDITS scores and refresh sampling arrays.
	normalize : bool
		Whether to divide scaled values by their sum so scores sum to 1.

	Returns
	-------
	List[PoliticalSubreddit]
		New list (detached copies) reflecting adjusted scores.
	"""
	if alpha <= 0:
		raise ValueError("alpha must be > 0")
	scaled = []
	for s in ORDERED_SUBREDDITS:
		val = (s.sub_count ** alpha) if s.sub_count > 0 else 0.0
		scaled.append(val)
	total = sum(scaled)
	if normalize and total > 0:
		scaled = [v / total for v in scaled]

	# Build new objects with updated score
	updated: List[PoliticalSubreddit] = []
	for old, new_score in zip(ORDERED_SUBREDDITS, scaled):
		updated.append(PoliticalSubreddit(
			name=old.name,
			score=new_score,
			notes=old.notes,
			ideology=old.ideology,
			sub_count=old.sub_count,
		))

	if apply:
		# Mutate global list (replace references) and rebuild sampling structures
		ORDERED_SUBREDDITS[:] = updated
		refresh_sampling_cache()
		save_subreddits_to_json(ORDERED_SUBREDDITS)

	return updated


def print_corrected_list(alpha: float, normalize: bool = True, precision: int = 6) -> None:
	"""Print a corrected list (name, sub_count, new_weight) for given alpha.

	Does not alter global scores. Intended for inspection/export.
	"""
	updated = recompute_weights_with_alpha(alpha, apply=False, normalize=normalize)
	print(f"# Corrected weights for alpha={alpha} (normalize={normalize})")
	total = sum(s.score for s in updated)
	print(f"# Sum of new scores: {total:.10f}")
	for s in updated:
		print(f"{s.name}, subscribers={s.sub_count}, new_weight={s.score:.{precision}f}")



def sample_subreddit(rng: random.Random | None = None) -> PoliticalSubreddit | None:
	"""Return one subreddit sampled according to its score weight."""
	if rng is None:
		rng = random
	if not ORDERED_SUBREDDITS or _SAMPLING_TOTAL <= 0:
		return None
	r = rng.random()
	idx = bisect_left(_SAMPLING_CUMULATIVE, r)
	if idx >= len(_SAMPLING_CUMULATIVE):
		idx = len(_SAMPLING_CUMULATIVE) - 1
	return ORDERED_SUBREDDITS[idx]


def get_probability_distribution() -> List[tuple[str, float]]:
	"""Return (name, probability) pairs reflecting the cached weights."""
	if _SAMPLING_TOTAL <= 0:
		return []
	return [
		(s.name, w / _SAMPLING_TOTAL)
		for s, w in zip(ORDERED_SUBREDDITS, _SAMPLING_WEIGHTS)
	]


def test(n_samples: int = 100000, top: int = 30, seed: int | None = 42) -> None:
	"""Quick diagnostic plot comparing empirical vs expected sampling frequencies.

	Parameters
	----------
	n_samples : int
		Total number of samples to draw.
	top : int
		Number of top-probability subreddits to display (after sorting by expected prob).
	seed : int | None
		Optional RNG seed for reproducibility.
	"""
	import matplotlib.pyplot as plt
	from collections import Counter

	rng = random.Random(seed) if seed is not None else random
	counts: Counter[str] = Counter()
	for _ in range(n_samples):
		pick = sample_subreddit(rng)
		if pick is not None:
			counts[pick.name] += 1

	# Expected distribution
	probs = get_probability_distribution()
	probs.sort(key=lambda x: x[1], reverse=True)
	selected = probs[:top]
	names = [n for n, _ in selected]
	exp = [p for _, p in selected]
	emp = [counts[n] / n_samples for n in names]

	width = 0.4
	idxs = range(len(names))
	plt.figure(figsize=(max(10, top * 0.4), 5))
	plt.bar([i - width/2 for i in idxs], exp, width=width, label="Expected", alpha=0.7)
	plt.bar([i + width/2 for i in idxs], emp, width=width, label="Empirical", alpha=0.7)
	plt.xticks(list(idxs), names, rotation=60, ha="right")
	plt.ylabel("Probability")
	plt.title(f"Top {top} Subreddit Sampling Frequencies (n={n_samples})")
	plt.legend()
	plt.tight_layout()
	plt.show()


# Scores above originate from the JSON companion file. To recompute with a new alpha,
# call recompute_weights_with_alpha(alpha, apply=True) which will refresh the cache and
# persist the updated weights back to the JSON file.

if __name__ == "__main__":
	#call this to refresh the weights
	recompute_weights_with_alpha(0.15, apply=True)
