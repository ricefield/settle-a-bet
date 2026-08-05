import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";
import { ParticipantForm } from "./ParticipantForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Add your take",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try {
    invitation = await getBetModule().getInvitation(token);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
  const pot = invitation.stakeUsd * invitation.participantCount;
  const unavailable = invitation.status !== "OPEN" || invitation.alreadySubmitted;
  return (
    <main className="shell form-page invite-page">
      <header className="form-header">
        <span className="status-chip status-chip-live">
          <span /> You’re up · Spot {invitation.label}
        </span>
        <h1>{invitation.title}</h1>
        <p>{invitation.question}</p>
      </header>
      <section className="invite-overview">
        <div>
          <span className="ticket-label">What to keep in mind</span>
          <h2>Ground rules</h2>
          <p>{invitation.decisionContext}</p>
        </div>
        <aside className="form-ticket">
          <span className="ticket-label">Pretend stakes</span>
          <strong>${invitation.stakeUsd.toLocaleString()} each</strong>
          <strong>${pot.toLocaleString()} total</strong>
          <p>No money will be collected or paid.</p>
        </aside>
      </section>
      {unavailable ? (
        <div className="notice">
          {invitation.alreadySubmitted
            ? "This link has already been used."
            : `This bet is ${invitation.status.toLowerCase().replaceAll("_", " ")} and is no longer taking answers.`}
        </div>
      ) : (
        <ParticipantForm token={token} label={invitation.label} />
      )}
    </main>
  );
}
