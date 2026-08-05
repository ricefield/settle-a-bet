"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrganizerActions({ token, canCancel }: { token: string; canCancel: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  if (!canCancel) return null;
  return (
    <div className="stack">
      <button
        className="button button-danger"
        disabled={working}
        onClick={async () => {
          if (!window.confirm("Cancel this bet? No one else will be able to add an answer."))
            return;
          setWorking(true);
          const response = await fetch(`/api/organizer/${encodeURIComponent(token)}/cancel`, {
            method: "POST",
          });
          const body = (await response.json()) as { error?: { message?: string } };
          if (!response.ok) {
            setError(body.error?.message ?? "We couldn’t cancel this bet");
            setWorking(false);
            return;
          }
          router.refresh();
        }}
      >
        {working ? "Cancelling…" : "Cancel bet"}
      </button>
      {error ? <div className="notice error">{error}</div> : null}
    </div>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="link-box">
      <code>{url}</code>
      <button
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
