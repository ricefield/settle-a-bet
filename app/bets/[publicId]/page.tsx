import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";
import {
  panelMemberName,
  verdictPresentation,
  verdictVoteLabel,
  voteSplit,
  type PositionGroup,
} from "@/lib/presentation/judgment";

type Contribution = {
  panelMember?: string;
  model?: string;
  contribution?: {
    unresolvedQuestions?: string[];
    searchQueries?: string[];
    sources?: Array<{
      url?: string;
      title?: string;
      retrievedAt?: string;
      relevantExcerpt?: string;
    }>;
    positions?: Array<{
      participantLabel?: string;
      strongestCase?: string;
      contraryEvidence?: string;
      weaknesses?: string[];
    }>;
  };
};
type Vote = {
  panelMember?: string;
  voteKey?: string;
  opinion?: {
    interpretation?: string;
    decisiveConsiderations?: string[];
    strongestEvidence?: string[];
    strongestCounterargument?: string;
    uncertainty?: string;
    citedUrls?: string[];
  };
};
type PublicData = {
  researchRecord?: {
    contributions?: Contribution[];
    sourceIndex?: Array<{
      url?: string;
      title?: string;
      retrievedAt?: string;
      contributedBy?: string;
    }>;
  };
  votes?: Vote[];
  positionMap?: PositionGroup[];
};

function asPublicData(value: unknown): PublicData {
  return typeof value === "object" && value ? (value as PublicData) : {};
}

function uniqueItems(items: Array<string | undefined>, limit: number): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item?.trim())))].slice(
    0,
    limit,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  try {
    const bet = await getBetModule().getPublic(publicId);
    const hidden = bet.visibility === "HIDDEN";
    return {
      title: hidden ? "Judgment unavailable" : bet.title,
      description: hidden ? "This Judgment has been taken down." : bet.question,
      robots: hidden ? { index: false, follow: false } : { index: true, follow: true },
    };
  } catch {
    return { title: "Judgment not found", robots: { index: false, follow: false } };
  }
}

