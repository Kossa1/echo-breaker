"""Survey question management service for Echo Breaker."""

import random
from pathlib import Path
from typing import Optional, List, Dict
import pandas as pd
from google import genai

from backend.config import SURVEY_CSV_DIR, GEMINI_API_KEY, GEMINI_MODEL


class SurveyQuestion:
    """Represents a survey question with response options and partisan breakdowns."""

    def __init__(self, question: str, prompt: str, responses: List[Dict]):
        self.question = question  # Short label (e.g., "VotingRightsforWomen")
        self.prompt = prompt  # Full question text
        self.responses = responses  # List of {response, dem, ind, rep}

    def get_response_options(self) -> List[str]:
        """Get list of response option texts."""
        return [r["response"] for r in self.responses]

    def get_partisan_breakdown(self, response_text: str) -> Optional[Dict[str, int]]:
        """Get partisan percentages for a specific response."""
        for r in self.responses:
            if r["response"] == response_text:
                return {
                    "dem": r["dem"],
                    "ind": r["ind"],
                    "rep": r["rep"]
                }
        return None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "question": self.question,
            "prompt": self.prompt,
            "responses": self.responses
        }


class SurveyService:
    """Service for loading and managing survey questions."""

    def __init__(self, csv_dir: Path = SURVEY_CSV_DIR):
        self.csv_dir = csv_dir
        self.current_question: Optional[SurveyQuestion] = None

    def list_available_surveys(self) -> List[Path]:
        """Get list of available survey CSV files."""
        if not self.csv_dir.exists():
            return []
        return list(self.csv_dir.glob("*.csv"))

    def load_random_survey(self) -> Optional[SurveyQuestion]:
        """Load a random survey and select a question using LLM."""
        csv_files = self.list_available_surveys()
        if not csv_files:
            print(f"No survey CSV files found in {self.csv_dir}")
            return None

        # Sample random CSV
        csv_path = random.choice(csv_files)
        print(f"Loading survey from: {csv_path.name}")

        df = pd.read_csv(csv_path)

        # Get unique prompts
        unique_prompts = df["prompt"].dropna().unique().tolist()
        if not unique_prompts:
            print("No valid prompts found in survey")
            return None

        # Sample up to 10 prompts for LLM evaluation
        sampled_prompts = random.sample(
            unique_prompts,
            min(10, len(unique_prompts))
        )

        # Use LLM to select most ideologically relevant question
        selected_idx = self._select_best_question(sampled_prompts)
        selected_prompt = sampled_prompts[selected_idx]

        # Extract responses for this question
        question_df = df[df["prompt"] == selected_prompt]

        # Filter out "Totals" rows and other invalid responses
        question_df = question_df[
            ~question_df["response"].str.lower().str.contains("total", na=False)
        ]

        # Validate percentages (should be 0-100 range)
        question_df = question_df[
            (question_df["dem"] >= 0) & (question_df["dem"] <= 100) &
            (question_df["ind"] >= 0) & (question_df["ind"] <= 100) &
            (question_df["rep"] >= 0) & (question_df["rep"] <= 100)
        ]

        if len(question_df) == 0:
            print("No valid responses after filtering, trying another question")
            return self.load_random_survey()

        responses = []
        for _, row in question_df.iterrows():
            responses.append({
                "response": row["response"],
                "dem": int(row["dem"]) if pd.notna(row["dem"]) else 0,
                "ind": int(row["ind"]) if pd.notna(row["ind"]) else 0,
                "rep": int(row["rep"]) if pd.notna(row["rep"]) else 0
            })

        question_label = question_df.iloc[0]["question"] if "question" in question_df.columns else "Survey Question"

        self.current_question = SurveyQuestion(
            question=question_label,
            prompt=selected_prompt,
            responses=responses
        )

        return self.current_question

    def _select_best_question(self, prompts: List[str]) -> int:
        """Use LLM to select the most ideologically relevant question."""
        if not GEMINI_API_KEY:
            print("No Gemini API key, selecting random question")
            return random.randint(0, len(prompts) - 1)

        llm_prompt = (
            "You are evaluating survey questions for their usefulness in measuring ideological position "
            "(i.e., left-right, liberal-conservative, or similar value orientations). "
            "From the following survey question texts, pick the ONE that most clearly measures ideological stance, "
            "not attitudes toward specific candidates or factual knowledge.\n\n"
        )

        for i, p in enumerate(prompts, 1):
            llm_prompt += f"{i}. {p}\n"

        llm_prompt += (
            f"\nRespond only with the number (1-{len(prompts)}) as your answer, DO NOT provide any reasoning."
        )

        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=llm_prompt
            )
            selected = int(response.text.strip()) - 1
            if 0 <= selected < len(prompts):
                return selected
            else:
                print(f"LLM returned invalid index: {response.text}, using random")
                return random.randint(0, len(prompts) - 1)
        except Exception as e:
            print(f"Error calling LLM for question selection: {e}")
            return random.randint(0, len(prompts) - 1)

    def get_current_question(self) -> Optional[SurveyQuestion]:
        """Get the currently loaded survey question."""
        return self.current_question


# Global instance
survey_service = SurveyService()
