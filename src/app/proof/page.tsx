import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Proof & rules — Squeek Colony",
  description: "How Squeek Colony turns finalized SqueekCore rounds into game outcomes.",
};

export default function ProofPage() {
  return (
    <main className="proof-page">
      <nav className="proof-page-nav">
        <Link className="back-link" href="/">← Return to Lantern Hollow</Link>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">⌁</div>
          <div className="brand-name">Squeek Colony</div>
        </div>
      </nav>

      <div className="eyebrow">Proof, not promises</div>
      <h1>Every chapter begins on Ethereum.</h1>
      <p className="proof-intro">
        Colony decisions lock before a round closes. The server waits for SqueekCore to certify the
        result, then applies one deterministic set of rules. Every resolved round links to the
        Sepolia transaction that proved it.
      </p>

      <section className="proof-steps">
        <article className="proof-step">
          <span className="step-number">1</span>
          <h2>The council chooses</h2>
          <p>Each signed-in wallet gets one choice and may change it until the round closes.</p>
        </article>
        <article className="proof-step">
          <span className="step-number">2</span>
          <h2>SqueekCore settles</h2>
          <p>
            Active rounds emit <code>RoundRecorded</code>. Every covered range ends with{" "}
            <code>BatchSettled</code>.
          </p>
        </article>
        <article className="proof-step">
          <span className="step-number">3</span>
          <h2>The world advances</h2>
          <p>The game engine combines the winning choice and certified work into one state change.</p>
        </article>
      </section>

      <section className="method-section">
        <div className="eyebrow">Outcome rules</div>
        <h2>Sleep is part of the game</h2>
        <p>
          The colony never asks the hamster to run. A zero-work round is useful by design, especially
          for resting, research and quiet scouting.
        </p>
        <div className="rules-grid">
          <div className="rule-card">
            <strong>NAP · 0 work</strong>
            <span>Recovery, research and stealth receive the strongest effect.</span>
          </div>
          <div className="rule-card">
            <strong>JOG · 1–499</strong>
            <span>Harvesting and steady construction become most efficient.</span>
          </div>
          <div className="rule-card">
            <strong>ZOOM · 500+</strong>
            <span>Defense and heavy work surge, while noise may increase danger.</span>
          </div>
        </div>
      </section>

      <section className="method-section">
        <div className="eyebrow">Canonical source</div>
        <h2>No guessed results</h2>
        <p>
          The resolver reads <code>GET /v1/core</code> at the API&apos;s safe block. It discovers the
          active deployment identity from the response, matches a local round to its covering{" "}
          <code>BatchSettled</code> event, then reads work from the transaction&apos;s{" "}
          <code>RoundRecorded</code> event. If a covered round was omitted, the SqueekCore protocol
          defines its work as zero. If the proof is outside the available event window, the round
          stays pending instead of being guessed.
        </p>
        <p>
          Resource changes, the chronicle and the receipt are committed in one database transaction,
          so a partially resolved chapter cannot appear.
        </p>
        <a
          className="proof-method-link"
          href="https://docs.squeekchain.com/developers/core/"
          target="_blank"
          rel="noreferrer"
        >
          Read the official SqueekCore specification <ExternalLink size={12} />
        </a>
      </section>

      <section className="method-section">
        <div className="eyebrow">Wallet safety</div>
        <h2>Non-custodial by construction</h2>
        <p>
          Joining only signs a five-minute, single-use login message. It costs no gas, grants no
          token approval and never exposes a private key. The session is stored in a signed,
          HTTP-only cookie. Squeek Colony cannot move SQK or NFTs.
        </p>
      </section>
    </main>
  );
}
