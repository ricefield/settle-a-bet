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
        <div className="field-label-row">
          <label htmlFor="position">Your answer</label>
          <span>{value.position.length}/280</span>
        </div>
        <textarea
          id="position"
          className="input"
          required
          maxLength={280}
          value={value.position}
          onChange={(event) => update("position", event.target.value)}
        />
        <small>Keep it direct. This is the answer the panel can pick.</small>
      </div>
      <div className="field field-full">
        <label htmlFor="submission">Make your case</label>
        <textarea
          id="submission"
          className="input"
          required
          style={{ minHeight: 220 }}
          value={value.submission}
          onChange={(event) => update("submission", event.target.value)}
        />
        <small>Up to 1,500 words. Explain why your answer should win.</small>
      </div>
      <div className="field field-full">
        <label htmlFor="sources">
          Links that back you up <span className="optional">Optional</span>
        </label>
        <textarea
          id="sources"
          className="input"
          placeholder={"https://example.com/evidence\nhttps://example.org/other-source"}
          value={value.sourceUrlsText}
          onChange={(event) => update("sourceUrlsText", event.target.value)}
        />
        <small>One public HTTPS link per line, up to five.</small>
      </div>
      <label className="checkbox field-full">
        <input
          type="checkbox"
          checked={value.publicationConsent}
          onChange={(event) => update("publicationConsent", event.target.checked as true)}
          required
        />
        <span>
          My name, answer, explanation, and links can be public when the result is posted.
        </span>
      </label>
      <label className="checkbox field-full">
        <input
          type="checkbox"
          checked={value.nominalStakeAcknowledgement}
          onChange={(event) => update("nominalStakeAcknowledgement", event.target.checked as true)}
          required
        />
        <span>This stake is just for fun. No money will be collected or paid.</span>
      </label>
    </>
  );
}
