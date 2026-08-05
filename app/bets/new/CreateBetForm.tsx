"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import {
  emptySubmission,
  parseSourceUrls,
  SubmissionFields,
  type SubmissionDraft,
} from "@/components/bets/SubmissionFields";
import type { CreateBetResponse } from "@/lib/types";

type BetDraft = {
  title: string;
  question: string;
  decisionContext: string;
  participantCount: number;
  stakeUsd: number;
  creator: SubmissionDraft;
};

const initialDraft: BetDraft = {
  title: "",
  question: "",
  decisionContext: "",
  participantCount: 2,
  stakeUsd: 25,
  creator: emptySubmission,
};

function errorMessage(body: unknown): string {
  if (typeof body === "object" && body && "error" in body) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string") return error.message;
  }
  return "We couldn’t create this bet. Check the details and try again.";
}

export function CreateBetForm() {
  const [draft, setDraft] = useState(initialDraft);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<CreateBetResponse>();

  const update = <Key extends keyof BetDraft>(key: Key, value: BetDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function createBet() {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/bets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          creator: { ...draft.creator, sourceUrls: parseSourceUrls(draft.creator.sourceUrlsText) },
        }),
      });
      const body = (await response.json()) as unknown;
      if (!response.ok) throw new Error(errorMessage(body));
      setResult(body as CreateBetResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setPreviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return (
      <div className="success-panel">
        <div className="notice success">
          <strong>Your bet is live.</strong> Save your dashboard link now—we can’t recover it later.
        </div>
        <div className="links">
          <div className="section-title">
            <span>For you</span>
            <h3>Your bet dashboard</h3>
          </div>
          <LinkBox url={result.organizerUrl} />
          <div className="section-title">
            <span>For friends</span>
            <h3>Invite {result.invitationUrls.length === 1 ? "link" : "links"}</h3>
          </div>
          {result.invitationUrls.map((url) => (
            <LinkBox key={url} url={url} />
          ))}
        </div>
        <p className="helper-panel">
          Send one link to each friend. Every link works once, so don’t post them publicly.
        </p>
        <div className="row">
          <Link className="button" href={result.organizerUrl}>
            Open my dashboard
          </Link>
          <Link className="button button-secondary" href="/">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (previewing) {
    const pot = draft.participantCount * draft.stakeUsd;
    return (
      <div className="review-layout">
        <div className="review-panel preview">
          <div className="notice">
            Last look: once you create the bet, your answer can’t be changed.
          </div>
          <dl>
            <dt>Title</dt>
            <dd>{draft.title}</dd>
            <dt>Question</dt>
            <dd>{draft.question}</dd>
            <dt>Ground rules</dt>
            <dd>{draft.decisionContext}</dd>
            <dt>People</dt>
            <dd>{draft.participantCount}</dd>
            <dt>Pretend stake</dt>
            <dd>
              ${draft.stakeUsd.toLocaleString()} each · ${pot.toLocaleString()} pretend pot
              <br />
              No money was collected or paid.
            </dd>
            <dt>Name</dt>
            <dd>{draft.creator.name}</dd>
            <dt>Your answer</dt>
            <dd>{draft.creator.position}</dd>
            <dt>Your case</dt>
            <dd>{draft.creator.submission}</dd>
            <dt>Sources</dt>
            <dd>{parseSourceUrls(draft.creator.sourceUrlsText).join("\n") || "None"}</dd>
          </dl>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="row">
            <button className="button" type="button" onClick={createBet} disabled={submitting}>
              {submitting ? "Creating…" : "Create bet"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setPreviewing(false)}
              disabled={submitting}
            >
              Edit
            </button>
          </div>
        </div>
        <aside className="form-ticket">
          <span className="ticket-label">Ready to go</span>
          <strong>{draft.participantCount} people</strong>
          <strong>${pot.toLocaleString()} pretend pot</strong>
          <p>No money will be collected or paid.</p>
        </aside>
      </div>
    );
  }

  return (
    <form className="create-layout" onSubmit={submit}>
      <div className="form-main">
        <section className="form-section">
          <div className="form-section-heading">
            <span>1</span>
            <div>
              <h2>Bet details</h2>
              <p>What are you trying to settle?</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field field-full">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                className="input"
                required
                maxLength={120}
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <div className="field field-full">
              <label htmlFor="question">The question</label>
              <textarea
                id="question"
                className="input"
                required
                maxLength={500}
                value={draft.question}
                onChange={(e) => update("question", e.target.value)}
              />
            </div>
            <div className="field field-full">
              <label htmlFor="context">Ground rules</label>
              <textarea
                id="context"
                className="input"
                required
                style={{ minHeight: 180 }}
                value={draft.decisionContext}
                onChange={(e) => update("decisionContext", e.target.value)}
              />
              <small>
                Add any context, judging criteria, assumptions, or things that should be ignored.
              </small>
            </div>
            <div className="field">
              <label htmlFor="participants">How many people?</label>
              <select
                id="participants"
                className="input"
                value={draft.participantCount}
                onChange={(e) => update("participantCount", Number(e.target.value))}
              >
                {[2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} people
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="stake">Pretend stake per person</label>
              <input
                id="stake"
                className="input"
                type="number"
                required
                min={1}
                max={10000}
                step={1}
                value={draft.stakeUsd}
                onChange={(e) => update("stakeUsd", Number(e.target.value))}
              />
              <small>
                ${(draft.stakeUsd * draft.participantCount).toLocaleString()} pretend pot. No money
                moves.
              </small>
            </div>
          </div>
        </section>
        <section className="form-section">
          <div className="form-section-heading">
            <span>2</span>
            <div>
              <h2>Your take</h2>
              <p>You go first. Friends won’t see this until the result is posted.</p>
            </div>
          </div>
          <div className="form-grid">
            <SubmissionFields
              value={draft.creator}
              onChange={(creator) => update("creator", creator)}
              nameLabel="Your name"
            />
          </div>
        </section>
      </div>
      <aside className="form-ticket">
        <span className="ticket-label">Bet summary</span>
        <dl>
          <div>
            <dt>People</dt>
            <dd>{draft.participantCount}</dd>
          </div>
          <div>
            <dt>Stake each</dt>
            <dd>${draft.stakeUsd.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Pretend pot</dt>
            <dd>${(draft.stakeUsd * draft.participantCount).toLocaleString()}</dd>
          </div>
        </dl>
        <p>No money will be collected or paid.</p>
        <button className="button" type="submit">
          Review bet
        </button>
      </aside>
    </form>
  );
}

function LinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="link-box">
      <code>{url}</code>
      <button
        type="button"
        className="button button-small button-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
