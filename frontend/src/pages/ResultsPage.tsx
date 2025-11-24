import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
const API_URL = import.meta.env.VITE_API_URL;


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
  const [selfLbRank, setSelfLbRank] = useState<null | { rank: number; total: number; score: number; gamesPlayed: number }>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const fmt = (n: unknown, digits = 1) =>
    typeof n === 'number' && isFinite(n as number) ? (n as number).toFixed(digits) : '—'
  const formatOffText = (userValue?: number, actualValue?: number) => {
    if (typeof userValue !== 'number' || typeof actualValue !== 'number') return '—'
    const diff = Math.abs(userValue - actualValue)
    if (!Number.isFinite(diff)) return '—'
    // Trim trailing .0 to keep the share text compact
    return diff % 1 === 0 ? diff.toFixed(0) : diff.toFixed(1)
  }

  // Load results from backend API
  useEffect(() => {
    async function loadResults() {
      if (!auth.currentUser) {
        // If auth not ready but we have prior data, keep showing it.
        if (!resultsData) {
          setError('Please sign in to view results')
        }
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
        // Normalize potential older/newer shapes
        const normalized = Array.isArray((data as any).questions)
          ? data
          : (data && Array.isArray((data as any).results))
          ? { ...data, questions: (data as any).results }
          : data
        setResultsData(normalized as any)
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

  // Load global leaderboard rank for current user (independent of daily rank)
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setSelfLbRank(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaderboard/user/${uid}`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) setSelfLbRank({
          rank: Number(d.rank || 0),
          total: Number(d.total || 0),
          score: Number(d.score || 0),
          gamesPlayed: Number(d.gamesPlayed || 0),
        })
      } catch {
        if (!cancelled) setSelfLbRank(null)
      }
    })()
    return () => { cancelled = true }
  }, [auth.currentUser])

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

    .results-share {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .results-share-button {
      position: relative;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.08);
      padding: 8px 20px;
      background: #111;
      color: #fff;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 26px rgba(0,0,0,0.16);
      overflow: hidden;
      transform-origin: center;
    }

    .results-share-button::before {
      content: '';
      position: absolute;
      inset: -40%;
      background: radial-gradient(circle at 0 0, rgba(255,255,255,0.18), transparent 55%);
      opacity: 0;
      transform: translate3d(-40%, -40%, 0);
    }

    .results-share-button:hover::before {
      animation: shareShimmer 1.8s ease-out infinite;
    }

    .results-share-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.18);
    }

    .results-share-button:active {
      transform: translateY(0);
      box-shadow: 0 8px 22px rgba(0,0,0,0.16);
    }

    .results-share-button--success {
      background: #16a34a;
    }

    .results-share-meta {
      font-size: 0.75rem;
      color: #777;
      text-align: center;
    }

    .results-share-status {
      font-size: 0.75rem;
      text-align: center;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #16a34a;
    }

    .results-share-status--error {
      color: #b91c1c;
    }

    .share-toast {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translate(-50%, 0);
      background: #0f172a;
      color: #fff;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.18);
      font-size: 0.9rem;
      letter-spacing: 0.01em;
      z-index: 90;
      animation: toastIn 0.2s ease, toastOut 0.2s ease 2.2s forwards;
    }

    .share-toast--error {
      background: #b91c1c;
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
    
    @keyframes shareShimmer {
      0% {
        opacity: 0;
        transform: translate3d(-40%, -40%, 0);
      }
      45% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translate3d(40%, 40%, 0);
      }
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translate(-50%, 10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    @keyframes toastOut {
      from { opacity: 1; }
      to { opacity: 0; }
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
    const dem = resultsData?.today_avg_score?.dem
    const rep = resultsData?.today_avg_score?.rep
    if (dem == null || rep == null) return 0
    return (dem + rep) / 2
  }, [resultsData])

  // Calculate overall historical average
  const overallHistoricalAvg = useMemo(() => {
    const dem = resultsData?.historical_avg?.dem
    const rep = resultsData?.historical_avg?.rep
    if (dem == null || rep == null) return null
    return (dem + rep) / 2
  }, [resultsData])

  // Calculate overall delta
  const overallDelta = useMemo(() => {
    if (overallHistoricalAvg === null) return null
    return overallAvgScore - overallHistoricalAvg
  }, [overallAvgScore, overallHistoricalAvg])

  // Calculate overall rank (average of dem and rep ranks, or use first available)
  const overallRank = useMemo(() => {
    if (!resultsData || !resultsData.today_rank) return null
    const demRank = resultsData.today_rank?.dem ?? null
    const repRank = resultsData.today_rank?.rep ?? null
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
    resultsData.questions.forEach((q: any, idx: number) => {
      const dem = q?.score?.dem ?? 0
      const rep = q?.score?.rep ?? 0
      const avgScore = (dem + rep) / 2
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
    resultsData.questions.forEach((q: any, idx: number) => {
      const dem = q?.score?.dem ?? 0
      const rep = q?.score?.rep ?? 0
      const avgScore = (dem + rep) / 2
      if (avgScore < worstScore) {
        worstScore = avgScore
        worstIdx = idx + 1
      }
    })
    return worstIdx
  }, [resultsData])

  const shareText = useMemo(() => {
    if (!resultsData) return ''

    const lines: string[] = []
    const rankChunk =
      overallRank !== null && overallRank !== undefined
        ? resultsData.total_users_today
          ? ` #${overallRank}/${resultsData.total_users_today}`
          : ` #${overallRank}`
        : ''

    lines.push('EchoBreaker')
    lines.push(`Score: ${fmt(overallAvgScore)}%${rankChunk ? ` · Rank${rankChunk}` : ''}`)
    lines.push('off = absolute gap from actual')

    if (resultsData.questions.length) {
      lines.push('')
      resultsData.questions.forEach((question, idx) => {
        const demOff = formatOffText(question.user_prediction?.dem, question.ground_truth?.dem)
        const repOff = formatOffText(question.user_prediction?.rep, question.ground_truth?.rep)
        const demCopy = demOff === '—' ? '—' : `${demOff}%`
        const repCopy = repOff === '—' ? '—' : `${repOff}%`
        lines.push(`Q${idx + 1}:🟦${demCopy} off 🟥${repCopy} off`)
      })
    }

    if (overallBestQuestion || overallWorstQuestion) {
      lines.push('')
      const bestText = overallBestQuestion ? `Q${overallBestQuestion}` : '—'
      const worstText = overallWorstQuestion ? `Q${overallWorstQuestion}` : '—'
      lines.push(`🔥 Best ${bestText} | 😬 Hard ${worstText}`)
    }

    return lines.join('\n')
  }, [resultsData, overallAvgScore, overallRank, overallBestQuestion, overallWorstQuestion])

  const handleShareResults = async () => {
    if (!resultsData) return

    try {
      const origin =
        typeof window !== 'undefined' && window.location && window.location.origin
          ? window.location.origin
          : 'https://echobreaker.app'
      const shareUrl = `${origin}/`
      const baseText = shareText.trim()
      const fullText = `${baseText}${baseText ? '\n\n' : ''}Try to beat me at: ${shareUrl}`

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = fullText
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setShareStatus('copied')
      window.setTimeout(() => setShareStatus('idle'), 2500)
    } catch (err) {
      console.error('Share failed', err)
      setShareStatus('error')
      window.setTimeout(() => setShareStatus('idle'), 2500)
    }
  }

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

  if (error) {
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  const hasQuestions = Array.isArray(resultsData?.questions) && (resultsData!.questions as any[]).length > 0
  if (!resultsData || !hasQuestions) {
    return (
      <div>
        <style>{css}</style>
        <div className="results-page">
          <div className="error-message">No results found. Please complete today&apos;s questions first.</div>
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
            <h2>Average Score: {fmt(overallAvgScore)}%</h2>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${overallAvgScore}%` }} />
            </div>
            <div className="results-share">
              <button
                type="button"
                className={`results-share-button${
                  shareStatus === 'copied' ? ' results-share-button--success' : ''
                }`}
                onClick={handleShareResults}
              >
                {shareStatus === 'copied'
                  ? 'Copied — stats ready'
                  : 'Copy today’s results'}
              </button>
              <p className="results-share-meta">
                Emoji summary copied to your clipboard — perfect for a text thread.
              </p>
              {shareStatus === 'copied' && (
                <p className="results-share-status" role="status" aria-live="polite">
                  Stats copied to your clipboard, ready to share.
                </p>
              )}
              {shareStatus === 'error' && (
                <p className="results-share-status results-share-status--error" role="alert">
                  Copy didn&apos;t work. Try again or paste manually.
                </p>
              )}
            </div>
            <section className="results-stats-grid">
              <div className="stats-col overall">
                <h3>Overall</h3>
                <p className="stat-line">
                  <span>Average Score</span>
                  <strong>{fmt(overallAvgScore)}%</strong>
                  {overallDelta !== null && (
                    <span className={`delta ${overallDelta >= 0 ? 'up' : 'down'}`}>
                      {overallDelta >= 0 ? '↑' : '↓'}{fmt(Math.abs(overallDelta))}%
                    </span>
                  )}
              </p>
                <p className="stat-line">
                  <span>Leaderboard Rank</span>
                  <strong>
                    {selfLbRank ? (
                      <>
                        #{selfLbRank.rank} <span className="sub">of {selfLbRank.total}</span>
                      </>
                    ) : (
                      auth.currentUser ? '—' : 'Sign in'
                    )}
                  </strong>
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{overallRank ?? 'N/A'}
                    {overallRank !== null && (resultsData?.total_users_today ?? 0) > 0 && (
                      <span className="sub"> of {resultsData?.total_users_today}</span>
                    )}
                  </strong>
                </p>
                {resultsData.historical_avg_overall !== null ? (
                  <p className="stat-line">
                    <span>Historical Avg</span>
                  <strong>{fmt(resultsData.historical_avg_overall ?? 0)}%</strong>
                    {resultsData.delta_from_historical_overall !== null && resultsData.delta_from_historical_overall !== undefined && (
                      <span className={`delta ${(resultsData.delta_from_historical_overall || 0) >= 0 ? 'up' : 'down'}`}>
                        {(resultsData.delta_from_historical_overall || 0) >= 0
                          ? `↑${fmt(Math.abs(resultsData.delta_from_historical_overall || 0))}%`
                          : `↓${fmt(Math.abs(resultsData.delta_from_historical_overall || 0))}%`}
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
                  <strong>{fmt(resultsData.today_avg_score?.dem ?? 0)}%</strong>
                  {resultsData.delta_from_historical?.dem !== null && resultsData.delta_from_historical?.dem !== undefined && (
                    <span className={`delta ${(resultsData.delta_from_historical?.dem || 0) >= 0 ? 'up' : 'down'}`}>
                      {(resultsData.delta_from_historical?.dem || 0) >= 0 ? '↑' : '↓'}{fmt(Math.abs(resultsData.delta_from_historical?.dem || 0))}%
                    </span>
                  )}
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{resultsData.today_rank?.dem ?? 'N/A'}
                    {resultsData.today_rank?.dem !== null && (resultsData?.total_users_today ?? 0) > 0 && (
                      <span className="sub"> of {resultsData?.total_users_today}</span>
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
                  <strong>{fmt(resultsData.today_avg_score?.rep ?? 0)}%</strong>
                  {resultsData.delta_from_historical?.rep !== null && resultsData.delta_from_historical?.rep !== undefined && (
                    <span className={`delta ${(resultsData.delta_from_historical?.rep || 0) >= 0 ? 'up' : 'down'}`}>
                      {(resultsData.delta_from_historical?.rep || 0) >= 0 ? '↑' : '↓'}{fmt(Math.abs(resultsData.delta_from_historical?.rep || 0))}%
                    </span>
                  )}
                </p>
                <p className="stat-line">
                  <span>Rank</span>
                  <strong>
                    #{resultsData.today_rank?.rep ?? 'N/A'}
                    {resultsData.today_rank?.rep !== null && (resultsData?.total_users_today ?? 0) > 0 && (
                      <span className="sub"> of {resultsData?.total_users_today}</span>
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
                <div className="prediction-value dem">{fmt(question.user_prediction?.dem)}%</div>
                <div className="prediction-value dem">{fmt(question.ground_truth?.dem)}%</div>
                <div className="prediction-row-label">Republican</div>
                <div className="prediction-value rep">{fmt(question.user_prediction?.rep)}%</div>
                <div className="prediction-value rep">{fmt(question.ground_truth?.rep)}%</div>
              </div>
              <div className="question-scores">
                <div className="party-score dem">
                  <span>Democrat Accuracy:</span>
                  <strong>{fmt(question.score?.dem)}%</strong>
                  {question.rank.dem !== null && question.rank.dem !== undefined && (
                    <span className="rank">
                      Rank #{question.rank.dem} <span className="sub">of {question.total_users}</span>
                    </span>
                  )}
                </div>
                <div className="party-score rep">
                  <span>Republican Accuracy:</span>
                  <strong>{fmt(question.score?.rep)}%</strong>
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
      {shareStatus === 'copied' && (
        <div className="share-toast" role="status" aria-live="polite">
          Stats copied to clipboard, ready to share.
        </div>
      )}
      {shareStatus === 'error' && (
        <div className="share-toast share-toast--error" role="alert">
          Copy failed. Try again.
        </div>
      )}
    </div>
  )
}
