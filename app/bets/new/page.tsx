import type { Metadata } from "next";
import Link from "next/link";
import { CreateBetForm } from "./CreateBetForm";

export const metadata: Metadata = { title: "Start a Bet" };

export default function NewBetPage() {
  return (
    <main className="shell form-page">
      <header className="form-header">
        <Link className="back-link" href="/">
          ← Back to results
        </Link>
        <span className="status-chip status-chip-live">
          <span /> New bet
        </span>
        <h1>Set up the debate.</h1>
        <p>
          Add the question, choose the pretend stakes, and make your case. We’ll give you one
          private link for each friend.
        </p>
      </header>
      <CreateBetForm />
    </main>
  );
}
