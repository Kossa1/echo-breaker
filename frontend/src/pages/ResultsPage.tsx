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
    
    /* Header - NYT style typography */
    .header {
      text-align: center;
      margin-bottom: 56px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    .header h1 {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 3rem;
      font-weight: 300;
      color: #1a1a1a;
      margin-bottom: 16px;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    
    .header p {
      font-family: 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 1.1rem;
      color: #666;
      font-weight: 400;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }
    
    /* Results container - spacious grid */
    .results-container {
      display: grid;
      gap: 48px;
      margin-bottom: 64px;
    }
    
    /* Result card - flat white with soft shadow */
    .result-card {
      background: #ffffff;
      border: none;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
      animation: fadeInUp 0.6s ease-out;
    }
    
    .result-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.15);
    }
    
    /* Tweet section - elegant spacing */
    .tweet-section {
      padding: 32px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    .result-image {
      max-width: 100%;
      width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
      display: block;
      margin: 0 auto;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .result-image:hover {
      transform: translateY(-2px);
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
    
    /* Data section - clean padding */
    .data-section {
      padding: 32px;
      background: transparent;
    }
    
    /* Data grid - elegant two-column layout */
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    
    /* Data group - minimal card style */
    .data-group {
      background: transparent;
      padding: 0;
      border-radius: 0;
      border: none;
      border-left: 3px solid #3b82f6;
    }
    
    .data-group.actual {
      border-left-color: #10b981;
    }
    
    .data-group h3 {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: #666;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    /* Percentage row - clean layout */
    .percentage-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    
    .percentage-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .party-label {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #666;
      font-weight: 500;
    }
    
    /* Percentage value - elegant display */
    .percentage-value {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a1a;
      background: transparent;
      padding: 0;
      border-radius: 0;
      min-width: 80px;
      text-align: right;
      border: none;
      letter-spacing: -0.02em;
    }
    
    .percentage-value.dem {
      color: #3b82f6;
    }
    
    .percentage-value.rep {
      color: #ef4444;
    }
    
    /* Accuracy section - refined styling */
    .accuracy-section {
      margin-top: 32px;
      padding: 24px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    
    .accuracy-title {
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }
    
    /* Scores grid - three column layout */
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 0;
    }
    
    /* Score item - minimal card */
    .score-item {
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .score-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .score-item.total {
      grid-column: span 3;
      border-color: rgba(59, 130, 246, 0.3);
      background: rgba(59, 130, 246, 0.04);
    }
    
    .score-label {
      display: block;
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 0.75rem;
      color: #666;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }
    
    .score-value {
      display: block;
      font-family: 'Helvetica Neue', 'Inter', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.02em;
    }
    
    .score-value.dem {
      color: #3b82f6;
    }
    
    .score-value.rep {
      color: #ef4444;
    }
    
    .score-value.total {
      color: #1a1a1a;
      font-size: 2rem;
    }
    
    /* Navigation - refined spacing */
    .navigation {
      text-align: center;
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    /* Button - NYT style minimal */
    .btn {
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
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }
    
    .btn:hover {
      background: #2d2d2d;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }
    
    .btn:focus-visible {
      outline: 2px solid #1a1a1a;
      outline-offset: 2px;
    }
    
    .try-again-btn {
      display: inline-block;
    }
    
    /* Divider - subtle separator */
    .divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.08);
      margin: 48px 0;
      border: none;
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
    
    /* Mobile responsive - refined breakpoints */
    @media (max-width: 768px) {
      .container {
        padding: 32px 20px 48px;
      }
      
      .header {
        margin-bottom: 40px;
        padding-bottom: 24px;
      }
      
      .header h1 {
        font-size: 2.2rem;
        line-height: 1.2;
      }
      
      .header p {
        font-size: 1rem;
      }
      
      .results-container {
        gap: 36px;
        margin-bottom: 48px;
      }
      
      .tweet-section {
        padding: 24px;
      }
      
      .data-section {
        padding: 24px;
      }
      
      .data-grid {
        grid-template-columns: 1fr;
        gap: 32px;
      }
      
      .data-group {
        border-left-width: 2px;
      }
      
      .percentage-row {
        padding: 10px 0;
      }
      
      .accuracy-section {
        margin-top: 24px;
        padding: 20px;
      }
      
      .scores-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .score-item.total {
        grid-column: span 1;
      }
      
      .navigation {
        margin-top: 40px;
        padding-top: 24px;
      }
      
      .try-again-btn {
        width: 100%;
        display: block;
        margin-bottom: 12px;
      }
      
      .btn {
        width: 100%;
        padding: 16px 32px;
      }
      
      .divider {
        margin: 36px 0;
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

  if (!items.length) {
    // No state passed; go back to Guess
    return (
      <div>
        <style>{css}</style>
        <div className="container">
          <div className="error-message">Missing results context. Please try again.</div>
          <div className="navigation">
            <button onClick={() => navigate('/guess')} className="btn">Go to Guess</button>
          </div>
        </div>
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
          <Link to="/guess" className="btn try-again-btn">Try Again</Link>
          <Link to="/leaderboard" className="btn">View Leaderboard</Link>
        </div>
      </div>
    </div>
  )
}
