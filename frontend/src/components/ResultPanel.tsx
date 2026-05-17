// D-05: nur "Aufwand: {pt} PT", keine Locale-Formatierung in Phase 1.
interface Props {
  pt: number | null
}

export default function ResultPanel({ pt }: Props) {
  if (pt === null) return null
  return (
    <div className="rounded border border-green-300 bg-green-50 p-3">
      <p className="text-lg">Aufwand: {String(pt)} PT</p>
    </div>
  )
}
