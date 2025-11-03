import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { type SurveyPost } from '../lib/survey'

export default function GuessPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [post, setPost] = useState<SurveyPost | null>(null)
  const [dem, setDem] = useState<number>(50)
  const [rep, setRep] = useState<number>(50)
  const [loading, setLoading] = useState(false)

  // Multi-question support via ?total=N (defaults to 1)
  const totalQuestions = Math.max(1, Number(searchParams.get('total') || '1'))
  const [qIndex, setQIndex] = useState<number>(0) // 0-based
  const [answers, setAnswers] = useState<Array<{ post: SurveyPost; user: { dem: number; rep: number } }>>([])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/random_tweet')
        if (!res.ok) {
          setPost(null)
          return
        }
        const data = await res.json()
        // Map backend response to frontend SurveyPost interface
        setPost({
          id: data.id,
          imageUrl: data.image_url,
          dem: data.dem,
          rep: data.rep
        })
      } catch (error) {
        console.error('Failed to load tweet:', error)
        setPost(null)
      }
    }
    load()
  }, [qIndex])

  const css = useMemo(
    () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .container { max-width: 860px; margin: 0 auto; padding: 24px 10px; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 1px solid var(--panel-border); padding-bottom: 20px; }
    .header h1 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 2.2rem; font-weight: 700; color: var(--text); margin-bottom: 10px; letter-spacing: -0.02em; }
    .header p { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 1.05rem; color: var(--muted); font-weight: 400; }
    .progress-indicator { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 1rem; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 30px; padding: 12px 24px; background: #f0f8ff; border-radius: 6px; display: inline-block; border-left: 4px solid #4a90e2; }
    .tweet-image-section { text-align: center; margin-bottom: 28px; padding: 20px 0; background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 12px; }
    .instruction-text { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 1.2rem; color: #2c2c2c; margin-bottom: 30px; font-weight: 400; line-height: 1.6; padding: 0 20px; }
    .tweet-image-container { display: flex; justify-content: center; align-items: center; }
    .tweet-image { max-width: 620px; width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); transition: transform 0.3s ease; }
    .tweet-image:hover { transform: scale(1.02); }
    .prediction-form-single { background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); padding: 20px; border-radius: 12px; margin-bottom: 24px; }
    .error-message { background: rgba(185,28,28,.15); border-left: 4px solid var(--red-700); padding: 16px; border-radius: 10px; margin-bottom: 20px; color: #fecaca; font-weight: 600; text-align: center; }
    .slider-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .party-block { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .party-block label { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 1rem; font-weight: 600; color: #555; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .slider-wrapper { position: relative; width: 100%; margin-bottom: 15px; }
    .party-block input[type="range"] { width: 100%; height: 8px; border-radius: 4px; background: #e0e0e0; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; transition: all 0.3s ease; }
    .party-block input[type="range"]:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .party-block.democrat input[type="range"] { background: linear-gradient(to right, #e3f2fd 0%, #2b6cb0 100%); }
    .party-block.democrat input[type="range"]::-webkit-slider-thumb { background: #2b6cb0; border: 3px solid white; box-shadow: 0 2px 8px rgba(43,108,176,0.3); }
    .party-block.democrat input[type="range"]::-moz-range-thumb { background: #2b6cb0; border: 3px solid white; box-shadow: 0 2px 8px rgba(43,108,176,0.3); }
    .party-block.republican input[type="range"] { background: linear-gradient(to right, #ffebee 0%, #c53030 100%); }
    .party-block.republican input[type="range"]::-webkit-slider-thumb { background: #c53030; border: 3px solid white; box-shadow: 0 2px 8px rgba(197,48,48,0.3); }
    .party-block.republican input[type="range"]::-moz-range-thumb { background: #c53030; border: 3px solid white; box-shadow: 0 2px 8px rgba(197,48,48,0.3); }
    .party-block input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; transition: all 0.3s ease; }
    .party-block input[type="range"]::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: none; transition: all 0.3s ease; }
    .party-block input[type="range"]::-webkit-slider-thumb:hover, .party-block input[type="range"]::-moz-range-thumb:hover { transform: scale(1.1); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
    .value-display { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--text); background: rgba(255,255,255,0.04); padding: 10px 16px; border-radius: 10px; border: 1px solid var(--panel-border); min-width: 80px; text-align: center; transition: all 0.3s ease; }
    .value-display.democrat { color: var(--blue-600); background: rgba(37,99,235,.1); }
    .value-display.republican { color: var(--red-600); background: rgba(220,38,38,.1); }
    .submit-section { text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px dashed var(--panel-border); }
    .submit-btn { all: unset; }
    .loading { display: none; margin-top: 20px; color: #666; font-style: italic; }
    @media (max-width: 768px) { .container { padding: 20px 15px; } .header h1 { font-size: 2rem; } .tweet-image-section { padding: 30px 0; margin-bottom: 30px; } .instruction-text { font-size: 1.1rem; padding: 0 15px; } .tweet-image { max-width: 100%; margin: 0 15px; } .prediction-form-single { padding: 20px; margin-bottom: 30px; } .slider-container { grid-template-columns: 1fr; gap: 30px; } .submit-btn { width: 100%; min-width: auto; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .tweet-container { animation: fadeIn 0.6s ease-out; }
  `,
    []
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!post) return
    setLoading(true)

    const nextAnswers = [...answers, { post, user: { dem, rep } }]

    // If we have more questions to go, advance and reset sliders; otherwise navigate to results
    if (qIndex + 1 < totalQuestions) {
      setTimeout(() => {
        setAnswers(nextAnswers)
        setQIndex((i) => i + 1)
        setDem(50)
        setRep(50)
        setLoading(false)
        // Maintain the total in the URL for clarity
        setSearchParams((prev) => {
          const p = new URLSearchParams(prev)
          p.set('total', String(totalQuestions))
          return p
        })
      }, 200)
    } else {
      setTimeout(() => {
        navigate('/guess/results', {
          replace: false,
          state: totalQuestions > 1 ? { items: nextAnswers } : nextAnswers[0],
        })
      }, 300)
    }
  }

  return (
    <div>
      <style>{css}</style>
      <div className="container">
        <div className="header">
          <h1>Guess the Poll</h1>
          <p>Predict what percentage of Democrats and Republicans support each tweet</p>
          {totalQuestions > 1 && (
            <div className="progress-indicator">Question {qIndex + 1} of {totalQuestions}</div>
          )}
        </div>

        {post ? (
          <div className="tweet-image-section">
            <div className="instruction-text">
              Below is a social media post. Estimate the percentage of Democrats and Republicans who agree with the sentiment expressed.
            </div>
            <div className="tweet-image-container">
              <img src={post.imageUrl} alt="Social media post" className="tweet-image" />
            </div>
          </div>
        ) : (
          <div className="error-message">No posts available</div>
        )}

        <form onSubmit={onSubmit} id="predictionForm">
          <div className="prediction-form-single">
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

          <div className="submit-section">
            <button type="submit" className="btn btn--primary" id="submitBtn" disabled={!post || loading}>
              {loading
                ? 'Submitting…'
                : totalQuestions > 1 && qIndex + 1 < totalQuestions
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

