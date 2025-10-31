import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { SurveyPost } from '../lib/survey'

type ResultItem = { post: SurveyPost; user: { dem: number; rep: number } }
type LocationState = ResultItem | { items: ResultItem[] }

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state || {}) as Partial<LocationState>
  const items: ResultItem[] = Array.isArray((state as any).items)
    ? ((state as any).items as ResultItem[])
    : state && (state as any).post && (state as any).user
    ? [{ post: (state as any).post as SurveyPost, user: (state as any).user as { dem: number; rep: number } }]
    : []

  const css = useMemo(
    () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa; color: #2c2c2c; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 60px; border-bottom: 2px solid #e0e0e0; padding-bottom: 40px; }
    .header h1 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 3rem; font-weight: 300; color: #1a1a1a; margin-bottom: 20px; letter-spacing: -0.02em; }
    .header p { font-size: 1.2rem; color: #666; font-weight: 300; }
    .results-container { display: grid; gap: 40px; margin-bottom: 60px; }
    .result-card { background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 12px; overflow: hidden; transition: transform 0.2s ease; animation: slideIn 0.6s ease-out; }
    .result-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .tweet-section { padding: 20px; border-bottom: 1px dashed var(--panel-border); }
    .result-image { max-width: 100%; width: 100%; height: auto; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); display: block; margin: 0 auto; }
    .error-message { background: #ffebee; border-left: 4px solid #c53030; padding: 20px; border-radius: 6px; margin-bottom: 30px; color: #c53030; font-weight: 500; }
    .data-section { padding: 20px; background: rgba(255,255,255,0.02); }
    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px; }
    .data-group { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 10px; border-left: 4px solid var(--blue-700); border: 1px solid var(--panel-border); }
    .data-group.actual { border-left-color: #27ae60; }
    .data-group h3 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.1rem; font-weight: 600; color: #1a1a1a; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .percentage-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .percentage-row:last-child { border-bottom: none; margin-bottom: 0; }
    .party-label { font-size: 0.95rem; color: #666; font-weight: 500; }
    .percentage-value { font-size: 1.3rem; font-weight: 800; color: var(--text); background: rgba(255,255,255,0.04); padding: 6px 12px; border-radius: 8px; min-width: 60px; text-align: center; border: 1px solid var(--panel-border); }
    .percentage-value.dem { background: rgba(37,99,235,.12); color: var(--blue-600); }
    .percentage-value.rep { background: rgba(220,38,38,.12); color: var(--red-600); }
    .accuracy-section { margin-top: 18px; padding: 16px; background: rgba(59,130,246,.08); border-radius: 10px; border-left: 4px solid var(--blue-700); }
    .accuracy-title { font-size: 0.9rem; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
    .score-item { background: white; padding: 15px; border-radius: 6px; text-align: center; border: 2px solid #e0e0e0; }
    .score-item.total { grid-column: span 3; border-color: #4a90e2; background: #f0f8ff; }
    .score-label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .score-value { display: block; font-size: 1.5rem; font-weight: 700; color: #2c2c2c; }
    .score-value.dem { color: #2b6cb0; }
    .score-value.rep { color: #c53030; }
    .score-value.total { color: #4a90e2; font-size: 1.8rem; }
    .navigation { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px dashed var(--panel-border); }
    .try-again-btn { display: inline-block; text-decoration: none; }
    .divider { height: 1px; background: linear-gradient(to right, transparent, #e0e0e0, transparent); margin: 30px 0; }
    @media (max-width: 768px) { .container { padding: 20px 15px; } .header h1 { font-size: 2.5rem; } .data-grid { grid-template-columns: 1fr; gap: 20px; } .tweet-section, .data-section { padding: 20px; } .try-again-btn { width: 100%; min-width: auto; } .scores-grid { grid-template-columns: 1fr; } .score-item.total { grid-column: span 1; } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `,
    []
  )

  if (!items.length) {
    // No state passed; go back to Guess
    return (
      <div style={{ padding: 32 }}>
        <p>Missing results context. Please try again.</p>
        <button onClick={() => navigate('/guess')} style={{ marginTop: 12 }}>Go to Guess</button>
      </div>
    )
  }
  

  return (
    <div>
      <style>{css}</style>
      <div className="container">
        <div className="header">
          <h1>Your Results</h1>
          <p>See how your predictions compare to the actual survey data</p>
        </div>

        <div className="results-container">
          {items.map((it, idx) => {
            const demScore = 100 - Math.abs(it.user.dem - it.post.dem)
            const repScore = 100 - Math.abs(it.user.rep - it.post.rep)
            const totalScore = (demScore + repScore) / 2
            return (
              <React.Fragment key={`${it.post.id}-${idx}`}>
                <div className="result-card">
                  <div className="tweet-section">
                    <img src={it.post.imageUrl} alt="Social media post" className="result-image" />
                  </div>
                  <div className="data-section">
                    <div className="data-grid">
                      <div className="data-group">
                        <h3>Your Predictions</h3>
                        <div className="percentage-row">
                          <span className="party-label">Democrats</span>
                          <span className="percentage-value dem">{it.user.dem.toFixed(1)}%</span>
                        </div>
                        <div className="percentage-row">
                          <span className="party-label">Republicans</span>
                          <span className="percentage-value rep">{it.user.rep.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="data-group actual">
                        <h3>Actual Results</h3>
                        <div className="percentage-row">
                          <span className="party-label">Democrats</span>
                          <span className="percentage-value dem">{it.post.dem.toFixed(1)}%</span>
                        </div>
                        <div className="percentage-row">
                          <span className="party-label">Republicans</span>
                          <span className="percentage-value rep">{it.post.rep.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="accuracy-section">
                      <div className="accuracy-title">Scores</div>
                      <div className="scores-grid">
                        <div className="score-item">
                          <span className="score-label">Democrat Score</span>
                          <span className="score-value dem">{demScore.toFixed(1)}%</span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">Republican Score</span>
                          <span className="score-value rep">{repScore.toFixed(1)}%</span>
                        </div>
                        <div className="score-item total">
                          <span className="score-label">Total Score</span>
                          <span className="score-value total">{totalScore.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {idx !== items.length - 1 && <div className="divider" />}
              </React.Fragment>
            )
          })}
        </div>

        <div className="navigation">
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/guess" className="btn btn--primary try-again-btn">Try Again</Link>
            <Link to="/leaderboard" className="btn btn--primary">View Leaderboard</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
