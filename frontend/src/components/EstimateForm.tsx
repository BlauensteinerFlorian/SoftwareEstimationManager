// D-01: pages (≥0 Integer) + complexity (Pflicht, KEIN Default → Pitfall #17).
import { useState } from 'react'
import { postEstimate, type Complexity } from '../api/client'

interface Props {
  onResult: (pt: number | null) => void
}

export default function EstimateForm({ onResult }: Props) {
  const [pages, setPages] = useState<number | ''>('')
  // Pitfall #17 (Anchoring Bias): kein Default — User MUSS aktiv wählen.
  const [complexity, setComplexity] = useState<Complexity | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    onResult(null)
    if (pages === '' || complexity === '') {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    setBusy(true)
    try {
      const { pt } = await postEstimate({ pages, complexity })
      onResult(pt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Anzahl Pages</span>
        <input
          type="number"
          min={0}
          step={1}
          value={pages}
          onChange={(e) => setPages(e.target.value === '' ? '' : Number(e.target.value))}
          required
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Komplexität</span>
        <select
          value={complexity}
          onChange={(e) => setComplexity(e.target.value as Complexity)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="" disabled>— bitte wählen —</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="very_high">very_high</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? 'Berechne…' : 'Berechnen'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
