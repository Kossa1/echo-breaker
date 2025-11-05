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
      background: #faf9f6;
      color: #222;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .results-page {
      background: #faf9f6;
      color: #222;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      padding: 0 16px;
      max-width: 900px;
      margin: 0 auto;
      animation: fadeIn 0.8s ease-out;
    }
    
    .results-overview {
      text-align: center;
      margin-bottom: 32px;
      padding-top: 32px;
    }
    
    .results-overview h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 400;
      font-size: 2rem;
      margin-bottom: 8px;
      color: #222;
    }
    
    .results-overview .subtitle {
      color: #444;
      font-size: 0.95rem;
      margin-bottom: 24px;
      font-weight: 400;
    }
    
    .score-summary {
      margin-top: 24px;
    }
    
    .score-summary h2 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 400;
      font-size: 1.5rem;
      margin-bottom: 12px;
      color: #222;
    }
    
    .progress-bar {
      height: 6px;
      border-radius: 3px;
      background: #eee;
      overflow: hidden;
      margin: 12px auto 16px;
      max-width: 400px;
    }
    
    .progress-bar .fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #ef4444);
      transition: width 0.6s ease;
    }
    
    .score-summary .note {
      font-size: 0.9rem;
      color: #666;
      margin-top: 8px;
      font-weight: 400;
    }
    
    .results-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-top: 32px;
      margin-bottom: 48px;
    }
    
    .result-card {
      display: flex;
      flex-direction: column;
      padding: 16px 0;
      border-bottom: 1px solid #eee;
      animation: fadeInCard 0.5s ease-out both;
    }
    
    .result-card:nth-child(1) { animation-delay: 0.1s; }
    .result-card:nth-child(2) { animation-delay: 0.15s; }
    .result-card:nth-child(3) { animation-delay: 0.2s; }
    .result-card:nth-child(4) { animation-delay: 0.25s; }
    .result-card:nth-child(5) { animation-delay: 0.3s; }
    .result-card:nth-child(n+6) { animation-delay: 0.35s; }
    
    .result-card:last-child {
      border-bottom: none;
    }
    
    .tweet-thumb {
      width: 100%;
      height: 220px;
      object-fit: contain;
      border-radius: 12px;
      background: #fafafa;
      border: 1px solid #ddd;
      margin-bottom: 12px;
    }
    
    .result-data {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      margin-top: 8px;
      font-size: 0.95rem;
      gap: 8px;
      color: #444;
    }
    
    .data-label {
      font-weight: 500;
      color: #666;
    }
    
    .data-value {
      font-weight: 600;
      text-align: right;
    }
    
    .data-value.dem {
      color: #3b82f6;
    }
    
    .data-value.rep {
      color: #ef4444;
    }
    
    .data-value.total {
      color: #222;
      font-size: 1.1rem;
      font-weight: 700;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    
    .prediction-table {
      display: grid;
      grid-template-columns: auto 1fr 1fr;
      gap: 12px 16px;
      margin-top: 12px;
      font-size: 0.9rem;
      padding: 12px 0;
    }
    
    .prediction-table-header {
      font-size: 0.75rem;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    
    .prediction-table-header:first-child {
      grid-column: 1;
    }
    
    .prediction-row-label {
      font-weight: 500;
      color: #666;
      font-size: 0.85rem;
    }
    
    .prediction-value {
      font-weight: 600;
      text-align: right;
    }
    
    .prediction-value.dem {
      color: #3b82f6;
    }
    
    .prediction-value.rep {
      color: #ef4444;
    }
    
    .results-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 48px;
      margin-bottom: 48px;
    }
    
    .results-actions button,
    .results-actions a {
      background: #111;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s ease;
      text-decoration: none;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
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
    
    @keyframes fadeInCard {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @media (max-width: 768px) {
      .results-page {
        padding: 0 16px;
      }
      
      .results-overview {
        padding-top: 24px;
        margin-bottom: 24px;
      }
      
      .results-overview h1 {
        font-size: 1.75rem;
      }
      
      .score-summary h2 {
        font-size: 1.3rem;
      }
      
      .progress-bar {
        max-width: 100%;
      }
      
      .results-grid {
        gap: 20px;
        margin-top: 24px;
      }
      
      .result-card {
        padding: 12px 0;
      }
      
      .tweet-thumb {
        height: auto;
        max-height: 220px;
      }
      
      .result-data {
        font-size: 0.9rem;
      }
      
      .prediction-table {
        grid-template-columns: auto 1fr 1fr;
        gap: 8px 10px;
      }
      
      .prediction-table-header:first-child {
        display: none;
      }
      
      .prediction-row-label {
        font-size: 0.8rem;
      }
      
      .prediction-value {
        font-size: 0.85rem;
      }
      
      .results-actions {
        flex-direction: column;
        gap: 12px;
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
        <section className="results-overview">
          <h1>Your Results</h1>
          <p className="subtitle">See how your predictions compare to the actual survey data.</p>
          <div className="score-summary">
            <h2>Average Score: {average_score.toFixed(1)}%</h2>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${average_score}%` }} />
            </div>
            <p className="note">You were closest on #{best_question} and furthest off on #{worst_question}.</p>
          </div>
        </section>

        <section className="results-grid">
          {comparison.map((item, i) => (
            <div key={i} className="result-card">
              <img 
                src={item.item.post.imageUrl} 
                alt="tweet" 
                className="tweet-thumb" 
              />
              <div className="prediction-table">
                <div className="prediction-table-header"></div>
                <div className="prediction-table-header">Your Prediction</div>
                <div className="prediction-table-header">Actual Result</div>
                <div className="prediction-row-label">Democrat</div>
                <div className="prediction-value dem">{item.item.user.dem.toFixed(1)}%</div>
                <div className="prediction-value dem">{item.item.post.dem.toFixed(1)}%</div>
                <div className="prediction-row-label">Republican</div>
                <div className="prediction-value rep">{item.item.user.rep.toFixed(1)}%</div>
                <div className="prediction-value rep">{item.item.post.rep.toFixed(1)}%</div>
              </div>
              <div className="result-data">
                <span className="data-label">Accuracy Score</span>
                <span className="data-value total">{item.scores.total_score.toFixed(1)}%</span>
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
