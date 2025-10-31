/* Utilities to access survey images + ground truth from survey_metadata
 * We rely on a symlink at src/survey_metadata -> ../../survey_metadata
 * and use Vite's import.meta.glob to discover assets at build time.
 */

export interface SurveyPost {
  id: string
  imageUrl: string
  dem: number
  rep: number
}

// Discover all tweet*.json files under src/survey_metadata and pair them with images
export function loadAllSurveyPosts(): SurveyPost[] {
  // JSON is loaded as raw string to avoid TS config for JSON modules
  const jsonMods = import.meta.glob('../survey_metadata/**/tweet*.json', {
    eager: true,
    as: 'raw',
  }) as Record<string, string>

  // Images resolve to URLs
  const imgMods = import.meta.glob('../survey_metadata/**/tweet*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, any>

  const toKey = (p: string) => p.replace(/\\.json$/i, '')

  const imagesByKey = new Map<string, string>()
  for (const [path, mod] of Object.entries(imgMods)) {
    const base = path.replace(/\.(png|jpg|jpeg)$/i, '')
    const url = (mod && (mod.default || mod)) as string
    if (url) imagesByKey.set(base, url)
  }

  const posts: SurveyPost[] = []
  for (const [jsonPath, raw] of Object.entries(jsonMods)) {
    try {
      const parsed = JSON.parse(raw)
      const key = toKey(jsonPath)
      const imageUrl = imagesByKey.get(key)
      if (!imageUrl) continue
      const dem = Number(parsed.dem)
      const rep = Number(parsed.rep)
      if (!Number.isFinite(dem) || !Number.isFinite(rep)) continue
      posts.push({ id: key, imageUrl, dem, rep })
    } catch {
      // ignore bad JSON
    }
  }

  return posts
}

export function getRandomSurveyPost(): SurveyPost | null {
  const all = loadAllSurveyPosts()
  if (!all.length) return null
  const idx = Math.floor(Math.random() * all.length)
  return all[idx]
}

