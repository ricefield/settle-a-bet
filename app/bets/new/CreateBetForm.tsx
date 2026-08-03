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
  return "We could not create this Bet. Please check the form and try again.";
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
      <div className="card stack">
        <div className="notice success">
          <strong>Bet created.</strong> Save the organizer link now; it cannot be recovered later.
        </div>
        <div className="links">
          <h3>Organizer link</h3>
          <LinkBox url={result.organizerUrl} />
          <h3>Invitation {result.invitationUrls.length === 1 ? "link" : "links"}</h3>
          {result.invitationUrls.map((url) => (
            <LinkBox key={url} url={url} />
          ))}
        </div>
        <p className="hero-note">
          Send each invitation to one participant. Anyone with a link can use it once, so treat
          these as bearer credentials.
        </p>
        <div className="row">
          <Link className="button" href={result.organizerUrl}>
            Open organizer page
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
      <div className="card preview">
        <div className="notice">
          This is the final preview. Your creator submission is immutable after you create the Bet.
        </div>
        <dl>
          <dt>Title</dt>
          <dd>{draft.title}</dd>
          <dt>Question</dt>
          <dd>{draft.question}</dd>
          <dt>Decision Frame</dt>
          <dd>{draft.decisionContext}</dd>
          <dt>Participants</dt>
          <dd>{draft.participantCount}</dd>
          <dt>Nominal stake</dt>
          <dd>
            ${draft.stakeUsd.toLocaleString()} each · ${pot.toLocaleString()} hypothetical pot
            <br />
            No money was collected or paid.
          </dd>
          <dt>Name</dt>
          <dd>{draft.creator.name}</dd>
          <dt>Position</dt>
          <dd>{draft.creator.position}</dd>
          <dt>Submission</dt>
          <dd>{draft.creator.submission}</dd>
          <dt>Sources</dt>
          <dd>{parseSourceUrls(draft.creator.sourceUrlsText).join("\n") || "None"}</dd>
        </dl>
        {error ? <div className="notice error">{error}</div> : null}
        <div className="row">
          <button className="button" type="button" onClick={createBet} disabled={submitting}>
            {submitting ? "Creating…" : "Confirm and create"}
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
    );
  }

  return (
    <form className="card form-grid" onSubmit={submit}>
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
        <label htmlFor="question">Exact question or premise</label>
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
        <label htmlFor="context">Context, criteria, assumptions, and exclusions</label>
        <textarea
          id="context"
          className="input"
          required
          style={{ minHeight: 180 }}
          value={draft.decisionContext}
          onChange={(e) => update("decisionContext", e.target.value)}
        />
        <small>
          Up to 2,000 words. Define what evidence should count and what is out of scope.
        </small>
      </div>
      <div className="field">
        <label htmlFor="participants">Total participants</label>
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
        <label htmlFor="stake">Per-person nominal stake (USD)</label>
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
          ${(draft.stakeUsd * draft.participantCount).toLocaleString()} hypothetical pot. No money
          is processed.
        </small>
      </div>
      <div className="field-full">
        <hr />
      </div>
      <div className="field-full stack" style={{ gap: 7 }}>
        <p className="eyebrow">Participant A</p>
        <h3>Your sealed submission</h3>
      </div>
      <SubmissionFields
        value={draft.creator}
        onChange={(creator) => update("creator", creator)}
        nameLabel="Creator name"
      />
      <div className="field-full">
        <button className="button" type="submit">
          Review Bet
        </button>
      </div>
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
