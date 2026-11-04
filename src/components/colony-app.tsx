"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Radio,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ACTIONS, actionMeta, type ActionKind } from "@/lib/game";

type Player = {
  id: string;
  address: string;
  displayName?: string | null;
  xp: number;
};

type World = {
  colony: {
    name: string;
    day: number;
    food: number;
    timber: number;
    energy: number;
    morale: number;
    threat: number;
    buildings: Record<string, number>;
  };
  round: {
    chainRound: number;
    startsAt: string;
    endsAt: string;
    votes: Record<ActionKind, number>;
    totalVotes: number;
    myAction: ActionKind | null;
  };
  status: {
    online: boolean;
    source: "live" | "fallback";
    isRunning: boolean;
    rpm: number;
    speedMps: number;
    totalWork: number;
    distanceKm: number;
    blockHeight: number;
    blockProgress: number;
    settledThroughRound: number;
    transactionHash: string | null;
  };
  proof: {
    installationId: string;
    chainId: number;
    coreAddress: string;
    safeThroughBlock: number;
  } | null;
  chronicles: Array<{
    id: string;
    round: number;
    title: string;
    body: string;
    mood: string;
    createdAt: string;
  }>;
  citizens: Player[];
  verifiedRounds: Array<{
    chainRound: number;
    workUnits: number | null;
    outcome: "NAP" | "JOG" | "ZOOM" | null;
    transactionHash: string | null;
    settledAt: string | null;
  }>;
};

