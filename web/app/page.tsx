export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Live session control
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Run fair, fast badminton sessions.
        </h1>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Create sessions, balance courts, and keep everyone playing with
          minimal waiting time. This is the moderator&apos;s control panel for
          Badminton Pairing v2.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-50">
            1. Create session
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Set date, time, courts, and max players. Defaults come from your
            moderator profile.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-50">
            2. Players join
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Share an invite link or QR code. Players see their upcoming matches
            in real time.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-50">
            3. Courts run themselves
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Auto-generate pairings that balance skill, waiting time, and
            variety. Record results on court.
          </p>
        </div>
      </section>

      <section className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 sm:text-sm">
        <p className="font-medium text-slate-200">Get started</p>
        <p className="mt-2">
          <a
            href="/sessions"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View sessions
          </a>
          {" "}— create a session, share the join link, and run the court dashboard.
        </p>
      </section>
    </div>
  );
}
