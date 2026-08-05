import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Settle a Bet", template: "%s · Settle a Bet" },
  description: "Settle a nominal-stakes disagreement with Claude Opus, OpenAI Sol, and Grok.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Settle a Bet
          </Link>
          <nav>
            <Link href="/bets/new" className="button button-small">
              Start a bet
            </Link>
          </nav>
        </header>
        <div>{children}</div>
        <footer className="site-footer">
          <p>Three independent models. One shared research record. No money collected or paid.</p>
        </footer>
      </body>
    </html>
  );
}
