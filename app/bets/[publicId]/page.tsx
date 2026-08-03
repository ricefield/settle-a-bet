import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";

type Contribution = {
  panelMember?: string;
  model?: string;
  contribution?: {
    unresolvedQuestions?: string[];
    searchQueries?: string[];
    sources?: Array<{ url?: string; title?: string; retrievedAt?: string }>;
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
  positionMap?: Array<{ id?: string; members?: string[] }>;
};

function asPublicData(value: unknown): PublicData {
  return typeof value === "object" && value ? (value as PublicData) : {};
}

function readableVote(key: string | undefined) {
  if (!key) return "No valid vote";
  if (key.startsWith("POSITION:")) return `Position ${key.slice("POSITION:".length)}`;
  return key.toLowerCase().replaceAll("_", " ");
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
  const pot = bet.stakeUsd * bet.participantCount;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
  return (
    <main>
      <header className="judgment-header">
        <div className="narrow stack">
          <p className="eyebrow">Published Judgment</p>
          <p className="verdict">{readableVote(bet.judgment.verdictKey)}</p>
          <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>{bet.title}</h1>
          <p className="lede">{bet.question}</p>
          <div className="meta">
            <span>{bet.slots.map((slot) => slot.name).join(" · ")}</span>
            {bet.publishedAt ? (
              <time dateTime={bet.publishedAt.toISOString()}>
                {bet.publishedAt.toLocaleDateString()}
              </time>
            ) : null}
          </div>
          <div className="notice">
            ${bet.stakeUsd.toLocaleString()} per person · ${pot.toLocaleString()} hypothetical pot.
            No money was collected or paid.
          </div>
        </div>
      </header>
      <section className="narrow section stack">
        <p className="eyebrow">Decision Frame</p>
        <p className="prose">{bet.decisionContext}</p>
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">Sealed submissions</p>
            <h2>The Positions</h2>
          </div>
        </div>
        <div className="grid">
          {bet.slots.map((slot) => (
            <article className="card position-card stack" key={slot.label}>
              <div>
                <span className="pill">{slot.label}</span>
                <h3 style={{ marginTop: 12 }}>{slot.name}</h3>
              </div>
              <strong>{slot.position}</strong>
              <p className="prose">{slot.submission}</p>
              {slot.sourceUrls.length ? (
                <ul className="source-list">
                  {slot.sourceUrls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer nofollow">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">Shared evidence</p>
            <h2>Research Record</h2>
          </div>
        </div>
        <div className="grid">
          {contributions.map((item, index) => (
            <article className="card stack" key={`${item.panelMember}-${index}`}>
              <div>
                <span className="pill">{item.panelMember?.replaceAll("_", " ")}</span>
                <h3 style={{ marginTop: 12 }}>{item.model}</h3>
              </div>
              {item.contribution?.positions?.map((position) => (
                <div className="stack" key={position.participantLabel}>
                  <strong>Participant {position.participantLabel}</strong>
                  <p className="prose">
                    <b>Strongest case:</b> {position.strongestCase || "None recorded"}
                  </p>
                  <p className="prose">
                    <b>Contrary evidence:</b> {position.contraryEvidence || "None recorded"}
                  </p>
                  <p className="prose">
                    <b>Weaknesses:</b> {position.weaknesses?.join(" ") || "None recorded"}
                  </p>
                </div>
              ))}
              {item.contribution?.unresolvedQuestions?.length ? (
                <div>
                  <strong>Unresolved questions</strong>
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
        {sources.length ? (
          <div className="card stack" style={{ marginTop: 18 }}>
            <h3>Deduplicated source index</h3>
            <ol className="source-list">
              {sources.map((source, index) => (
                <li key={`${source.url}-${index}`}>
                  <a href={source.url} target="_blank" rel="noreferrer nofollow">
                    {source.title || source.url}
                  </a>{" "}
                  <small>
                    via {source.contributedBy}
                    {source.retrievedAt ? ` · retrieved ${source.retrievedAt}` : ""}
                  </small>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">Independent votes</p>
            <h2>Judicial Opinions</h2>
          </div>
        </div>
        <div className="grid">
          {votes.map((vote, index) => (
            <article className="card stack" key={`${vote.panelMember}-${index}`}>
              <span className="pill">{vote.panelMember?.replaceAll("_", " ")}</span>
              <h3>{readableVote(vote.voteKey)}</h3>
              <p className="prose">{vote.opinion?.interpretation}</p>
              {vote.opinion?.decisiveConsiderations?.length ? (
                <div>
                  <strong>Decisive considerations</strong>
                  <ul>
                    {vote.opinion.decisiveConsiderations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="prose">
                <b>Strongest counterargument:</b> {vote.opinion?.strongestCounterargument}
              </p>
              <p className="prose">
                <b>Uncertainty:</b> {vote.opinion?.uncertainty}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="narrow section stack">
        <p className="eyebrow">Judgment</p>
        <h2>Panel result</h2>
        <p className="lede">{bet.judgment.synthesis}</p>
      </section>
      <section className="narrow section stack">
        <p className="eyebrow">Transparency Record</p>
        <p>
          Model-visible inputs used Participant A/B/C/D labels and never participant names. This
          record includes requested and returned model identities, prompts, retrieval configuration,
          retries, failures, response IDs, token use, and estimated cost. It does not expose hidden
          chain of thought.
        </p>
        <pre className="audit">{JSON.stringify(bet.judgment.transparencyData, null, 2)}</pre>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Report Judgment ${bet.publicId}`)}`}
        >
          Report this Judgment
        </a>
      </section>
    </main>
  );
}
