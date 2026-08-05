import Link from "next/link";

import { getBetModule } from "@/lib/bet";

export const dynamic = "force-dynamic";

function readableVerdict(verdict: string) {
  if (verdict.startsWith("POSITION:")) return "A position prevailed";
  return verdict.toLowerCase().replaceAll("_", " ");
}

export default async function HomePage() {
  const bets = await getBetModule().listPublic();
  return (
    <>
      <section className="shell hero">
        <div className="stack">
          <p className="eyebrow">Independent AI judgment</p>
          <h1>Settle the argument. Keep the friendship.</h1>
          <p className="lede">
            Put a nominal stake on a disagreement, invite up to three other people, and let Claude
            Opus, OpenAI Sol, and Grok research the same record before voting independently.
          </p>
          <div className="row">
            <Link href="/bets/new" className="button">
              Start a bet
            </Link>
            <span className="pill">No accounts · no payments</span>
          </div>
        </div>
        <p className="hero-note">
          Every model contributes evidence for and against every position. Two matching votes decide
          the result. The prompts, sources, opinions, retries, and costs are published with it.
        </p>
      </section>

      <section className="shell section">
        <div className="section-heading">
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">Public judgments</p>
            <h2>Recently settled</h2>
          </div>
        </div>
        {bets.length ? (
          <div className="grid">
            {bets.map((bet) => (
              <Link key={bet.publicId} href={`/bets/${bet.publicId}`} className="card feed-card">
                <div className="stack" style={{ gap: 8 }}>
                  <span className="verdict">{readableVerdict(bet.verdictKey)}</span>
                  <h3>{bet.title}</h3>
                  <p className="prose" style={{ margin: 0 }}>
                    {bet.question}
                  </p>
                </div>
                <div className="meta">
                  <span>{bet.participantNames.join(" · ")}</span>
                  <span>${bet.stakeUsd.toLocaleString()} each</span>
                  <time dateTime={bet.publishedAt.toISOString()}>
                    {bet.publishedAt.toLocaleDateString()}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">No published Judgments yet. Start the first Bet.</div>
        )}
      </section>
    </>
  );
}
