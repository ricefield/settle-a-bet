import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Settle a Bet", template: "%s · Settle a Bet" },
  description: "Put a friendly bet to an independent AI panel and see who made the better case.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand" aria-label="Settle a Bet home">
              <span className="brand-mark" aria-hidden="true">
                S
              </span>
              <span>Settle a Bet</span>
            </Link>
            <nav className="primary-nav" aria-label="Main navigation">
              <Link href="/#latest">Latest results</Link>
              <Link href="/#how-it-works">How it works</Link>
            </nav>
            <Link href="/bets/new" className="button button-small">
              <span aria-hidden="true">+</span> Start a bet
            </Link>
          </div>
          <div className="product-strip">
            <div className="shell">
              <span>
                <b>3</b> independent AI panelists
              </span>
              <span>
                <b>1</b> shared set of sources
              </span>
              <span>
                <b>$0</b> exchanged
              </span>
            </div>
          </div>
        </header>
        <div>{children}</div>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link href="/" className="brand footer-brand">
                <span className="brand-mark" aria-hidden="true">
                  S
                </span>
                <span>Settle a Bet</span>
              </Link>
              <p>Friendly stakes. Independent takes. No money moves.</p>
            </div>
            <Link href="/bets/new">Start a bet →</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
