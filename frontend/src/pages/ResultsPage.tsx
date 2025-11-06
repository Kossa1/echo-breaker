import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAuth } from 'firebase/auth'

type QuestionResult = {
  question_id: string
  tweet_image_url: string
  user_prediction: { dem: number; rep: number }
  ground_truth: { dem: number; rep: number }
  score: { dem: number; rep: number }
  rank: { dem: number | null; rep: number | null }
  total_users: number
}

type ResultsData = {
  today_avg_score: { dem: number; rep: number }
  today_rank: { dem: number | null; rep: number | null }
  total_users_today: number
  historical_avg: { dem: number | null; rep: number | null }
  historical_avg_overall: number | null
  delta_from_historical: { dem: number | null; rep: number | null }
  delta_from_historical_overall: number | null
  best_question: { dem: number | null; rep: number | null }
  worst_question: { dem: number | null; rep: number | null }
  questions: QuestionResult[]
}

export default function ResultsPage() {
  const auth = getAuth()
  const [searchParams] = useSearchParams()
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        
        // Backend now returns the new structure directly
        setResultsData(data)
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
    
    .results-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 32px;
      margin: 36px 0;
      padding: 24px 0 32px;
      border-top: 1px solid rgba(0,0,0,0.05);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .stats-col {
      text-align: center;
      font-family: system-ui, sans-serif;
    }
    
    .stats-col h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #444;
      margin-bottom: 8px;
    }
    
    .stat-line {
      margin: 4px 0;
      font-size: 14px;
      color: #666;
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .stat-line > span:first-child {
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.03em;
      margin-right: 6px;
    }
    
    .stat-line strong {
      font-weight: 600;
      color: #111;
      font-size: 15px;
    }
    
    .sub {
      font-size: 12px;
      color: #888;
      margin-left: 2px;
    }
    
    .stats-col.dem strong {
      color: #3b82f6;
    }
    
    .stats-col.rep strong {
      color: #ef4444;
    }
    
    .delta {
      font-size: 13px;
      font-weight: 600;
      margin-left: 6px;
    }
    
    .delta.up {
      color: #16a34a; /* green */
    }
    
    .delta.down {
      color: #dc2626; /* red */
    }
    
    .stat-line.muted {
      color: #999;
      font-style: italic;
    }
    
    .stat-line.muted .sub {
      font-size: 12px;
      color: #aaa;
      margin-left: 4px;
    }
    
    .question-scores {
      display: flex;
      justify-content: flex-end;
      gap: 24px;
      font-size: 13px;
      margin-top: 8px;
      color: #666;
      flex-wrap: wrap;
    }
    
    .party-score {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .party-score strong {
      font-weight: 600;
      color: #111;
      font-size: 15px;
    }
    
    .party-score.dem strong {
      color: #3b82f6;
    }
    
    .party-score.rep strong {
      color: #ef4444;
    }
    
    .party-score .rank {
      font-size: 12px;
      color: #888;
    }
    
    .party-score .rank .sub {
      font-size: 11px;
      color: #aaa;
      margin-left: 2px;
    }
    
    .new-questions-note {
      text-align: center;
      color: #666;
      font-size: 13px;
      margin-top: 40px;
      letter-spacing: 0.02em;
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
      margin-bottom: 32px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
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
        margin-bottom: 24px;
      }
      
      .results-stats-grid {
        grid-template-columns: 1fr;
        gap: 24px;
        padding: 20px 0 24px;
      }
      
      .stat-line {
        align-items: flex-start;
      }
      
      .question-scores {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      
      .party-score {
        align-items: flex-start;
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

  // Calculate overall average (average of dem and rep)
  const overallAvgScore = useMemo(() => {
    if (!resultsData) return 0
    return (resultsData.today_avg_score.dem + resultsData.today_avg_score.rep) / 2
  }, [resultsData])

  // Calculate overall historical average
  const overallHistoricalAvg = useMemo(() => {
    if (!resultsData?.historical_avg.dem || !resultsData.historical_avg.rep) return null
    return (resultsData.historical_avg.dem + resultsData.historical_avg.rep) / 2
  }, [resultsData])

  // Calculate overall delta
  const overallDelta = useMemo(() => {
    if (overallHistoricalAvg === null) return null
    return overallAvgScore - overallHistoricalAvg
  }, [overallAvgScore, overallHistoricalAvg])

  // Calculate overall rank (average of dem and rep ranks, or use first available)
  const overallRank = useMemo(() => {
    if (!resultsData) return null
    const demRank = resultsData.today_rank.dem
    const repRank = resultsData.today_rank.rep
    if (demRank !== null && repRank !== null) {
      return Math.round((demRank + repRank) / 2)
    }
    return demRank ?? repRank
  }, [resultsData])

  // Calculate overall best/worst question (using average of dem and rep scores)
  const overallBestQuestion = useMemo(() => {
    if (!resultsData?.questions.length) return null
    let bestScore = -1
    let bestIdx = null
    resultsData.questions.forEach((q, idx) => {
      const avgScore = (q.score.dem + q.score.rep) / 2
      if (avgScore > bestScore) {
        bestScore = avgScore
        bestIdx = idx + 1
      }
    })
    return bestIdx
  }, [resultsData])

  const overallWorstQuestion = useMemo(() => {
    if (!resultsData?.questions.length) return null
    let worstScore = 101
    let worstIdx = null
    resultsData.questions.forEach((q, idx) => {
      const avgScore = (q.score.dem + q.score.rep) / 2
      if (avgScore < worstScore) {
        worstScore = avgScore
        worstIdx = idx + 1
      }
    })
    return worstIdx
  }, [resultsData])

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

  if (error || !resultsData || !resultsData.questions.length) {
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">{error || 'No results found. Please complete today\'s questions first.'}</div>
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
            <h2>Average Score: {overallAvgScore.toFixed(1)}%</h2>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${overallAvgScore}%` }} />
            </div>
            <section className="results-stats-grid">
              <div className="stats-col overall">
                <h3>Overall</h3>
                <p className="stat-line">
                  <span>Average Score</span>
                  <strong>{overallAvgScore.toFixed(1)}%</strong>
                  {overallDelta !== null && (
                    <span className={`delta ${overallDelta >= 0 ? 'up' : 'down'}`}>
                      {overallDelta >= 0 ? '↑' : '↓'}{Math.abs(overallDelta).toFixed(1)}%
                    </span>
                  )}
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{overallRank ?? 'N/A'}
                    {overallRank !== null && resultsData.total_users_today > 0 && (
                      <span className="sub"> of {resultsData.total_users_today}</span>
                    )}
                  </strong>
                </p>
                {resultsData.historical_avg_overall !== null ? (
                  <p className="stat-line">
                    <span>Historical Avg</span>
                    <strong>{resultsData.historical_avg_overall.toFixed(1)}%</strong>
                    {resultsData.delta_from_historical_overall !== null && (
                      <span className={`delta ${resultsData.delta_from_historical_overall >= 0 ? 'up' : 'down'}`}>
                        {resultsData.delta_from_historical_overall >= 0
                          ? `↑${Math.abs(resultsData.delta_from_historical_overall).toFixed(1)}%`
                          : `↓${Math.abs(resultsData.delta_from_historical_overall).toFixed(1)}%`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="stat-line muted">
                    <span>Historical Avg</span>
                    <strong>—</strong>
                    <span className="sub">(first day — no history yet)</span>
                  </p>
                )}
                <p className="stat-line">
                  <span>Best Question</span>
                  <strong>{overallBestQuestion ? `#${overallBestQuestion}` : 'N/A'}</strong>
                </p>
                <p className="stat-line">
                  <span>Worst Question</span>
                  <strong>{overallWorstQuestion ? `#${overallWorstQuestion}` : 'N/A'}</strong>
                </p>
              </div>
              <div className="stats-col dem">
                <h3>Democrat</h3>
                <p className="stat-line">
                  <span>Average Score</span>
                  <strong>{resultsData.today_avg_score.dem.toFixed(1)}%</strong>
                  {resultsData.delta_from_historical.dem !== null && (
                    <span className={`delta ${resultsData.delta_from_historical.dem >= 0 ? 'up' : 'down'}`}>
                      {resultsData.delta_from_historical.dem >= 0 ? '↑' : '↓'}{Math.abs(resultsData.delta_from_historical.dem).toFixed(1)}%
                    </span>
                  )}
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{resultsData.today_rank.dem ?? 'N/A'}
                    {resultsData.today_rank.dem !== null && resultsData.total_users_today > 0 && (
                      <span className="sub"> of {resultsData.total_users_today}</span>
                    )}
                  </strong>
                </p>
                <p className="stat-line">
                  <span>Best Question</span>
                  <strong>{resultsData.best_question.dem ? `#${resultsData.best_question.dem}` : 'N/A'}</strong>
                </p>
                <p className="stat-line">
                  <span>Worst Question</span>
                  <strong>{resultsData.worst_question.dem ? `#${resultsData.worst_question.dem}` : 'N/A'}</strong>
                </p>
              </div>
              <div className="stats-col rep">
                <h3>Republican</h3>
                <p className="stat-line">
                  <span>Average Score</span>
                  <strong>{resultsData.today_avg_score.rep.toFixed(1)}%</strong>
                  {resultsData.delta_from_historical.rep !== null && (
                    <span className={`delta ${resultsData.delta_from_historical.rep >= 0 ? 'up' : 'down'}`}>
                      {resultsData.delta_from_historical.rep >= 0 ? '↑' : '↓'}{Math.abs(resultsData.delta_from_historical.rep).toFixed(1)}%
                    </span>
                  )}
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{resultsData.today_rank.rep ?? 'N/A'}
                    {resultsData.today_rank.rep !== null && resultsData.total_users_today > 0 && (
                      <span className="sub"> of {resultsData.total_users_today}</span>
                    )}
                  </strong>
                </p>
                <p className="stat-line">
                  <span>Best Question</span>
                  <strong>{resultsData.best_question.rep ? `#${resultsData.best_question.rep}` : 'N/A'}</strong>
                </p>
                <p className="stat-line">
                  <span>Worst Question</span>
                  <strong>{resultsData.worst_question.rep ? `#${resultsData.worst_question.rep}` : 'N/A'}</strong>
                </p>
              </div>
            </section>
          </div>
        </section>

        <section className="results-grid">
          {resultsData.questions.map((question) => (
            <div key={question.question_id} className="result-card">
              <img 
                src={question.tweet_image_url} 
                alt="tweet" 
                className="tweet-thumb" 
              />
              <div className="prediction-table">
                <div className="prediction-table-header"></div>
                <div className="prediction-table-header">Your Prediction</div>
                <div className="prediction-table-header">Actual Result</div>
                <div className="prediction-row-label">Democrat</div>
                <div className="prediction-value dem">{question.user_prediction.dem.toFixed(1)}%</div>
                <div className="prediction-value dem">{question.ground_truth.dem.toFixed(1)}%</div>
                <div className="prediction-row-label">Republican</div>
                <div className="prediction-value rep">{question.user_prediction.rep.toFixed(1)}%</div>
                <div className="prediction-value rep">{question.ground_truth.rep.toFixed(1)}%</div>
              </div>
              <div className="question-scores">
                <div className="party-score dem">
                  <span>Democrat Accuracy:</span>
                  <strong>{question.score.dem.toFixed(1)}%</strong>
                  {question.rank.dem !== null && question.rank.dem !== undefined && (
                    <span className="rank">
                      Rank #{question.rank.dem} <span className="sub">of {question.total_users}</span>
                    </span>
                  )}
                </div>
                <div className="party-score rep">
                  <span>Republican Accuracy:</span>
                  <strong>{question.score.rep.toFixed(1)}%</strong>
                  {question.rank.rep !== null && question.rank.rep !== undefined && (
                    <span className="rank">
                      Rank #{question.rank.rep} <span className="sub">of {question.total_users}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        <p className="new-questions-note">
          New questions arrive daily at midnight (ET).
        </p>
      </div>
    </div>
  )
}
