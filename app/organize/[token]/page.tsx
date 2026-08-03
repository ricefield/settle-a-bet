import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";
import { CopyLink, OrganizerActions } from "./OrganizerActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organize a Bet",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function baseUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export default async function OrganizerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let organizer;
  try {
    organizer = await getBetModule().getOrganizer(token, await baseUrl());
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
  const submitted = organizer.slots.filter((slot) => slot.submitted).length;
  return (
    <main className="narrow form-page">
      <header className="form-header stack">
        <p className="eyebrow">Private organizer view</p>
        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)" }}>{organizer.title}</h1>
        <p className="lede">{organizer.question}</p>
        <div className="row">
          <span className="pill">{organizer.status.replaceAll("_", " ")}</span>
          <span>
            {submitted} of {organizer.participantCount} submitted
          </span>
        </div>
      </header>
      <section className="card stack">
        <h3>Participants</h3>
        <ul className="status-list">
          {organizer.slots.map((slot) => (
            <li className="status-item" key={slot.label}>
              <span>
                {slot.label}
                {slot.name ? ` · ${slot.name}` : ""}
              </span>
              <strong>{slot.submitted ? "Sealed" : "Waiting"}</strong>
            </li>
          ))}
        </ul>
        {organizer.invitationUrls.length ? (
          <div className="stack">
            <h3>Invitation links</h3>
            {organizer.invitationUrls.map((url) => (
              <CopyLink key={url} url={url} />
            ))}
          </div>
        ) : null}
        <div className="notice">
          ${organizer.stakeUsd.toLocaleString()} per person · $
          {(organizer.stakeUsd * organizer.participantCount).toLocaleString()} hypothetical pot. No
          money was collected or paid.
        </div>
        {organizer.failureReason ? (
          <div className="notice error">
            <strong>Evaluation failed.</strong> {organizer.failureReason}
          </div>
        ) : null}
        {organizer.status === "PUBLISHED" ? (
          <Link className="button" href={`/bets/${organizer.publicId}`}>
            Read the Judgment
          </Link>
        ) : null}
        <OrganizerActions token={token} canCancel={organizer.status === "OPEN"} />
      </section>
    </main>
  );
}
