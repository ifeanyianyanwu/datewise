// Temporary token check: proves every token category reaches the web app.
// Replaced by the real Plan a date screen in Phase 1.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="cover-adventurous flex h-40 flex-col justify-end rounded-lg p-4">
        <h1 className="font-display text-display-xl text-white">Saturday in Lekki</h1>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label uppercase text-ink-3">Tokens</span>
        <h2 className="font-display text-display">Plan a date</h2>
        <p className="text-body text-ink-2">
          Free entry and four floors to wander before it gets busy.
        </p>
        <p className="font-mono text-data text-ink-2">16:00 → 17:45 · 14 min · 5.1 km</p>
        <a href="#" className="text-caption font-semibold text-secondary-text">Open in Maps</a>
      </div>

      <div className="flex gap-2">
        <span className="rounded-pill border border-primary bg-primary-subtle px-3 py-1.5 text-caption font-semibold text-primary">Adventurous</span>
        <span className="rounded-pill bg-surface-2 px-3 py-1.5 text-caption font-semibold text-success">Ready</span>
        <span className="rounded-pill bg-surface-2 px-3 py-1.5 text-caption font-semibold text-danger">Out of credits</span>
      </div>

      <button
        type="button"
        className="rounded-pill bg-primary py-4 font-display text-heading text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-press"
      >
        Generate plan <span className="font-mono text-data opacity-70">1 credit</span>
      </button>
    </main>
  );
}