export default async function JudgmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let bet;
  try {
    bet = await getBetModule().getPublic(publicId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
  if (bet.visibility === "HIDDEN")
    return (
      <main className="narrow form-page">
        <div className="notice error">
          <h2>Judgment unavailable</h2>
          <p>
            This published Judgment was taken down after a report. Its Verdict was not rewritten.
          </p>
        </div>
      </main>
    );
  if (!bet.judgment) notFound();

  const data = asPublicData(bet.judgment.publicData);
  const contributions = data.researchRecord?.contributions ?? [];
  const sources = data.researchRecord?.sourceIndex ?? [];
  const votes = data.votes ?? [];
  const positionMap = data.positionMap ?? [];
  const participants = bet.slots.map((slot) => ({
    label: slot.label,
    name: slot.name,
    position: slot.position,
  }));
  const verdict = verdictPresentation(bet.judgment.verdictKey, positionMap, participants);
  const panelSplit = voteSplit(
    bet.judgment.verdictKey,
    votes.map((vote) => vote.voteKey),
  );
  const prevailingVotes = votes.filter((vote) => vote.voteKey === bet.judgment?.verdictKey);
  const decisiveReasons = uniqueItems(
    (prevailingVotes.length ? prevailingVotes : votes).flatMap(
      (vote) => vote.opinion?.decisiveConsiderations ?? [],
    ),
    4,
  );
  const pot = bet.stakeUsd * bet.participantCount;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";

  return (
    <main className="judgment-page">
      <header className="judgment-hero">
        <div className="shell judgment-hero-grid">
          <div className="judgment-reveal stack">
            <p className="result-kicker">The panel has ruled</p>
            <p className="result-eyebrow">{verdict.eyebrow}</p>
            <h1>{verdict.headline}</h1>
            <p className="result-detail">{verdict.detail}</p>
            <p className="judgment-synthesis">{bet.judgment.synthesis}</p>
          </div>

          <aside className="verdict-board" aria-label="Judge Panel result">
            <p className="verdict-board-label">Final vote</p>
            <strong className="verdict-score">{panelSplit}</strong>
            <ol className="judge-tally">
              {votes.map((vote, index) => (
                <li key={`${vote.panelMember}-${index}`}>
                  <span>{panelMemberName(vote.panelMember)}</span>
                  <strong>{verdictVoteLabel(vote.voteKey, positionMap, participants)}</strong>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <div className="shell case-heading">
          <p className="case-label">The Bet</p>
          <h2>{bet.title}</h2>
          <p className="case-question">{bet.question}</p>
          <div className="case-meta">
            <span>{bet.slots.map((slot) => slot.name).join(" vs. ")}</span>
            {bet.publishedAt ? (
              <time dateTime={bet.publishedAt.toISOString()}>
                Decided {bet.publishedAt.toLocaleDateString()}
              </time>
            ) : null}
            <span>${bet.stakeUsd.toLocaleString()} each</span>
            <span>${pot.toLocaleString()} hypothetical pot</span>
          </div>
          <p className="money-disclaimer">No money was collected or paid.</p>
        </div>
      </header>

      <nav className="judgment-nav" aria-label="Judgment sections">
        <div className="shell">
          <a href="#ruling">The ruling</a>
          <a href="#positions">The Positions</a>
          <a href="#panel">The panel</a>
          <a href="#evidence">Evidence</a>
          <a href="#transparency">Transparency</a>
        </div>
      </nav>

      <section className="shell judgment-section ruling-grid" id="ruling">
        <div>
          <p className="section-number">01 / The ruling</p>
          <h2>{decisiveReasons.length ? "What decided it" : "The panel's conclusion"}</h2>
          {decisiveReasons.length ? (
            <ol className="decisive-list">
              {decisiveReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ol>
          ) : (
            <p className="prose">{bet.judgment.synthesis}</p>
          )}
        </div>
        <aside className="decision-frame">
          <p className="decision-frame-label">The rules of the argument</p>
          <h3>Decision Frame</h3>
          <p>{bet.decisionContext}</p>
        </aside>
      </section>

      <section className="shell judgment-section" id="positions">
        <div className="story-heading">
          <p className="section-number">02 / The Positions</p>
          <h2>The argument, in their own words</h2>
          <p>Each Participant committed one sealed Position before the panel began its work.</p>
        </div>
        <div className="position-stage">
          {bet.slots.map((slot) => {
            const prevailed = verdict.winningLabels.includes(slot.label);
            return (
              <article
                className={`position-story${prevailed ? " position-winner" : ""}`}
                key={slot.label}
              >
                <div className="position-person">
                  <span className="participant-mark">{slot.label}</span>
                  <div>
                    <p>{prevailed ? "Prevailing Position" : "Submitted Position"}</p>
                    <h3>{slot.name}</h3>
                  </div>
                </div>
                <blockquote>{slot.position}</blockquote>
                <p className="submission-copy">{slot.submission}</p>
                {slot.sourceUrls.length ? (
                  <div className="participant-sources">
                    <strong>Sources submitted by {slot.name}</strong>
                    <ul>
                      {slot.sourceUrls.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer nofollow">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel-section" id="panel">
        <div className="shell judgment-section">
          <div className="story-heading story-heading-light">
            <p className="section-number">03 / The panel</p>
            <h2>Three Judges. One shared record.</h2>
            <p>
              They researched independently, then voted blind without browsing or seeing one
              another's opinions.
            </p>
          </div>
          <div className="opinion-list">
            {votes.map((vote, index) => (
              <article className="opinion" key={`${vote.panelMember}-${index}`}>
                <div className="opinion-header">
                  <div>
                    <p>Judge {String(index + 1).padStart(2, "0")}</p>
                    <h3>{panelMemberName(vote.panelMember)}</h3>
                  </div>
                  <div className="opinion-vote">
                    <span>Voted for</span>
                    <strong>{verdictVoteLabel(vote.voteKey, positionMap, participants)}</strong>
                  </div>
                </div>
                <p className="opinion-interpretation">{vote.opinion?.interpretation}</p>
                {vote.opinion?.decisiveConsiderations?.length ? (
                  <details className="opinion-disclosure">
                    <summary>
                      <span>Read {panelMemberName(vote.panelMember)}'s full opinion</span>
                      <span aria-hidden="true">+</span>
                    </summary>
                    <div className="opinion-columns">
                      <div>
                        <h4>Decisive considerations</h4>
                        <ul>
                          {vote.opinion.decisiveConsiderations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Strongest counterargument</h4>
                        <p>{vote.opinion.strongestCounterargument}</p>
                        <h4>Remaining uncertainty</h4>
                        <p>{vote.opinion.uncertainty}</p>
                      </div>
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell judgment-section" id="evidence">
        <div className="story-heading">
          <p className="section-number">04 / The evidence</p>
          <h2>Follow the source trail</h2>
          <p>
            The three attributed Research Contributions were combined mechanically. No fourth model
            rewrote the evidence.
          </p>
        </div>

        {sources.length ? (
          <ol className="evidence-index">
            {sources.map((source, index) => (
              <li key={`${source.url}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <a href={source.url} target="_blank" rel="noreferrer nofollow">
                    {source.title || source.url}
                  </a>
                  <small>
                    Added by {panelMemberName(source.contributedBy)}
                    {source.retrievedAt ? ` · retrieved ${source.retrievedAt}` : ""}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">No external sources were recorded.</p>
        )}

        <details className="record-disclosure">
          <summary>
            <span>
              <strong>Open the full Research Record</strong>
              <small>{contributions.length} attributed contributions</small>
            </span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="research-contributions">
            {contributions.map((item, index) => (
              <article className="research-contribution" key={`${item.panelMember}-${index}`}>
                <div className="record-heading">
                  <div>
                    <p>Researcher {String(index + 1).padStart(2, "0")}</p>
                    <h3>{panelMemberName(item.panelMember)}</h3>
                  </div>
                  <code>{item.model}</code>
                </div>
                {item.contribution?.searchQueries?.length ? (
                  <div className="record-block">
                    <h4>Search queries</h4>
                    <ul>
                      {item.contribution.searchQueries.map((query) => (
                        <li key={query}>{query}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {item.contribution?.positions?.map((position) => (
                  <div className="record-block" key={position.participantLabel}>
                    <h4>Participant {position.participantLabel}</h4>
                    <p>
                      <strong>Strongest case:</strong> {position.strongestCase || "None recorded"}
                    </p>
                    <p>
                      <strong>Contrary evidence:</strong>{" "}
                      {position.contraryEvidence || "None recorded"}
                    </p>
                    <p>
                      <strong>Weaknesses:</strong>{" "}
                      {position.weaknesses?.join(" ") || "None recorded"}
                    </p>
                  </div>
                ))}
                {item.contribution?.unresolvedQuestions?.length ? (
                  <div className="record-block">
                    <h4>Unresolved questions</h4>
                    <ul>
                      {item.contribution.unresolvedQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="transparency-section" id="transparency">
        <div className="narrow judgment-section">
          <p className="section-number">05 / Transparency</p>
          <h2>Trust, with receipts.</h2>
          <p className="transparency-intro">
            Participant names were replaced with A/B/C/D in every model-visible input. The record
            preserves model identities, prompts, retrieval settings, retries, failures, response
            IDs, token usage, and estimated cost—never hidden chain of thought.
          </p>
          <details className="record-disclosure transparency-disclosure">
            <summary>
              <span>
                <strong>Inspect the complete Transparency Record</strong>
                <small>Exact machine-readable provenance</small>
              </span>
              <span aria-hidden="true">+</span>
            </summary>
            <pre className="audit">{JSON.stringify(bet.judgment.transparencyData, null, 2)}</pre>
          </details>
          <a
            className="report-link"
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Report Judgment ${bet.publicId}`)}`}
          >
            Report this Judgment
          </a>
        </div>
      </section>
    </main>
  );
}
