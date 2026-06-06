export default function AppLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-16 shrink-0 border-b border-line bg-canvas/95 animate-pulse" />
      <div className="flex-1 p-6 space-y-3">
        <div className="h-5 w-40 rounded-lg bg-surface animate-pulse" />
        <div className="h-3 w-28 rounded bg-surface animate-pulse" />
      </div>
    </div>
  )
}
