"""Test script for classification system."""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_mock_classification():
    """Test classification with mock data."""
    print("\nTesting mock classification...")
    from backend.survey_service import SurveyService
    from backend.classification_service import ClassificationService

    survey_service = SurveyService()
    classification_service = ClassificationService()

    # Try to load a question
    question = survey_service.load_random_survey()

    if not question:
        print("  ⚠ Could not load survey question")
        return False

    print(f"  Loaded question: {question.prompt[:80]}...")
    print(f"  Response options: {len(question.get_response_options())}")

    # Create mock post
    mock_post = {
        "post_id": "test123",
        "title": "Test Post Title",
        "selftext": "This is a test post.",
        "image_url": None  # No image for basic test
    }

    # Try classification (will fail without image, but tests the flow)
    print("  Testing classification flow...")
    result = classification_service.classify_post(mock_post, question)

    if result:
        print(f"  ✓ Classification succeeded: {result.stance}")
        print(f"    Partisan breakdown: D={result.partisan_breakdown['dem']}% "
              f"I={result.partisan_breakdown['ind']}% "
              f"R={result.partisan_breakdown['rep']}%")
    else:
        print("  ⚠ Classification returned None (expected without valid image)")

    return True


def main():
    """Run all tests."""

    tests = [
        ("Mock Classification", test_mock_classification),
        ("Mock Classification", test_mock_classification),
        ("Mock Classification", test_mock_classification),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")


if __name__ == "__main__":
    sys.exit(main())
