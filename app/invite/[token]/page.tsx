import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBetModule } from "@/lib/bet";
import { AppError } from "@/lib/errors";
import { ParticipantForm } from "./ParticipantForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Submit to a Bet",
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
    <main className="narrow form-page">
      <header className="form-header stack">
        <p className="eyebrow">Private invitation · {invitation.label}</p>
        <h1 style={{ fontSize: "clamp(2.7rem, 7vw, 5rem)" }}>{invitation.title}</h1>
        <p className="lede">{invitation.question}</p>
      </header>
      <section className="card stack" style={{ marginBottom: 18 }}>
        <h3>Decision Frame</h3>
        <p className="prose">{invitation.decisionContext}</p>
        <div className="notice">
          ${invitation.stakeUsd.toLocaleString()} per person · ${pot.toLocaleString()} hypothetical
          pot. No money was collected or paid.
        </div>
      </section>
      {unavailable ? (
        <div className="notice">
          {invitation.alreadySubmitted
            ? "This invitation has already been used."
            : `This Bet is ${invitation.status.toLowerCase().replaceAll("_", " ")} and no longer accepts submissions.`}
        </div>
      ) : (
        <ParticipantForm token={token} label={invitation.label} />
      )}
    </main>
  );
}
