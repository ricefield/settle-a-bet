import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";
import { CopyLink, OrganizerActions } from "./OrganizerActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bet dashboard",
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
    <main className="shell form-page organizer-page">
      <header className="form-header">
        <span className="status-chip status-chip-live">
          <span /> Private dashboard
        </span>
        <h1>{organizer.title}</h1>
        <p>{organizer.question}</p>
      </header>
      <section className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-heading">
            <div>
              <span className="ticket-label">Progress</span>
              <h2>
                {submitted} of {organizer.participantCount} people are in
              </h2>
            </div>
            <span className="status-chip">{organizer.status.replaceAll("_", " ")}</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(submitted / organizer.participantCount) * 100}%` }} />
          </div>
          <ul className="status-list">
            {organizer.slots.map((slot) => (
              <li className="status-item" key={slot.label}>
                <span className="participant-mark">{slot.label}</span>
                <div>
                  <strong>{slot.name || `Friend ${slot.label}`}</strong>
                  <small>{slot.submitted ? "Answer locked in" : "Waiting for their answer"}</small>
                </div>
                <span className={`status-chip ${slot.submitted ? "status-chip-done" : ""}`}>
                  {slot.submitted ? "Ready" : "Waiting"}
                </span>
              </li>
            ))}
          </ul>
          {organizer.invitationUrls.length ? (
            <div className="invite-links">
              <div className="section-title">
                <span>Share privately</span>
                <h3>Invite links</h3>
              </div>
              {organizer.invitationUrls.map((url) => (
                <CopyLink key={url} url={url} />
              ))}
            </div>
          ) : null}
          {organizer.failureReason ? (
            <div className="notice error">
              <strong>The panel hit a snag.</strong> {organizer.failureReason}
            </div>
          ) : null}
          {organizer.status === "PUBLISHED" ? (
            <Link className="button" href={`/bets/${organizer.publicId}`}>
              See the result
            </Link>
          ) : null}
          <OrganizerActions token={token} canCancel={organizer.status === "OPEN"} />
        </div>
        <aside className="form-ticket dashboard-ticket">
          <span className="ticket-label">Pretend stakes</span>
          <strong>${organizer.stakeUsd.toLocaleString()} each</strong>
          <strong>
            ${(organizer.stakeUsd * organizer.participantCount).toLocaleString()} total
          </strong>
          <p>No money was collected or paid.</p>
        </aside>
      </section>
    </main>
  );
}
