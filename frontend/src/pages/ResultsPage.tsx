import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { SurveyPost } from '../lib/survey'
import { getAuth } from 'firebase/auth'

type ResultItem = { 
  post: SurveyPost
  user: { dem: number; rep: number }
  scores?: { dem_score: number; rep_score: number; total_score: number }
  question_rank?: number
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ResultItem[]>([])
  const [averageScore, setAverageScore] = useState<number>(0)
  const [dailyRank, setDailyRank] = useState<number | null>(null)
  const [historicalAverage, setHistoricalAverage] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')

  // Load results from backend API
  useEffect(() => {
    async function loadResults() {
      if (!auth.currentUser) {
        setError('Please sign in to view results')
        setLoading(false)
        return
      }

      try {
        const userId = auth.currentUser.uid
        const dateParam = searchParams.get('date') // Optional date parameter
        const url = dateParam 
          ? `/api/results?user_id=${userId}&date=${dateParam}`
          : `/api/results?user_id=${userId}`
        
        const res = await fetch(url)
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          setError(errorData.error || 'Failed to load results')
          setLoading(false)
          return
        }

        const data = await res.json()
        
        // Transform backend results to frontend format
        const resultItems: ResultItem[] = (data.results || []).map((r: any) => ({
          post: {
            id: r.id,
            imageUrl: r.image_url,
            dem: r.actual.dem,
            rep: r.actual.rep,
          },
          user: r.user,
          scores: r.scores,
          question_rank: data.question_ranks?.[r.id] || null
        }))

        setItems(resultItems)
        setAverageScore(data.average_score || 0)
        setDailyRank(data.daily_rank || null)
        setHistoricalAverage(data.historical_average || null)
        setDate(data.date || '')
        setError(null)
      } catch (error) {
        console.error('Failed to load results:', error)
        setError('Failed to load results. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [auth.currentUser, searchParams])

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
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 8px;
      margin-bottom: 32px;
    }

    .dash-card {
      background: #ffffff;
      border: 1px solid #eee;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      padding: 16px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: zoom-in;
    }

    .dash-card h3 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 400;
      font-size: 1.25rem;
      margin-bottom: 8px;
      color: #222;
    }

    .dash-metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.95rem;
    }
    .dash-metric:last-child { border-bottom: none; }

    .mini-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    .mini-table th, .mini-table td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid #f1f1f1;
    }
    .mini-table th { color: #666; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
    .mini-table tr:last-child td { border-bottom: none; }

    .results-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-top: 32px;
      margin-bottom: 48px;
    }

    /* Overlay animation */
    .dash-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      animation: fadeIn 0.2s ease-out;
    }

    .dash-overlay-card {
      width: min(860px, 92vw);
      max-height: 86vh;
      overflow: auto;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #eee;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 20px 20px 24px;
      will-change: transform;
      transform-origin: top left;
      transition: transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms ease;
    }

    .dash-close {
      position: sticky;
      top: 0;
      display: flex;
      justify-content: flex-end;
      padding-bottom: 4px;
      margin: -4px -4px 4px 0;
      background: linear-gradient(#fff, #ffffffdd 70%, transparent);
    }

    .dash-close button {
      border: 1px solid #e5e5e5;
      background: #fff;
      color: #111;
      border-radius: 999px;
      padding: 6px 10px;
      cursor: pointer;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .dash-close button:hover { background: #f7f7f7; }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
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

      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: 12px;
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

  // Calculate best/worst questions for display
  const best_question = useMemo(() => {
    if (!items.length) return 1
    const best = items.reduce((best, current, idx) => 
      (current.scores?.total_score || 0) > (best.scores?.total_score || 0) ? {item: current, index: idx + 1} : best,
      {item: items[0], index: 1}
    )
    return best.index
  }, [items])

  const worst_question = useMemo(() => {
    if (!items.length) return 1
    const worst = items.reduce((worst, current, idx) => 
      (current.scores?.total_score || 0) < (worst.scores?.total_score || 0) ? {item: current, index: idx + 1} : worst,
      {item: items[0], index: 1}
    )
    return worst.index
  }, [items])

  if (loading) {
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">Loading results...</div>
        </div>
      </div>
    )
  }

  if (error || !items.length) {
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">{error || 'No results found. Please complete today\'s questions first.'}</div>
          <div className="results-actions">
            <button onClick={() => navigate('/guess')}>Go to Questions</button>
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
            <h2>Average Score: {averageScore.toFixed(1)}%</h2>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${averageScore}%` }} />
            </div>
            {dailyRank !== null && (
              <p className="note">Your rank today: #{dailyRank} | Historical average: {historicalAverage?.toFixed(1) || 'N/A'}%</p>
            )}
            <p className="note">You were closest on #{best_question} and furthest off on #{worst_question}.</p>
          </div>
        </section>

        <section className="results-grid">
          {items.map((item, i) => (
            <div key={i} className="result-card">
              <img 
                src={item.post.imageUrl} 
                alt="tweet" 
                className="tweet-thumb" 
              />
              <div className="prediction-table">
                <div className="prediction-table-header"></div>
                <div className="prediction-table-header">Your Prediction</div>
                <div className="prediction-table-header">Actual Result</div>
                <div className="prediction-row-label">Democrat</div>
                <div className="prediction-value dem">{item.user.dem.toFixed(1)}%</div>
                <div className="prediction-value dem">{item.post.dem.toFixed(1)}%</div>
                <div className="prediction-row-label">Republican</div>
                <div className="prediction-value rep">{item.user.rep.toFixed(1)}%</div>
                <div className="prediction-value rep">{item.post.rep.toFixed(1)}%</div>
              </div>
              <div className="result-data">
                <span className="data-label">Accuracy Score</span>
                <span className="data-value total">{item.scores?.total_score.toFixed(1) || 0}%</span>
              </div>
              {item.question_rank !== null && item.question_rank !== undefined && (
                <div className="result-data">
                  <span className="data-label">Question Rank</span>
                  <span className="data-value">#{item.question_rank}</span>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="results-actions">
          <button onClick={() => navigate('/guess')}>Back to Questions</button>
        </div>
      </div>
    </div>
  )
}
