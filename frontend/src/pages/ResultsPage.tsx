import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { SurveyPost } from '../lib/survey'

type ResultItem = { 
  post: SurveyPost
  user: { dem: number; rep: number }
  scores?: { dem_score: number; rep_score: number; total_score: number }
}
type LocationState = ResultItem | { items: ResultItem[]; average_score?: number }

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state || {}) as Partial<LocationState>
  const items: ResultItem[] = Array.isArray((state as any).items)
    ? ((state as any).items as ResultItem[])
    : state && (state as any).post && (state as any).user
    ? [{ post: (state as any).post as SurveyPost, user: (state as any).user as { dem: number; rep: number } }]
    : []

  // Calculate average score and find best/worst questions
  const comparison = useMemo(() => {
    return items.map((it, idx) => {
      const demScore = it.scores?.dem_score ?? Math.max(0, 100 - Math.abs(it.user.dem - it.post.dem))
      const repScore = it.scores?.rep_score ?? Math.max(0, 100 - Math.abs(it.user.rep - it.post.rep))
      const totalScore = it.scores?.total_score ?? (demScore + repScore) / 2
      return {
        item: it,
        index: idx + 1,
        scores: { dem_score: demScore, rep_score: repScore, total_score: totalScore }
      }
    })
  }, [items])

  const average_score = useMemo(() => {
    if (!comparison.length) return 0
    return comparison.reduce((sum, c) => sum + c.scores.total_score, 0) / comparison.length
  }, [comparison])

  const best_question = useMemo(() => {
    if (!comparison.length) return 1
    const best = comparison.reduce((best, current) => 
      current.scores.total_score > best.scores.total_score ? current : best
    )
    return best.index
  }, [comparison])

  const worst_question = useMemo(() => {
    if (!comparison.length) return 1
    const worst = comparison.reduce((worst, current) => 
      current.scores.total_score < worst.scores.total_score ? current : worst
    )
    return worst.index
  }, [comparison])

  const css = useMemo(
    () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background-color: #faf9f6;
      color: #111;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .results-page {
      background: #faf9f6;
      color: #111;
      font-family: 'Inter', sans-serif;
      padding: 40px 24px;
      max-width: 1200px;
      margin: 0 auto;
      animation: fadeIn 0.8s ease-out;
    }
    
    .results-header {
      text-align: center;
      margin-bottom: 40px;
      position: sticky;
      top: 0;
      background: #faf9f6;
      z-index: 10;
      padding: 20px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
    }
    
    .results-header h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 400;
      font-size: 2rem;
      margin-bottom: 8px;
      color: #111;
    }
    
    .results-header p {
      color: #555;
      font-size: 1rem;
    }
    
    .results-summary {
      text-align: center;
      margin-bottom: 48px;
    }
    
    .results-summary h2 {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: #111;
    }
    
    .summary-bar {
      display: flex;
      height: 8px;
      border-radius: 8px;
      overflow: hidden;
      margin: 12px auto;
      width: 60%;
      background: #eee;
    }
    
    .summary-segment {
      transition: width 0.3s ease;
    }
    
    .summary-note {
      font-size: 0.9rem;
      color: #666;
      margin-top: 12px;
    }
    
    .results-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
      margin-bottom: 48px;
    }
    
    .result-card {
      display: flex;
      gap: 16px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      padding: 16px;
      align-items: center;
      transition: transform 0.2s ease;
      min-height: 250px;
    }
    
    .result-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .tweet-thumb {
      width: 50%;
      max-width: 500px;
      height: 220px;
      object-fit: contain;        /* show entire tweet */
      border-radius: 12px;        /* smoother rounding */
      background: #f9f9f9;        /* neutral backdrop */
      padding: 6px;               /* small breathing room around edges */
      border: 1px solid #ddd;     /* subtle outline for definition */
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      flex-shrink: 0;
    }
    
    .result-data {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .score-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #333;
      padding: 4px 0;
    }
    
    .score-value {
      font-weight: 600;
    }
    
    .score-value.dem {
      color: #3b82f6;
    }
    
    .score-value.rep {
      color: #ef4444;
    }
    
    .total-score {
      text-align: right;
      font-size: 1.4rem;
      font-weight: 700;
      margin-top: 8px;
      color: #111;
    }
    
    .results-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 48px;
    }
    
    .results-actions button,
    .results-actions a {
      background: #111;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s ease;
      text-decoration: none;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
    }
    
    .results-actions button:hover,
    .results-actions a:hover {
      background: #333;
    }
    
    .error-message {
      background: #fff5f5;
      border-left: 3px solid #c53030;
      padding: 16px 20px;
      border-radius: 4px;
      margin-bottom: 32px;
      color: #742a2a;
      font-weight: 500;
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @media (max-width: 768px) {
      .results-page {
        padding: 32px 16px;
      }
      
      .results-header {
        padding: 16px 0;
      }
      
      .results-header h1 {
        font-size: 1.6rem;
      }
      
      .summary-bar {
        width: 80%;
      }
      
      .results-grid {
        grid-template-columns: 1fr;
      }
      
      .result-card {
        flex-direction: column;
        align-items: flex-start;
        min-height: auto;
      }
      
      .tweet-thumb {
        width: 100%;
        max-width: none;
        height: auto;
        max-height: 300px;
      }
      
      .results-actions {
        flex-direction: column;
      }
      
      .results-actions button,
      .results-actions a {
        width: 100%;
      }
    }
    
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

  if (!items.length) {
    // No state passed; go back to Guess
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">Missing results context. Please try again.</div>
          <div className="results-actions">
            <button onClick={() => navigate('/guess')}>Go to Guess</button>
          </div>
        </div>
      </div>
    )
  }
  

  return (
    <div>
      <style>{css}</style>
      <div className="results-page">
        <header className="results-header">
          <h1>Your Results</h1>
          <p>See how your predictions compare to the actual survey data.</p>
        </header>

        <section className="results-summary">
          <h2>Average Score: {average_score.toFixed(1)}%</h2>
          <div className="summary-bar">
            {comparison.map((item, i) => (
              <div
                key={i}
                className="summary-segment"
                style={{
                  width: `${100 / comparison.length}%`,
                  background: `linear-gradient(90deg, #3b82f6 ${item.scores.total_score}%, #ef4444 ${100 - item.scores.total_score}%)`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <p className="summary-note">
            You were closest on #{best_question} and furthest off on #{worst_question}.
          </p>
        </section>

        <section className="results-grid">
          {comparison.map((item, i) => (
            <div key={i} className="result-card">
              <img 
                src={item.item.post.imageUrl} 
                alt="tweet" 
                className="tweet-thumb" 
              />
              <div className="result-data">
                <div className="score-row">
                  <span>Democrat:</span>
                  <span className="score-value dem">
                    {item.item.user.dem.toFixed(1)}% → {item.item.post.dem.toFixed(1)}%
                  </span>
                </div>
                <div className="score-row">
                  <span>Republican:</span>
                  <span className="score-value rep">
                    {item.item.user.rep.toFixed(1)}% → {item.item.post.rep.toFixed(1)}%
                  </span>
                </div>
                <div className="total-score">{item.scores.total_score.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </section>

        <div className="results-actions">
          <button onClick={() => navigate('/guess')}>Try Again</button>
          <Link to="/leaderboard">View Leaderboard</Link>
        </div>
      </div>
    </div>
  )
}
