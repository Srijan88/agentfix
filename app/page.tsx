import Link from "next/link";

/* ─── Small presentational helpers ─────────────────────────── */

function LoopStep({
  index,
  label,
  desc,
}: {
  index: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="relative flex-1 min-w-[160px]">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-primary/70 tracking-widest">
          {index}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>
      <h4 className="text-on-surface font-semibold mb-1">{label}</h4>
      <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  delay,
}: {
  icon: string;
  title: string;
  desc: string;
  delay: string;
}) {
  return (
    <div
      className={`glass-panel lift rounded-2xl p-6 hover:border-primary/40 hover:bg-white/[0.05] animate-fade-up ${delay}`}
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg mb-4">
        {icon}
      </div>
      <h3 className="text-on-surface font-semibold mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Landing Page ─────────────────────────────────────────── */

export default function Landing() {
  const features = [
    {
      icon: "🔬",
      title: "Deep Prompt Analysis",
      desc: "Detect 50+ issue types across security, reliability, and AI-specific risk — each scored and mapped to the exact prompt section.",
    },
    {
      icon: "🛡",
      title: "Adversarial Red-Teaming",
      desc: "Run 600+ curated injection and jailbreak payloads across 20 attack categories, with optional live-probe against a real agent.",
    },
    {
      icon: "✦",
      title: "Autonomous Self-Improve",
      desc: "Gemini 2.5 Flash rewrites your prompt pack from observed failures, then re-tests until secure — no human in the loop.",
    },
    {
      icon: "📊",
      title: "13-Dimension Scoring",
      desc: "A single reliability score backed by role clarity, tool safety, injection resistance, escalation behavior, and more.",
    },
    {
      icon: "💬",
      title: "Research & Ask AI",
      desc: "Ask security questions in context and get implementation guidance with suggested prompt wording you can apply instantly.",
    },
    {
      icon: "📄",
      title: "Exportable Reports",
      desc: "Generate a full before/after developer report with remaining risks and call-level observability you can hand off.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* ── Ambient background ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="aurora float-slow"
          style={{
            width: 520,
            height: 520,
            top: -160,
            left: "50%",
            marginLeft: -260,
            background: "rgba(189, 0, 255, 0.22)",
            animation: "float-slow 11s ease-in-out infinite",
          }}
        />
        <div
          className="aurora"
          style={{
            width: 420,
            height: 420,
            top: 80,
            right: -120,
            background: "rgba(91, 255, 161, 0.10)",
            animation: "float-slow 14s ease-in-out infinite",
          }}
        />
        <div
          className="aurora"
          style={{
            width: 380,
            height: 380,
            top: 240,
            left: -120,
            background: "rgba(231, 0, 110, 0.10)",
            animation: "float-slow 16s ease-in-out infinite",
          }}
        />
        <div className="absolute inset-0 grid-backdrop" />
      </div>

      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="relative z-20">
        <nav className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 text-primary font-black">
              A
            </span>
            <span className="text-lg font-bold tracking-tight">AgentFix</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-on-surface-variant">
            <a href="#how" className="hover:text-on-surface transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-on-surface transition-colors">
              Features
            </a>
            <a
              href="https://github.com/Srijan88/agentfix"
              target="_blank"
              rel="noreferrer"
              className="hover:text-on-surface transition-colors"
            >
              GitHub
            </a>
          </div>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-all hover:shadow-[0_0_24px_rgba(189,0,255,0.5)]"
          >
            Login
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <main className="relative z-10">
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-28 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-mono text-on-surface-variant">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
            Powered by Vertex AI · Gemini 2.5 Flash
          </div>

          <h1 className="animate-fade-up delay-1 mt-8 text-balance text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
            Harden your AI agents
            <br />
            <span className="text-gradient">before attackers do.</span>
          </h1>

          <p className="animate-fade-up delay-2 mx-auto mt-7 max-w-2xl text-lg text-on-surface-variant leading-relaxed">
            AgentFix analyzes your prompt pack for vulnerabilities, launches
            real adversarial attacks, and autonomously rewrites it until it&apos;s
            secure — then proves it with a before / after report.
          </p>

          <div className="animate-fade-up delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-on-primary transition-all hover:shadow-[0_0_30px_rgba(189,0,255,0.55)]"
            >
              Login to the Playground
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3 text-base font-medium text-on-surface hover:border-primary/40 hover:bg-white/[0.04] transition-all"
            >
              See how it works
            </a>
          </div>

          {/* Stat strip */}
          <div className="animate-fade-up delay-4 mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {[
              { v: "600+", l: "Attack payloads" },
              { v: "20", l: "Attack categories" },
              { v: "13", l: "Reliability dimensions" },
            ].map((s) => (
              <div key={s.l} className="bg-surface/40 px-4 py-6">
                <div className="text-3xl font-black text-on-surface">{s.v}</div>
                <div className="mt-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center mb-14">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/70">
              The self-improve loop
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Four steps. Zero human intervention.
            </h2>
          </div>

          <div className="glass-panel rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 md:gap-6">
              <LoopStep
                index="01"
                label="Analyze"
                desc="Scan the prompt pack for weak guardrails, injection risk, and unclear boundaries."
              />
              <LoopStep
                index="02"
                label="Attack"
                desc="Fire 600+ adversarial payloads across 20 categories to find what breaks."
              />
              <LoopStep
                index="03"
                label="Improve"
                desc="Gemini rewrites the failing sections into a hardened prompt pack."
              />
              <LoopStep
                index="04"
                label="Re-test"
                desc="Re-run the same attacks and loop until everything passes, or stop early when secure."
              />
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-14">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/70">
              What&apos;s inside
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Everything you need to ship safer agents.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                delay={`delay-${(i % 6) + 1}`}
              />
            ))}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-container/15 via-white/[0.03] to-transparent p-12 text-center">
            <div
              className="aurora"
              style={{
                width: 360,
                height: 360,
                top: -120,
                left: "50%",
                marginLeft: -180,
                background: "rgba(189, 0, 255, 0.22)",
              }}
            />
            <h2 className="relative text-3xl md:text-4xl font-bold tracking-tight">
              Ready to break your own agent?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-on-surface-variant">
              Log in to the playground and run your first attack-and-heal cycle
              in minutes.
            </p>
            <Link
              href="/dashboard"
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-on-primary transition-all hover:shadow-[0_0_30px_rgba(189,0,255,0.55)]"
            >
              Login
              <span>→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-md bg-primary/15 border border-primary/30 text-primary text-xs font-black">
              A
            </span>
            <span>AgentFix</span>
          </div>
          <p className="font-mono text-xs">
            Autonomous AI agent security testing & self-improvement.
          </p>
        </div>
      </footer>
    </div>
  );
}
