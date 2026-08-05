import type { Metadata } from "next";
import Link from "next/link";
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
      title: hidden ? "Result unavailable" : bet.title,
      description: hidden ? "This result has been taken down." : bet.question,
      robots: hidden ? { index: false, follow: false } : { index: true, follow: true },
    };
  } catch {
    return { title: "Result not found", robots: { index: false, follow: false } };
  }
}

export default async function ResultPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let bet;
  try {
    bet = await getBetModule().getPublic(publicId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }

  if (bet.visibility === "HIDDEN") {
    return (
      <main className="narrow form-page">
        <div className="notice error">
          <h2>This result is unavailable</h2>
          <p>It was taken down after a report. The panel’s original result was not changed.</p>
        </div>
      </main>
    );
  }
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
  const result = verdictPresentation(bet.judgment.verdictKey, positionMap, participants);
  const split = voteSplit(
    bet.judgment.verdictKey,
    votes.map((vote) => vote.voteKey),
  );
  const winningVotes = votes.filter((vote) => vote.voteKey === bet.judgment?.verdictKey);
  const keyReasons = uniqueItems(
    (winningVotes.length ? winningVotes : votes).flatMap(
      (vote) => vote.opinion?.decisiveConsiderations ?? [],
    ),
    4,
  );
  const pot = bet.stakeUsd * bet.participantCount;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";

  return (
    <main className="result-page">
      <div className="shell result-breadcrumb">
        <Link href="/">Results</Link>
        <span>›</span>
        <span>Settled bet</span>
      </div>

      <header className="shell result-layout">
        <div className="result-main">
          <div className="result-title-row">
            <div className="result-icon" aria-hidden="true">
              ✓
            </div>
            <div>
              <span className="status-chip status-chip-done">Settled</span>
              <h1>{bet.title}</h1>
            </div>
          </div>
          <p className="result-question">{bet.question}</p>
          <div className="result-meta">
            <span>{bet.slots.map((slot) => slot.name).join(" vs. ")}</span>
            {bet.publishedAt ? (
              <time dateTime={bet.publishedAt.toISOString()}>
                Settled {bet.publishedAt.toLocaleDateString()}
              </time>
            ) : null}
            <span>${bet.stakeUsd.toLocaleString()} each</span>
          </div>

          <section className="result-callout" aria-labelledby="final-result-heading">
            <div className="result-callout-label">
              <span>Final result</span>
              <strong>{split}</strong>
            </div>
            <h2 id="final-result-heading">{result.headline}</h2>
            <p className="winner-name">{result.eyebrow}</p>
            <p className="result-summary">{result.detail}</p>
            <details className="result-summary-more simple-disclosure">
              <summary>
                <span>Read the full result summary</span>
                <span aria-hidden="true">+</span>
              </summary>
              <p>{bet.judgment.synthesis}</p>
            </details>
          </section>
        </div>

        <aside className="panel-card" aria-label="AI panel votes">
          <div className="panel-card-heading">
            <div>
              <span>AI panel</span>
              <h2>{split.split(" · ")[1] ?? split}</h2>
            </div>
            <span className="status-chip status-chip-done">Final</span>
          </div>
          <ul className="vote-list">
            {votes.map((vote, index) => (
              <li key={`${vote.panelMember}-${index}`}>
                <span className="model-avatar">{panelMemberName(vote.panelMember).charAt(0)}</span>
                <div>
                  <strong>{panelMemberName(vote.panelMember)}</strong>
                  <small>Picked</small>
                </div>
                <b>{verdictVoteLabel(vote.voteKey, positionMap, participants)}</b>
              </li>
            ))}
          </ul>
          <div className="pot-summary">
            <div>
              <span>Pretend pot</span>
              <strong>${pot.toLocaleString()}</strong>
            </div>
            <p>No money was collected or paid.</p>
          </div>
        </aside>
      </header>

      <nav className="result-tabs" aria-label="Result sections">
        <div className="shell">
          <a href="#breakdown">Why it won</a>
          <a href="#takes">Everyone’s take</a>
          <a href="#panel">Panel votes</a>
          <a href="#sources">Sources</a>
          <a href="#details">Behind the scenes</a>
        </div>
      </nav>

      <section className="shell result-section breakdown-layout" id="breakdown">
        <div>
          <div className="section-heading-copy">
            <h2>Why this won</h2>
            <p>The points that mattered most to the majority.</p>
          </div>
          {keyReasons.length ? (
            <ol className="reason-list">
              {keyReasons.map((reason, index) => (
                <li key={reason}>
                  <span>{index + 1}</span>
                  <p>{reason}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="prose">{bet.judgment.synthesis}</p>
          )}
        </div>
        <aside className="rules-card">
          <span>Ground rules</span>
          <h3>What the panel was asked to consider</h3>
          <p>{bet.decisionContext}</p>
        </aside>
      </section>

      <section className="result-section result-section-muted" id="takes">
        <div className="shell">
          <div className="section-heading-copy">
            <h2>What everyone said</h2>
            <p>Each take stayed private until the result was posted.</p>
          </div>
          <div className="take-list">
            {bet.slots.map((slot) => {
              const won = result.winningLabels.includes(slot.label);
              return (
                <article className={`take-card${won ? " take-card-winner" : ""}`} key={slot.label}>
                  <div className="take-card-heading">
                    <span className="participant-mark">{slot.label}</span>
                    <div>
                      <h3>{slot.name}</h3>
                      <span>{won ? "Panel pick" : "Their answer"}</span>
                    </div>
                    {won ? <span className="status-chip status-chip-done">Winner</span> : null}
                  </div>
                  <blockquote>{slot.position}</blockquote>
                  <details className="simple-disclosure">
                    <summary>
                      <span>Read {slot.name}’s full case</span>
                      <span aria-hidden="true">+</span>
                    </summary>
                    <div className="take-details">
                      <p>{slot.submission}</p>
                      {slot.sourceUrls.length ? (
                        <div>
                          <strong>Links they shared</strong>
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
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="shell result-section" id="panel">
        <div className="section-heading-copy">
          <h2>How the panel voted</h2>
          <p>Each model used the same set of sources and voted without seeing the others.</p>
        </div>
        <div className="panel-takes">
          {votes.map((vote, index) => (
            <article className="panel-take" key={`${vote.panelMember}-${index}`}>
              <div className="panel-take-heading">
                <span className="model-avatar">{panelMemberName(vote.panelMember).charAt(0)}</span>
                <div>
                  <h3>{panelMemberName(vote.panelMember)}</h3>
                  <p>
                    Picked <b>{verdictVoteLabel(vote.voteKey, positionMap, participants)}</b>
                  </p>
                </div>
              </div>
              <p className="panel-summary">{vote.opinion?.interpretation}</p>
              {vote.opinion?.decisiveConsiderations?.length ? (
                <details className="simple-disclosure">
                  <summary>
                    <span>Read the full take</span>
                    <span aria-hidden="true">+</span>
                  </summary>
                  <div className="panel-detail-grid">
                    <div>
                      <h4>What mattered</h4>
                      <ul>
                        {vote.opinion.decisiveConsiderations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Best counterpoint</h4>
                      <p>{vote.opinion.strongestCounterargument}</p>
                      <h4>What’s still uncertain</h4>
                      <p>{vote.opinion.uncertainty}</p>
                    </div>
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="result-section result-section-muted" id="sources">
        <div className="shell">
          <div className="section-heading-copy">
            <h2>Sources</h2>
            <p>
              All three panelists researched independently, then shared this combined source list.
            </p>
          </div>
          {sources.length ? (
            <ol className="source-index">
              {sources.map((source, index) => (
                <li key={`${source.url}-${index}`}>
                  <span>{index + 1}</span>
                  <div>
                    <a href={source.url} target="_blank" rel="noreferrer nofollow">
                      {source.title || source.url}
                    </a>
                    <small>
                      Added by {panelMemberName(source.contributedBy)}
                      {source.retrievedAt ? ` · checked ${source.retrievedAt}` : ""}
                    </small>
                  </div>
                  <span aria-hidden="true">↗</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <p>No outside sources were recorded.</p>
            </div>
          )}

          <details className="record-disclosure">
            <summary>
              <span>
                <strong>See all research notes</strong>
                <small>{contributions.length} separate research passes</small>
              </span>
              <span aria-hidden="true">+</span>
            </summary>
            <div className="research-list">
              {contributions.map((item, index) => (
                <article className="research-note" key={`${item.panelMember}-${index}`}>
                  <div className="research-note-heading">
                    <div>
                      <span>Research pass {index + 1}</span>
                      <h3>{panelMemberName(item.panelMember)}</h3>
                    </div>
                    <code>{item.model}</code>
                  </div>
                  {item.contribution?.searchQueries?.length ? (
                    <div className="research-block">
                      <h4>What it searched</h4>
                      <ul>
                        {item.contribution.searchQueries.map((query) => (
                          <li key={query}>{query}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {item.contribution?.positions?.map((position) => (
                    <div className="research-block" key={position.participantLabel}>
                      <h4>Take {position.participantLabel}</h4>
                      <p>
                        <b>Best case:</b> {position.strongestCase || "None recorded"}
                      </p>
                      <p>
                        <b>Evidence against it:</b> {position.contraryEvidence || "None recorded"}
                      </p>
                      <p>
                        <b>Weak spots:</b> {position.weaknesses?.join(" ") || "None recorded"}
                      </p>
                    </div>
                  ))}
                  {item.contribution?.unresolvedQuestions?.length ? (
                    <div className="research-block">
                      <h4>Open questions</h4>
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
        </div>
      </section>

      <section className="shell result-section technical-section" id="details">
        <div className="section-heading-copy">
          <h2>Behind the scenes</h2>
          <p>For anyone who wants to check exactly how this result was made.</p>
        </div>
        <div className="privacy-note">
          <span aria-hidden="true">✓</span>
          <p>
            <strong>Names stayed out of the model prompts.</strong> The panel only saw labels A, B,
            C, and D. We publish model IDs, prompts, searches, retries, token use, and estimated
            cost—but never hidden chain of thought.
          </p>
        </div>
        <details className="record-disclosure">
          <summary>
            <span>
              <strong>Open the technical record</strong>
              <small>Exact machine-readable details</small>
            </span>
            <span aria-hidden="true">+</span>
          </summary>
          <pre className="audit">{JSON.stringify(bet.judgment.transparencyData, null, 2)}</pre>
        </details>
        <a
          className="report-link"
          href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Report result ${bet.publicId}`)}`}
        >
          Report this result
        </a>
      </section>
    </main>
  );
}
