# Squeek Colony

squeekchain-project: 6a6640e9-c1b6-4550-9dae-23729a14a018

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

- `DATABASE_URL`: Neon Postgres connection string. Use the pooled URL in production.
- `AUTH_SECRET`: random value of at least 32 characters for signing sessions.
- `CRON_SECRET`: bearer token accepted by the settlement worker.
- `SQUEEK_API_URL`: defaults to `https://api.squeekchain.com`.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Sepolia endpoint used when the public Squeek API is unreachable.
- `NEXT_PUBLIC_SITE_URL`: canonical public origin used by social sharing metadata.

Do not commit `.env`.

## Resolve settled rounds

Call the worker after Squeekchain settles a round:

```bash
curl -X POST http://localhost:3000/api/cron/resolve \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Opening the colony also settles any closed rounds, so the free Vercel deployment does not depend on
a paid minute-by-minute cron. The protected endpoint remains available and is idempotent.

The worker matches local rounds against `BatchSettled` and `RoundRecorded` events from `/v1/core`, or from Sepolia logs when that API is blocked, records the
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

## Production

Deploy on Vercel's free Hobby plan with a Neon Postgres database. The public domain is
`squeekcolony.asia`. Point its nameservers at `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, then
add Squeekchain's verification `TXT` record in Vercel. See `SUBMISSION.md`.

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

- the free Vercel and Neon deployment;
- settlement when the colony page is opened;
- listing copy and pre-submission tests;
- direct Genesis verification using DNS, a page tag and a public repository;
- the alternative IMD wallet-ownership route.
