export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-brass-soft">Spotix Polls</p>
      <h1 className="font-display text-4xl text-paper">Hi</h1>
      <p className="max-w-sm text-sm text-muted">
        Welcome to Spotix Polls. Seeing this probably means you didn't click a vote or nomination link to find us🙂‍↔️. It's good to still have you checking us out. 😉
        {/* <span className="font-mono text-paper"> /poll/&lt;pollId&gt;</span> or
        <span className="font-mono text-paper"> /nominate/&lt;pollId&gt;</span> shared from Spotix Booker. */}
      </p>
    </main>
  )
}
