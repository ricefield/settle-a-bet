"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import {
  emptySubmission,
  parseSourceUrls,
  SubmissionFields,
  type SubmissionDraft,
} from "@/components/bets/SubmissionFields";

export function ParticipantForm({ token, label }: { token: string; label: string }) {
  const [draft, setDraft] = useState<SubmissionDraft>(emptySubmission);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{
    publicId: string;
    status: string;
    submittedCount: number;
    participantCount: number;
  }>();

  function preview(event: FormEvent) {
    event.preventDefault();
    setPreviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirm() {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, sourceUrls: parseSourceUrls(draft.sourceUrlsText) }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        publicId?: string;
        status?: string;
        submittedCount?: number;
        participantCount?: number;
      };
      if (!response.ok) throw new Error(body.error?.message ?? "We couldn’t save your take");
      setResult(body as Required<Omit<typeof body, "error">>);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const allSubmitted = result.submittedCount === result.participantCount;
    return (
      <div className="success-panel">
        <div className="notice success">
          <strong>Your take is locked in.</strong> It can’t be edited or sent again.
        </div>
        <p>
          {allSubmitted
            ? "Everyone is in. The AI panel is getting to work."
            : `${result.submittedCount} of ${result.participantCount} people are in.`}
        </p>
        {result.status === "PUBLISHED" ? (
          <Link href={`/bets/${result.publicId}`} className="button">
            See the result
          </Link>
        ) : (
          <Link href="/" className="button button-secondary">
            Return home
          </Link>
        )}
      </div>
    );
  }

  if (previewing) {
    return (
      <div className="review-panel preview">
        <div className="notice">
          Last look: once you lock this in, it can’t be changed and will be public with your name
          when the result is ready.
        </div>
        <dl>
          <dt>Spot</dt>
          <dd>{label}</dd>
          <dt>Name</dt>
          <dd>{draft.name}</dd>
          <dt>Your answer</dt>
          <dd>{draft.position}</dd>
          <dt>Your case</dt>
          <dd>{draft.submission}</dd>
          <dt>Sources</dt>
          <dd>{parseSourceUrls(draft.sourceUrlsText).join("\n") || "None"}</dd>
        </dl>
        {error ? <div className="notice error">{error}</div> : null}
        <div className="row">
          <button className="button" onClick={confirm} disabled={submitting}>
            {submitting ? "Locking it in…" : "Lock it in"}
          </button>
          <button
            className="button button-secondary"
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
    <form className="participant-form form-grid" onSubmit={preview}>
      <div className="field-full form-section-heading compact-heading">
        <span>{label}</span>
        <div>
          <h2>Add your take</h2>
          <p>Your answer stays private until the final result is posted.</p>
        </div>
      </div>
      <SubmissionFields value={draft} onChange={setDraft} />
      <div className="field-full">
        <button className="button" type="submit">
          Review my take
        </button>
      </div>
    </form>
  );
}
