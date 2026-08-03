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
      if (!response.ok) throw new Error(body.error?.message ?? "Submission failed");
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
      <div className="card stack">
        <div className="notice success">
          <strong>Submission sealed.</strong> It cannot be edited or submitted again.
        </div>
        <p>
          {allSubmitted
            ? "All participants have submitted. Evaluation has been queued."
            : `${result.submittedCount} of ${result.participantCount} participants have submitted.`}
        </p>
        {result.status === "PUBLISHED" ? (
          <Link href={`/bets/${result.publicId}`} className="button">
            Read the Judgment
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
      <div className="card preview">
        <div className="notice">
          This is your final preview. Confirming makes this submission immutable and eventually
          public under your name.
        </div>
        <dl>
          <dt>Participant</dt>
          <dd>{label}</dd>
          <dt>Name</dt>
          <dd>{draft.name}</dd>
          <dt>Position</dt>
          <dd>{draft.position}</dd>
          <dt>Submission</dt>
          <dd>{draft.submission}</dd>
          <dt>Sources</dt>
          <dd>{parseSourceUrls(draft.sourceUrlsText).join("\n") || "None"}</dd>
        </dl>
        {error ? <div className="notice error">{error}</div> : null}
        <div className="row">
          <button className="button" onClick={confirm} disabled={submitting}>
            {submitting ? "Sealing…" : "Confirm and seal"}
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
    <form className="card form-grid" onSubmit={preview}>
      <SubmissionFields value={draft} onChange={setDraft} />
      <div className="field-full">
        <button className="button" type="submit">
          Review submission
        </button>
      </div>
    </form>
  );
}
