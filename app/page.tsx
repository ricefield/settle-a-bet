import Link from "next/link";

import { PanelModelLogo } from "@/components/PanelModelLogo";
import { getBetModule } from "@/lib/bet";

export const dynamic = "force-dynamic";

function readableVerdict(verdict: string) {
  if (verdict.startsWith("POSITION:")) return "One side won";
  if (verdict === "NO_MATERIAL_DISAGREEMENT") return "Basically a tie";
  if (verdict === "NO_SUBMITTED_POSITION_PREVAILS") return "Neither side won";
  return "Too close to call";
}

export default async function HomePage() {
  const bets = await getBetModule().listPublic();
  return (
    <main className="home-page">
      <section className="shell home-hero">
        <div>
          <span className="status-chip status-chip-live">
            <span /> Built for friendly arguments
          </span>
          <h1>Put the group chat debate to bed.</h1>
          <p>
            Set the question, invite your friends, and let Claude, Sol, and Grok compare everyone's
            case before picking a winner.
          </p>
          <div className="hero-actions">
            <Link href="/bets/new" className="button">
              Start a bet
            </Link>
            <a href="#how-it-works" className="text-link">
              See how it works →
            </a>
          </div>
        </div>
        <div className="hero-panel" aria-label="How results are decided">
          <div className="hero-panel-top">
            <span>AI panel</span>
            <strong>Best of 3</strong>
          </div>
          <div className="panel-models">
            <div>
              <PanelModelLogo member="CLAUDE_OPUS" />
              <p>
                <b>Claude</b>
                <small>Independent research</small>
              </p>
            </div>
            <div>
              <PanelModelLogo member="OPENAI_SOL" />
              <p>
                <b>Sol</b>
                <small>Independent research</small>
              </p>
            </div>
            <div>
              <PanelModelLogo member="XAI_GROK" />
              <p>
                <b>Grok</b>
                <small>Independent research</small>
              </p>
            </div>
          </div>
          <p className="hero-panel-note">
            Same sources. Separate votes. Two matching picks settle it.
          </p>
        </div>
      </section>

      <section className="shell latest-section" id="latest">
        <div className="market-toolbar">
          <div>
            <h2>Latest results</h2>
            <p>See what the panel has settled recently.</p>
          </div>
          <Link href="/bets/new" className="button button-secondary button-small">
            Create yours
          </Link>
        </div>
        {bets.length ? (
          <div className="market-list">
            {bets.map((bet) => (
              <Link key={bet.publicId} href={`/bets/${bet.publicId}`} className="market-row">
                <div className="market-icon" aria-hidden="true">
                  ✓
                </div>
                <div className="market-copy">
                  <div className="market-row-top">
                    <span className="status-chip">Settled</span>
                    <span>{bet.participantNames.join(" vs. ")}</span>
                  </div>
                  <h3>{bet.title}</h3>
                  <p>{bet.question}</p>
                </div>
                <div className="market-result">
                  <small>Result</small>
                  <strong>{readableVerdict(bet.verdictKey)}</strong>
                  <span>${(bet.stakeUsd * bet.participantCount).toLocaleString()} pretend pot</span>
                </div>
                <span className="market-arrow" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="market-icon" aria-hidden="true">
              ?
            </div>
            <h3>No results yet</h3>
            <p>Start the first bet and give the panel something to settle.</p>
            <Link href="/bets/new" className="button button-small">
              Start a bet
            </Link>
          </div>
        )}
      </section>

      <section className="how-section" id="how-it-works">
        <div className="shell">
          <div className="how-heading">
            <h2>Three steps. Then it’s settled.</h2>
            <p>No accounts, payment details, or awkward follow-up required.</p>
          </div>
          <ol className="how-list">
            <li>
              <span>1</span>
              <div>
                <h3>Set the bet</h3>
                <p>Write the question, the ground rules, and your own answer.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Send the links</h3>
                <p>Each friend gets a private link to add their take once.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Get the result</h3>
                <p>Three AI panelists research the same sources and vote independently.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
