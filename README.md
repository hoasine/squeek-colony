# Squeek Colony

A persistent cooperative world powered by real Squeekchain rounds. Players sign in with a free
wallet signature, choose one colony action per ten-minute round, and let Squeektoshi's settled work
decide how Lantern Hollow changes.

## What is implemented

- Responsive, original game UI with live wheel and Squeek block telemetry.
- Five council actions with live vote totals and one choice per wallet per round.
- Gasless wallet authentication using a short-lived, single-use challenge.
- Server-side sessions in secure, HTTP-only cookies.
- Persistent colony state, players, actions, rounds and chronicles in Prisma.
- Deterministic round engine where nap, jog and zoom outcomes are all useful.
- Protected settlement worker that matches SqueekCore `RoundRecorded` and `BatchSettled` events.
- Etherscan receipts and a public `/proof` methodology page for resolved rounds.
- Graceful fallback when the public status API is temporarily unavailable.
- Input validation, database constraints, security headers and engine tests.

## Run locally

Requirements: Node.js 20.9+ and npm.

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`. The first request creates Lantern Hollow and its opening chronicle.

## Environment

- `DATABASE_URL`: Prisma database URL. The included schema uses SQLite for a zero-setup local build.
- `AUTH_SECRET`: random value of at least 32 characters for signing sessions.
- `CRON_SECRET`: bearer token accepted by the settlement worker.
- `SQUEEK_API_URL`: defaults to `https://api.squeekchain.com`.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: reserved for direct-chain verification and holder features.
- `NEXT_PUBLIC_SITE_URL`: canonical public origin used by social sharing metadata.

Do not commit `.env`.

## Resolve settled rounds

Call the worker after Squeekchain settles a round:

```bash
curl -X POST http://localhost:3000/api/cron/resolve \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

In production, schedule this once per minute with the hosting platform's cron service. Calls are
idempotent: already resolved rounds are not processed again.

The worker matches local rounds against the canonical events returned by `/v1/core`, records the
transaction hash, runs the deterministic game engine and updates the colony inside a database
transaction. If the covering proof is unavailable, the worker leaves the round pending rather than
guessing.

## Application structure

```text
src/app/api/auth       wallet challenge, verification and session
src/app/api/actions    authenticated council choices
src/app/api/cron       protected settlement worker
src/app/api/health     deployment health check
src/app/api/world      public game snapshot
src/app/proof          public proof and safety methodology
src/components         interactive game client
src/lib/game.ts        deterministic game rules
src/lib/squeekchain.ts public API adapter and validation
src/lib/world.ts       world bootstrap and read model
prisma/schema.prisma   persistent backend model
```

## Production database

SQLite keeps development and judging setup simple and complete. For horizontally scaled production,
change the Prisma datasource provider to `postgresql`, set a managed PostgreSQL `DATABASE_URL`, and
run a Prisma migration. No application query needs to change. A single-instance deployment with a
persistent disk can use the included SQLite configuration as-is.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The game never controls or encourages the real hamster. Sleeping is a first-class, rewarding
outcome, and all wallet interactions are non-custodial.

## Deploy and submit

See `SUBMISSION.md` for:

- Railway deployment with a persistent database volume;
- the one-minute settlement cron configuration;
- listing copy and pre-submission tests;
- direct Genesis verification using DNS, a page tag and a public repository;
- the alternative IMD wallet-ownership route.
