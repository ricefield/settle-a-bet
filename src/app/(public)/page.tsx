const arbitrationSteps = [
  "Create a friendly bet with a clear topic, participant count, and wager.",
  "Share the private link so everyone can submit their argument, sources, and payment.",
  "Lock submissions once every participant has joined, then let the AI panel deliberate.",
  "Send everyone a judgment page with the winner, vote breakdown, caveats, and payout result.",
];

const evaluationSafeguards = [
  "No future or predictive bets: the arbitrator can reject anything that is not ready to resolve.",
  "AI-generated arbitration, not guaranteed truth: participants agree the neutral robot judge may be wrong.",
  "The evaluator can mark junk, nonsense, unsafe, or unresolvable submissions for cancellation or refund.",
  "A v2 appeals lane is reserved for new evidence, process challenges, or a stronger review panel.",
];

const judgePanel = [
  {
    role: "Factual referee",
    job: "Checks claims, citations, and whether the dispute is already resolvable.",
  },
  {
    role: "Argument scorer",
    job: "Scores clarity, relevance, evidence quality, and who met the agreed rubric.",
  },
  {
    role: "Adversarial reviewer",
    job: "Looks for prompt injection, missing context, hallucinated evidence, and unfair weighting.",
  },
  {
    role: "Final arbiter",
    job: "Synthesizes the panel vote into a concise social judgment and payout instruction.",
  },
];

export default function Page() {
  return (
    <div className="space-y-16 py-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="w-fit rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            Fun social AI arbitration for friends and online debates
          </p>
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">
              Settle a Bet
            </h1>
            <p className="max-w-2xl text-xl leading-8 text-gray-200">
              Create a private wager, invite the group, collect everyone&apos;s
              best argument, and let a neutral AI arbitration panel decide who
              gets bragging rights and the pot.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-md bg-cyan-300 px-5 py-3 text-center font-bold text-gray-950 hover:bg-cyan-200"
              href="#flow"
            >
              Plan the bet flow
            </a>
            <a
              className="rounded-md border border-gray-500 px-5 py-3 text-center font-bold text-white hover:border-cyan-300"
              href="#arbitration"
            >
              Review AI panel
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-600 bg-gray-800/80 p-6 shadow-2xl">
          <div className="space-y-4 rounded-2xl bg-gray-950/60 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Example bet
            </p>
            <h2 className="text-2xl font-bold text-white">
              Was Sam right about the house rule?
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-400">Participants</dt>
                <dd className="text-lg font-semibold text-white">3</dd>
              </div>
              <div>
                <dt className="text-gray-400">Wager</dt>
                <dd className="text-lg font-semibold text-white">$10 each</dd>
              </div>
              <div>
                <dt className="text-gray-400">Mode</dt>
                <dd className="text-lg font-semibold text-white">
                  Best argument
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Status</dt>
                <dd className="text-lg font-semibold text-cyan-200">
                  Ready to judge
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="flow" className="space-y-6">
        <h2 className="text-3xl font-bold text-white">V1 product flow</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {arbitrationSteps.map((step, index) => (
            <article
              key={step}
              className="rounded-2xl border border-gray-600 bg-gray-800 p-5"
            >
              <p className="text-sm font-bold text-cyan-200">
                Step {index + 1}
              </p>
              <p className="mt-2 text-lg text-gray-100">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="arbitration" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">
            AI arbitration design
          </h2>
          <p className="max-w-3xl text-gray-300">
            The app is intentionally casual, but the judgment process should
            still be transparent: independent roles vote, an adversarial pass
            challenges the result, and the final summary explains the decision
            without pretending AI is infallible.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {judgePanel.map(({ role, job }) => (
            <article
              key={role}
              className="rounded-2xl border border-gray-600 bg-gray-800 p-5"
            >
              <h3 className="text-xl font-bold text-white">{role}</h3>
              <p className="mt-3 text-gray-300">{job}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-300/40 bg-amber-300/10 p-6">
        <h2 className="text-2xl font-bold text-amber-100">
          Guardrails for a fun-money prototype
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {evaluationSafeguards.map((item) => (
            <li
              key={item}
              className="rounded-xl bg-gray-950/30 p-4 text-gray-100"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
