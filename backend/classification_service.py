"""Classification service for analyzing Reddit posts using LLM."""

import textwrap
from typing import Dict, Optional
import requests
from google import genai
from google.genai import types

from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.survey_service import SurveyQuestion


class PostClassification:
    """Represents the classification result for a post."""

    def __init__(
        self,
        post_id: str,
        stance: str,
        stance_index: int,
        partisan_breakdown: Dict[str, int],
        confidence: str = "medium"
    ):
        self.post_id = post_id
        self.stance = stance
        self.stance_index = stance_index
        self.partisan_breakdown = partisan_breakdown
        self.confidence = confidence

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "post_id": self.post_id,
            "stance": self.stance,
            "stance_index": self.stance_index,
            "partisan_breakdown": self.partisan_breakdown,
            "confidence": self.confidence
        }

    def get_interpretation(self) -> str:
        """Generate human-readable interpretation."""
        dem = self.partisan_breakdown["dem"]
        ind = self.partisan_breakdown["ind"]
        rep = self.partisan_breakdown["rep"]

        max_pct = max(dem, ind, rep)
        alignment = "broadly held" if max_pct > 50 else "relatively fringe"

        return (
            f"This post expresses a stance aligned with \"{self.stance}\". "
            f"Relative to national survey data, this view is {alignment} across major political groups."
        )


class ClassificationService:
    """Service for classifying Reddit posts against survey questions."""

    def __init__(self):
        self.client = None
        if GEMINI_API_KEY:
            self.client = genai.Client(api_key=GEMINI_API_KEY)

    def classify_post(
        self,
        post: Dict,
        question: SurveyQuestion
    ) -> Optional[PostClassification]:
        """
        Classify a Reddit post against a survey question.

        Args:
            post: Dict containing post data (must have post_id, title, selftext, image_url)
            question: SurveyQuestion to classify against

        Returns:
            PostClassification or None if classification fails
        """
        if not self.client:
            print("Gemini client not initialized (missing API key)")
            return None

        try:
            # Build classification prompt
            prompt = self._build_classification_prompt(post, question)

            # Prepare content for LLM
            content_parts = []

            # Add text content (title + selftext)
            text_content = f"**Post Title**: {post.get('title', '')}\n\n"
            if post.get('selftext'):
                text_content += f"**Post Text**: {post.get('selftext', '')}\n\n"

            # Add image if available
            image_url = post.get('image_url')
            if image_url:
                try:
                    # Fetch image data
                    image_response = requests.get(image_url, timeout=10)
                    image_response.raise_for_status()

                    # Determine MIME type from URL or response
                    mime_type = image_response.headers.get('Content-Type', 'image/jpeg')
                    if 'image' not in mime_type:
                        mime_type = 'image/jpeg'

                    # Add image to content
                    content_parts.append(
                        types.Part.from_bytes(
                            data=image_response.content,
                            mime_type=mime_type
                        )
                    )
                    text_content += "**Image**: (see attached)\n\n"
                except Exception as e:
                    print(f"Error fetching image {image_url}: {e}")
                    text_content += "**Image**: (failed to load)\n\n"

            # Add prompt text
            text_content += prompt
            content_parts.append(text_content)

            # Call LLM
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=content_parts
            )

            # Parse response
            stance_index = int(response.text.strip()) - 1
            response_options = question.get_response_options()

            if 0 <= stance_index < len(response_options):
                stance = response_options[stance_index]
                partisan_breakdown = question.get_partisan_breakdown(stance)

                if partisan_breakdown:
                    return PostClassification(
                        post_id=post.get('post_id', 'unknown'),
                        stance=stance,
                        stance_index=stance_index,
                        partisan_breakdown=partisan_breakdown
                    )

            print(f"Invalid LLM response: {response.text}")
            return None

        except Exception as e:
            print(f"Error classifying post {post.get('post_id')}: {e}")
            return None

    def _build_classification_prompt(
        self,
        post: Dict,
        question: SurveyQuestion
    ) -> str:
        """Build the classification prompt for the LLM."""
        options = question.get_response_options()
        options_str = "\n".join([f"{i+1}. {opt}" for i, opt in enumerate(options)])

        prompt = textwrap.dedent(f"""
        You are analyzing the ideological stance expressed in a Reddit post.

        Survey question:
        "{question.prompt}"

        Response options:
        {options_str}

        Task:
        Based on the post content (text and/or image), determine which response option (1-{len(options)})
        best reflects the stance expressed.
        Respond only with the option number (1-{len(options)}), without explanation.
        """).strip()

        return prompt

    def classify_posts(
        self,
        posts: list,
        question: SurveyQuestion
    ) -> Dict[str, PostClassification]:
        """
        Classify multiple posts.

        Returns:
            Dict mapping post_id to PostClassification
        """
        results = {}
        for post in posts:
            post_id = post.get('post_id', 'unknown')
            classification = self.classify_post(post, question)
            if classification:
                results[post_id] = classification
        return results


# Global instance
classification_service = ClassificationService()
