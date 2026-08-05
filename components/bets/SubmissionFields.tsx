import type { ParticipantSubmissionInput } from "@/lib/types";

export type SubmissionDraft = Omit<ParticipantSubmissionInput, "sourceUrls"> & {
  sourceUrlsText: string;
};

export const emptySubmission: SubmissionDraft = {
  name: "",
  position: "",
  submission: "",
  sourceUrlsText: "",
  publicationConsent: false as true,
  nominalStakeAcknowledgement: false as true,
};

export function parseSourceUrls(value: string): string[] {
  return value
    .split(/\n/u)
    .map((url) => url.trim())
    .filter(Boolean);
}

export function SubmissionFields({
  value,
  onChange,
  nameLabel = "Your name",
}: {
  value: SubmissionDraft;
  onChange: (next: SubmissionDraft) => void;
  nameLabel?: string;
}) {
  const update = <Key extends keyof SubmissionDraft>(key: Key, next: SubmissionDraft[Key]) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <div className="field">
        <label htmlFor="participant-name">{nameLabel}</label>
        <input
          id="participant-name"
          className="input"
          required
          maxLength={80}
          value={value.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </div>
      <div className="field field-full">
        <label htmlFor="position">Concise Position</label>
        <textarea
          id="position"
          className="input"
          required
          maxLength={280}
          value={value.position}
          onChange={(event) => update("position", event.target.value)}
        />
        <small>
          {value.position.length}/280 characters. State the answer you want the panel to choose.
        </small>
      </div>
      <div className="field field-full">
        <label htmlFor="submission">Submission</label>
        <textarea
          id="submission"
          className="input"
          required
          style={{ minHeight: 220 }}
          value={value.submission}
          onChange={(event) => update("submission", event.target.value)}
        />
        <small>Up to 1,500 words. Make the strongest self-contained case for your Position.</small>
      </div>
      <div className="field field-full">
        <label htmlFor="sources">Public sources</label>
        <textarea
          id="sources"
          className="input"
          placeholder={"https://example.com/evidence\nhttps://example.org/other-source"}
          value={value.sourceUrlsText}
          onChange={(event) => update("sourceUrlsText", event.target.value)}
        />
        <small>Optional. One HTTPS URL per line, up to five.</small>
      </div>
      <label className="checkbox field-full">
        <input
          type="checkbox"
          checked={value.publicationConsent}
          onChange={(event) => update("publicationConsent", event.target.checked as true)}
          required
        />
        <span>
          I consent to my name, Position, Submission, and sources becoming public with the Judgment.
        </span>
      </label>
      <label className="checkbox field-full">
        <input
          type="checkbox"
          checked={value.nominalStakeAcknowledgement}
          onChange={(event) => update("nominalStakeAcknowledgement", event.target.checked as true)}
          required
        />
        <span>
          I understand that the stake is hypothetical. No money will be collected or paid.
        </span>
      </label>
    </>
  );
}