const resourceMeta = [
  { key: "food", label: "Provisions", color: "#a8e6a3", max: 220 },
  { key: "timber", label: "Timber", color: "#d9b584", max: 180 },
  { key: "energy", label: "Energy", color: "#8bd8e8", max: 100 },
  { key: "morale", label: "Morale", color: "#b9a7ff", max: 100 },
  { key: "threat", label: "Threat", color: "#f28f67", max: 100 },
] as const;

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ColonyApp() {
  const [world, setWorld] = useState<World | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBusy, setWalletBusy] = useState(false);
  const [voting, setVoting] = useState<ActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadWorld = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/world", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not reach Lantern Hollow.");
      setWorld((await response.json()) as World);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Colony signal lost.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(() => {
      void Promise.all([
        loadWorld(),
        fetch("/api/auth/session", { cache: "no-store" })
          .then((response) => response.json())
          .then((data: { player: Player | null }) => setPlayer(data.player))
          .catch(() => null),
      ]);
    }, 0);
    const poll = window.setInterval(() => void loadWorld(true), 15_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [loadWorld]);

  const timing = (() => {
    if (!world) return { remaining: 0, progress: 0 };
    const starts = new Date(world.round.startsAt).getTime();
    const ends = new Date(world.round.endsAt).getTime();
    return {
      remaining: ends - now,
      progress: Math.max(0, Math.min(1, (now - starts) / (ends - starts))),
    };
  })();

  async function connectWallet() {
    if (!window.ethereum) {
      toast.error("No browser wallet found. Install MetaMask or open this in a wallet browser.");
      return;
    }
    setWalletBusy(true);
    try {
      const [address] = await window.ethereum.request<string[]>({
        method: "eth_requestAccounts",
      });
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message) {
        throw new Error(challenge.error ?? "Could not create sign-in message.");
      }
      const signature = await window.ethereum.request<string>({
        method: "personal_sign",
        params: [challenge.message, address],
      });
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const verified = (await verifyResponse.json()) as { player?: Player; error?: string };
      if (!verifyResponse.ok || !verified.player) {
        throw new Error(verified.error ?? "Wallet signature was not accepted.");
      }
      setPlayer(verified.player);
      await loadWorld(true);
      toast.success("Welcome to the council. Your signature cost no gas.");
    } catch (reason) {
      const message =
        reason instanceof Error && reason.message.includes("User rejected")
          ? "Signature cancelled. No changes were made."
          : reason instanceof Error
            ? reason.message
            : "Wallet connection failed.";
      toast.error(message);
    } finally {
      setWalletBusy(false);
    }
  }

  async function disconnect() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setPlayer(null);
    await loadWorld(true);
  }

  async function chooseAction(action: ActionKind) {
    if (!player) {
      await connectWallet();
      return;
    }
    setVoting(action);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The council could not record your choice.");
      await loadWorld(true);
      toast.success(`${actionMeta[action].label} chosen for this round.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Vote failed.");
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">⌁</div>
          <div>
            <div className="brand-name">Squeek Colony</div>
            <div className="brand-subtitle">Lantern Hollow · Sepolia</div>
          </div>
        </div>
        <div className="top-actions">
          <div className="live-pill">
            <span className={`pulse-dot ${world?.status.isRunning ? "" : "sleeping"}`} />
            {world?.status.isRunning ? "Wheel running" : "Wheel resting"}
          </div>
          {player ? (
            <>
              <button className="wallet-button connected" onClick={disconnect} title="Sign out">
                <span>{shortAddress(player.address)}</span>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <button className="wallet-button" onClick={connectWallet} disabled={walletBusy}>
              {walletBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Wallet size={15} />}
              {walletBusy ? "Signing…" : "Join colony"}
            </button>
          )}
        </div>
      </header>

      <main className="dashboard">
        <div className="main-column">
          {error && <div className="error-banner">{error} Retrying automatically.</div>}
          <section className="panel hero">
            <div className="hero-copy">
              <div>
                <div className="eyebrow">A living world on Squeekchain</div>
                <h1>
                  Build together.<br />
                  Let the <em>wheel decide.</em>
                </h1>
                <p className="hero-lead">
                  Every ten minutes, real work from Squeektoshi&apos;s wheel becomes the weather,
                  fortune and danger of Lantern Hollow. Choose before the round locks.
                </p>
              </div>
              <div>
                <div className="round-strip">
                  <div>
                    <div className="tiny-label">Current round</div>
                    <div className={loading ? "round-number skeleton" : "round-number"}>
                      #{world?.round.chainRound ?? "000"}
                    </div>
                  </div>
                  <div>
                    <div className="tiny-label">Council locks in</div>
                    <div className="round-number countdown">{formatTime(timing.remaining)}</div>
                  </div>
                </div>
                <div className="round-progress" aria-label="Round progress">
                  <span style={{ width: `${timing.progress * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="colony-scene" aria-label="Lantern Hollow at night">
              <div className="moon" />
              <div className="hill" />
              <div className="house house-a" />
              <div className="house house-b" />
              <div className="house house-c" />
              <div className={`wheel ${world?.status.isRunning ? "running" : ""}`} />
              <div className="scene-caption">
                <Radio size={12} />
                Live wheel signal · {world?.status.source === "live" ? "verified feed" : "reconnecting"}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="resource-grid">
              {resourceMeta.map((resource) => {
                const value = world?.colony[resource.key] ?? 0;
                return (
                  <div className="resource" key={resource.key}>
                    <div className="resource-head">
                      <span>{resource.label}</span>
                      <span>{resource.key === "threat" ? "risk" : "stock"}</span>
                    </div>
                    <div className={loading ? "resource-value skeleton" : "resource-value"}>
                      {value}
                    </div>
                    <div className="meter" style={{ "--meter": resource.color } as React.CSSProperties}>
                      <span style={{ width: `${Math.min(100, (value / resource.max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="council">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">The round council</div>
                  <h2>Where should the colony focus?</h2>
                </div>
                <p className="section-note">
                  One wallet, one choice. You can change it until the round begins. Signing in is
                  free and never sends a transaction.
                </p>
              </div>
              <div className="action-grid">
                {ACTIONS.map((action) => {
                  const meta = actionMeta[action];
                  const votes = world?.round.votes[action] ?? 0;
                  const total = world?.round.totalVotes ?? 0;
                  const selected = world?.round.myAction === action;
                  return (
                    <button
                      className={`action-card ${selected ? "selected" : ""}`}
                      style={{ "--accent": meta.color } as React.CSSProperties}
                      key={action}
                      onClick={() => void chooseAction(action)}
                      disabled={voting !== null || timing.remaining <= 0}
                    >
                      <span className="vote-count">
                        {voting === action ? "saving…" : `${votes} ${votes === 1 ? "voice" : "voices"}`}
                      </span>
                      <span className="action-icon">{meta.icon}</span>
                      <span className="action-title">{meta.label}</span>
                      <span className="action-description">{meta.description}</span>
                      <span className="vote-bar">
                        <span style={{ width: `${total ? (votes / total) * 100 : 0}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel chain-card">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Proof of Squeek</div>
                <h2>The wheel now</h2>
              </div>
              <span className={`pulse-dot ${world?.status.isRunning ? "" : "sleeping"}`} />
            </div>
            <div className="wheel-status">
              <div className="wheel-status-main">
                <span className="wheel-state">
                  {world?.status.isRunning ? "Squeektoshi runs" : "Squeektoshi rests"}
                </span>
                <span className="rpm">{world?.status.rpm.toFixed(1) ?? "—"} rpm</span>
              </div>
            </div>
            <div className="chain-metrics">
              <div className="chain-metric">
                <span className="tiny-label">Squeek block</span>
                <span className="chain-value">#{world?.status.blockHeight.toLocaleString() ?? "—"}</span>
              </div>
              <div className="chain-metric">
                <span className="tiny-label">Block progress</span>
                <span className="chain-value">
                  {world ? `${(world.status.blockProgress * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className="chain-metric">
                <span className="tiny-label">Lifetime work</span>
                <span className="chain-value">{world?.status.totalWork.toLocaleString() ?? "—"}</span>
              </div>
              <div className="chain-metric">
                <span className="tiny-label">Distance</span>
                <span className="chain-value">{world?.status.distanceKm.toFixed(2) ?? "—"} km</span>
              </div>
            </div>
            <div className="block-progress" aria-label="Squeek block progress">
              <span style={{ width: `${(world?.status.blockProgress ?? 0) * 100}%` }} />
            </div>
            {world?.proof && (
              <div className="chain-identity">
                <CheckCircle2 size={13} />
                <span>Core {shortAddress(world.proof.coreAddress)}</span>
                <span>· safe block {world.proof.safeThroughBlock.toLocaleString()}</span>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Ethereum receipts</div>
                <h2>Verified outcomes</h2>
              </div>
              <CheckCircle2 size={17} color="#b8db90" />
            </div>
            <div className="proof-list">
              {world?.verifiedRounds.length ? (
                world.verifiedRounds.slice(0, 4).map((round) => (
                  <a
                    className="proof-row"
                    key={round.chainRound}
                    href={
                      round.transactionHash
                        ? `https://sepolia.etherscan.io/tx/${round.transactionHash}`
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className={`outcome-badge ${(round.outcome ?? "NAP").toLowerCase()}`}>
                      {round.outcome ?? "NAP"}
                    </span>
                    <span>
                      <strong>Round {round.chainRound}</strong>
                      <small>{round.workUnits?.toLocaleString() ?? 0} wheel passes</small>
                    </span>
                    <ExternalLink size={12} />
                  </a>
                ))
              ) : (
                <div className="empty-proof">
                  The first receipt appears after this colony round settles on Sepolia.
                </div>
              )}
            </div>
            <Link className="proof-method-link" href="/proof">
              How every result is proven <span>→</span>
            </Link>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Living history</div>
                <h2>Chronicle</h2>
              </div>
            </div>
            <div className="chronicle-list">
              {(world?.chronicles ?? []).slice(0, 4).map((entry) => (
                <article className={`chronicle ${entry.mood}`} key={entry.id}>
                  <h3 className="chronicle-title">{entry.title}</h3>
                  <p className="chronicle-body">{entry.body}</p>
                  <span className="chronicle-meta">
                    {entry.round > 0 ? `Round ${entry.round}` : "Colony archive"}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel citizens-card">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Council members</div>
                <h2>Citizens</h2>
              </div>
              <Users size={17} color="#9fa79b" />
            </div>
            <div className="citizen-list">
              {world?.citizens.length ? (
                world.citizens.map((citizen, index) => (
                  <div className="citizen" key={citizen.id}>
                    <div className="avatar">{["◒", "◉", "◐", "◍"][index % 4]}</div>
                    <span className="citizen-name">
                      {citizen.displayName || shortAddress(citizen.address)}
                    </span>
                    <span className="citizen-xp">{citizen.xp} renown</span>
                  </div>
                ))
              ) : (
                <div className="empty-citizens">
                  Lantern Hollow is waiting for its first council member. Join with a free wallet
                  signature and make the opening choice.
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>

      <footer className="footer">
        <span>Community-built · The real hamster is never encouraged or controlled</span>
        <span className="footer-links">
          <Link href="/proof">Proof & rules</Link>
          <a href="https://squeekchain.com" target="_blank" rel="noreferrer">
            Squeekchain <ExternalLink size={9} style={{ display: "inline" }} />
          </a>
        </span>
      </footer>
    </div>
  );
}
