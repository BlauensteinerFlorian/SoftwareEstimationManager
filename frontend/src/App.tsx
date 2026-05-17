// D-05: Phase-1-Layout — kein Router, eine Route, zwei Komponenten.
import { useState } from 'react'
import EstimateForm from './components/EstimateForm'
import ResultPanel from './components/ResultPanel'

export default function App() {
  const [pt, setPt] = useState<number | null>(null)
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Software-Aufwandsschätzung</h1>
        <p className="text-sm text-gray-600">Skeleton-Phase: ein Parameter, eine Zahl.</p>
        <EstimateForm onResult={setPt} />
        <ResultPanel pt={pt} />
      </div>
    </div>
  )
}
