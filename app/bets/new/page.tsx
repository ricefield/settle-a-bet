import type { Metadata } from "next";
import { CreateBetForm } from "./CreateBetForm";

export const metadata: Metadata = { title: "Start a Bet" };

export default function NewBetPage() {
  return (
    <main className="narrow form-page">
      <header className="form-header stack">
        <p className="eyebrow">New Bet</p>
        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)" }}>Frame the disagreement.</h1>
        <p className="lede">
          You submit first. Each invited participant gets one sealed, immutable submission. The
          panel starts automatically after the last person commits.
        </p>
      </header>
      <CreateBetForm />
    </main>
  );
}
