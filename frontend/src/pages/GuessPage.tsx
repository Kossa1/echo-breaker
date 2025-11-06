import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { type SurveyPost } from '../lib/survey'

export default function GuessPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [post, setPost] = useState<SurveyPost | null>(null)
  const [dem, setDem] = useState<number>(50)
  const [rep, setRep] = useState<number>(50)
  const [loading, setLoading] = useState(false)
  const auth = useMemo(() => getAuth(), [])

  // Multi-question support - always use 5 questions for multi-question flow
  const totalQuestions = 5
  const [qIndex, setQIndex] = useState<number>(0) // 0-based
  const [answers, setAnswers] = useState<Array<{ post: SurveyPost; user: { dem: number; rep: number } }>>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [dailyQuestions, setDailyQuestions] = useState<Array<{id: string; image_url: string; topic: string; question_order: number}>>([])
  const [completed, setCompleted] = useState<boolean>(false)

  // Load daily questions and check completion status on mount
  useEffect(() => {
    async function loadDailyQuestions() {
      if (!auth.currentUser) {
        // User must be signed in to play
        setError('Please sign in to play')
        return
      }

      try {
        const userId = auth.currentUser.uid
        const res = await fetch(`/api/daily_questions?user_id=${userId}`)
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          setError(errorData.error || 'Failed to load daily questions')
          return
        }
        const data = await res.json()
        
        // Check if user already completed today
        if (data.completed) {
          setCompleted(true)
          // Redirect to results
          navigate('/guess/results', { replace: true })
          return
        }
        
        setDailyQuestions(data.questions || [])
        setGameStarted(true)
        setError(null)
      } catch (error) {
        console.error('Failed to load daily questions:', error)
        setError('Failed to load daily questions. Please try again.')
      }
    }
    
    loadDailyQuestions()
  }, [auth.currentUser, navigate])

  // Load current question when game is started and qIndex changes
  useEffect(() => {
    if (!gameStarted || !dailyQuestions.length || qIndex >= dailyQuestions.length) return
    
    const currentQuestion = dailyQuestions[qIndex]
    if (currentQuestion) {
      setPost({
        id: currentQuestion.id,
        imageUrl: currentQuestion.image_url,
        dem: 0, // Will be set from backend results
        rep: 0  // Will be set from backend results
      })
      setError(null)
    }
  }, [gameStarted, qIndex, dailyQuestions])

  const css = useMemo(
    () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background-color: #faf9f6;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 24px 64px;
      animation: fadeIn 0.8s ease-out;
    }
    
    /* Header - slim NYT style */
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    .header h1 {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 1.8rem;
      font-weight: 300;
      color: #1a1a1a;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    
    .header p {
      font-family: 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 0.95rem;
      color: #666;
      font-weight: 400;
      line-height: 1.5;
      max-width: 600px;
      margin: 0 auto;
    }
    
    /* Tweet image section - spacious and clean */
    .tweet-image-section {
      text-align: center;
      margin-bottom: 48px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 0;
      animation: fadeInUp 0.8s ease-out 0.2s both;
    }
    
    .instruction-text {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 1.05rem;
      color: #4a4a4a;
      margin-bottom: 32px;
      font-weight: 400;
      line-height: 1.7;
      padding: 0;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .tweet-image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 24px;
    }
    
    .tweet-image {
      max-width: 100%;
      width: 100%;
      max-width: 620px;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s ease, opacity 0.4s ease;
      animation: fadeIn 0.6s ease-out;
    }
    
    .tweet-image:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.15);
    }
    
    /* Prediction form - minimal and elegant */
    .prediction-form-single {
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      margin-bottom: 0;
      animation: fadeInUp 0.8s ease-out 0.4s both;
    }
    
    /* Error message - refined styling */
    .error-message {
      background: #fff5f5;
      border-left: 3px solid #c53030;
      padding: 16px 20px;
      border-radius: 4px;
      margin-bottom: 32px;
      color: #742a2a;
      font-weight: 500;
      text-align: center;
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.95rem;
    }
    
    /* Slider container - elegant grid layout */
    .slider-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      margin-bottom: 48px;
      padding-top: 8px;
    }
    
    /* Party block - centered and spacious */
    .party-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .party-block label {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      color: #666;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    .slider-wrapper {
      position: relative;
      width: 100%;
      margin-bottom: 20px;
      padding: 0 4px;
    }
    
    /* Sliders - NYT style flat design */
    .party-block input[type="range"] {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: #e5e5e5;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .party-block input[type="range"]:hover {
      height: 5px;
    }
    
    .party-block input[type="range"]:active {
      height: 5px;
    }
    
    /* Democrat slider - muted blue */
    .party-block.democrat input[type="range"] {
      background: linear-gradient(to right, #e8f2fb 0%, #5a9fd4 50%, #3b82f6 100%);
    }
    
    .party-block.democrat input[type="range"]::-webkit-slider-thumb {
      background: #3b82f6;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25), 0 0 0 0 rgba(59, 130, 246, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .party-block.democrat input[type="range"]::-moz-range-thumb {
      background: #3b82f6;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25), 0 0 0 0 rgba(59, 130, 246, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .party-block.democrat input[type="range"]:hover::-webkit-slider-thumb,
    .party-block.democrat input[type="range"]:active::-webkit-slider-thumb {
      box-shadow: 0 3px 10px rgba(59, 130, 246, 0.35), 0 0 0 4px rgba(59, 130, 246, 0.1);
      transform: scale(1.05);
    }
    
    .party-block.democrat input[type="range"]:hover::-moz-range-thumb,
    .party-block.democrat input[type="range"]:active::-moz-range-thumb {
      box-shadow: 0 3px 10px rgba(59, 130, 246, 0.35), 0 0 0 4px rgba(59, 130, 246, 0.1);
      transform: scale(1.05);
    }
    
    /* Republican slider - muted red */
    .party-block.republican input[type="range"] {
      background: linear-gradient(to right, #fee2e2 0%, #f87171 50%, #ef4444 100%);
    }
    
    .party-block.republican input[type="range"]::-webkit-slider-thumb {
      background: #ef4444;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25), 0 0 0 0 rgba(239, 68, 68, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .party-block.republican input[type="range"]::-moz-range-thumb {
      background: #ef4444;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25), 0 0 0 0 rgba(239, 68, 68, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .party-block.republican input[type="range"]:hover::-webkit-slider-thumb,
    .party-block.republican input[type="range"]:active::-webkit-slider-thumb {
      box-shadow: 0 3px 10px rgba(239, 68, 68, 0.35), 0 0 0 4px rgba(239, 68, 68, 0.1);
      transform: scale(1.05);
    }
    
    .party-block.republican input[type="range"]:hover::-moz-range-thumb,
    .party-block.republican input[type="range"]:active::-moz-range-thumb {
      box-shadow: 0 3px 10px rgba(239, 68, 68, 0.35), 0 0 0 4px rgba(239, 68, 68, 0.1);
      transform: scale(1.05);
    }
    
    /* Slider thumb base styles */
    .party-block input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
    }
    
    .party-block input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }
    
    /* Value display - elegant and minimal */
    .value-display {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      background: transparent;
      padding: 12px 20px;
      border-radius: 6px;
      border: none;
      min-width: 100px;
      text-align: center;
      transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease;
      letter-spacing: -0.02em;
      display: inline-block;
    }
    
    .value-display.democrat {
      color: #3b82f6;
    }
    
    .value-display.republican {
      color: #ef4444;
    }
    
    /* Subtle pulse animation when value changes */
    @keyframes valueUpdate {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .value-display.updated {
      animation: valueUpdate 0.3s ease-out;
    }
    
    /* Progress bar - professional NYT style */
    .progress-wrapper {
      margin: 30px auto;
      max-width: 400px;
      text-align: center;
    }
    
    .progress-label {
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      color: #555;
      margin-bottom: 8px;
    }
    
    .progress-bar {
      height: 10px;
      border-radius: 10px;
      background: #e5e5e5;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #ef4444);
      transition: width 0.4s ease;
    }
    
    /* Submit section - refined spacing */
    .submit-section {
      text-align: center;
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    /* Button - NYT style minimal and elegant */
    .submit-btn {
      all: unset;
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      background: #1a1a1a;
      padding: 14px 32px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.01em;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .submit-btn:hover:not(:disabled) {
      background: #2d2d2d;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }
    
    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #999;
    }
    
    .submit-btn:focus-visible {
      outline: 2px solid #1a1a1a;
      outline-offset: 2px;
    }
    
    .loading {
      display: none;
      margin-top: 20px;
      color: #888;
      font-style: italic;
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.9rem;
    }
    
    /* Smooth animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .tweet-container {
      animation: fadeIn 0.6s ease-out;
    }
    
    /* Question transition animation */
    .question-transition {
      animation: fadeInUp 0.6s ease-out;
    }
    
    /* Mobile responsive - refined breakpoints */
    @media (max-width: 768px) {
      .container {
        padding: 32px 20px 48px;
      }
      
      .header {
        margin-bottom: 16px;
        padding-bottom: 10px;
      }
      
      .header h1 {
        font-size: 1.5rem;
        line-height: 1.2;
      }
      
      .header p {
        font-size: 0.9rem;
      }
      
      .progress-wrapper {
        margin: 24px auto;
        max-width: 100%;
      }
      
      .progress-label {
        font-size: 0.85rem;
      }
      
      .tweet-image-section {
        margin-bottom: 36px;
      }
      
      .instruction-text {
        font-size: 0.95rem;
        margin-bottom: 24px;
      }
      
      .tweet-image {
        max-width: 100%;
        border-radius: 6px;
      }
      
      .prediction-form-single {
        margin-bottom: 0;
      }
      
      .slider-container {
        grid-template-columns: 1fr;
        gap: 48px;
        margin-bottom: 40px;
      }
      
      .party-block label {
        margin-bottom: 20px;
      }
      
      .value-display {
        font-size: 1.75rem;
      }
      
      .submit-section {
        margin-top: 40px;
        padding-top: 24px;
      }
      
      .submit-btn {
        width: 100%;
        padding: 16px 32px;
        font-size: 1rem;
      }
    }
    
    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `,
    []
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!post || !auth.currentUser) {
      setLoading(false)
      navigate('/login')
      return
    }
    setLoading(true)

    try {
      // Submit single answer to backend
      const userId = auth.currentUser.uid
      const submitData = {
        user_id: userId,
        question_id: post.id,
        user: { dem, rep }
      }

      const res = await fetch('/api/submit_answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Failed to submit answer')
        setLoading(false)
        return
      }

      const resultData = await res.json()

      // If user completed all questions, redirect to results
      if (resultData.completed_all) {
        navigate('/guess/results', { replace: false })
        return
      }

      // Move to next question
      if (qIndex + 1 < dailyQuestions.length) {
        setQIndex((i) => i + 1)
        setDem(50)
        setRep(50)
        setLoading(false)
      } else {
        // Should not happen if backend logic is correct, but handle gracefully
        setError('All questions answered, but completion not detected')
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      setError('Failed to submit answer. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <style>{css}</style>
      <div className="container">
        <div className="header">
          <h1>Guess the Poll</h1>
          <p>Predict what percentage of Democrats and Republicans support each tweet</p>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {post ? (
          <div key={`tweet-${qIndex}`} className="tweet-image-section question-transition">
            <div className="instruction-text">
              Below is a social media post. Estimate the percentage of Democrats and Republicans who agree with the sentiment expressed.
            </div>
            <div className="tweet-image-container">
              <img 
                key={`img-${qIndex}`}
                src={post.imageUrl} 
                alt="Social media post" 
                className="tweet-image" 
              />
            </div>
          </div>
        ) : (
          <div className="error-message">No posts available</div>
        )}

        <form onSubmit={onSubmit} id="predictionForm">
          <div key={`form-${qIndex}`} className="prediction-form-single question-transition">
            <div className="slider-container">
              <div className="party-block democrat">
                <label htmlFor="dem_0">Democrat %</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    id="dem_0"
                    min={0}
                    max={100}
                    step={1}
                    value={dem}
                    className="slider slider--dem"
                    onChange={(e) => setDem(Number(e.target.value))}
                  />
                </div>
                <div className="value-display democrat" id="dem_val">{dem}%</div>
              </div>

              <div className="party-block republican">
                <label htmlFor="rep_0">Republican %</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    id="rep_0"
                    min={0}
                    max={100}
                    step={1}
                    value={rep}
                    className="slider slider--rep"
                    onChange={(e) => setRep(Number(e.target.value))}
                  />
                </div>
                <div className="value-display republican" id="rep_val">{rep}%</div>
              </div>
            </div>
          </div>

          <div className="progress-wrapper">
            <div className="progress-label">
              Question {qIndex + 1} of {dailyQuestions.length || totalQuestions}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((qIndex + 1) / (dailyQuestions.length || totalQuestions)) * 100}%` }}
              />
            </div>
          </div>

          <div className="submit-section">
            <button type="submit" className="submit-btn" id="submitBtn" disabled={!post || loading || !auth.currentUser}>
              {loading
                ? 'Submitting…'
                : dailyQuestions.length > 1 && qIndex + 1 < dailyQuestions.length
                ? 'Next Question'
                : 'Submit'}
            </button>
            <div className="loading" id="loading" style={{ display: loading ? 'block' : 'none' }}>
              Processing your predictions...
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
