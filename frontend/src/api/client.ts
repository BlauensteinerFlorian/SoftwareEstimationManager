// Pitfall #12: nur relative /api/-Pfade — nginx proxied in Prod, Vite proxied in Dev.
export type Complexity = 'low' | 'medium' | 'high' | 'very_high'

export interface EstimateRequest {
  pages: number
  complexity: Complexity
}

export interface EstimateResponse {
  pt: number
}

export async function postEstimate(req: EstimateRequest): Promise<EstimateResponse> {
  const res = await fetch('/api/estimates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API-Fehler ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<EstimateResponse>
}
