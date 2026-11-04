# Squeek Colony — submission kit

Use this file when deploying and submitting the project. Do not claim the project is live until the
public URL, round resolver and wallet flow have been tested.

## Recommended listing copy

**Name**

Squeek Colony

**One-line description**

A persistent cooperative world where community choices and real Squeekchain rounds write the history
of a hamster colony.

**Full description**

Squeek Colony turns every ten-minute SqueekCore round into a chapter of a shared strategy game.
Players join with a free wallet signature and choose whether Lantern Hollow should scout, build,
harvest, defend or rest. After the choice locks, the game waits for SqueekCore's finalized
`RoundRecorded` and `BatchSettled` events. Certified work determines whether the round is a Nap,
Jog or Zoom, while the community's winning action determines how food, timber, energy, morale and
threat change. Every resolved result links to its Sepolia transaction. Sleeping is deliberately
useful, the game never controls or encourages the hamster, and it never requests token or NFT
approval.

**Category**

Server game / community game / living story

**Why Squeekchain is essential**

Without SqueekCore settlements the colony cannot advance. The chain result is a required game input,
not a dashboard decoration: it changes resource outcomes, story chapters and strategy.

## Deploy with Railway

The repository includes a Dockerfile. Railway is a straightforward option because a persistent
volume can hold the included SQLite database.

1. Publish this repository to a **public GitHub repository**.
2. In Railway choose **New project → Deploy from GitHub repo**.
3. Add a persistent volume mounted at `/data`.
4. Set these variables:

   ```text
   DATABASE_URL=file:/data/colony.db
   AUTH_SECRET=<at least 32 random characters>
   CRON_SECRET=<a different long random value>
   SQUEEK_API_URL=https://api.squeekchain.com
   NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
   ```

5. Generate a Railway domain and check `https://YOUR_DOMAIN/api/health`.
6. Add your own custom domain in Railway. Direct Squeekchain verification requires control of DNS.
7. Create a job at cron-job.org:
   - URL: `https://YOUR_DOMAIN/api/cron/resolve`
   - Method: `POST`
   - Schedule: every minute
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
8. Wait for a SqueekCore round to settle. Confirm that **Verified outcomes** shows a receipt.

For production scale across several app instances, migrate Prisma from SQLite to managed PostgreSQL.
For a campaign build on one Railway instance, the persistent-volume setup is sufficient.

## Test before submission

- Desktop and mobile home pages load without horizontal overflow.
- `/proof` explains settlement and wallet safety.
- `/api/health` returns `"ok": true`.
- Live status says `verified feed`, not `reconnecting`.
- Wallet login requests a message signature, not a transaction.
- A connected wallet can choose and change one action.
- A settled result appears under **Verified outcomes** and opens Sepolia Etherscan.
- Refreshing preserves the session and selected action.
- The cron endpoint returns 401 without its bearer secret.
- The public GitHub README contains setup instructions.

## Submit directly to Squeekchain

As of 4 November 2026, direct submission is available.

1. Open [Genesis Code](https://squeekchain.com/genesis/code#how-building-works) and sign in.
2. Verify a regular wallet on the Genesis profile and link X if not already done.
3. Choose the direct submission option and enter the public site, public GitHub repository, name and
   listing copy above.
4. Squeekchain will generate three ownership proofs:
   - a DNS record for the custom domain;
   - a page tag for the live site;
   - an exact repository line for the public README.
5. Add the values **exactly as generated**. Do not invent them in advance.
6. Wait for DNS propagation, redeploy the page tag and press **Verify**.
7. Keep the DNS record, page tag, repository line and live site in place. Verification is rechecked.
8. After the automatic check, the Squeekchain team performs the final review.

When Squeekchain shows the generated page tag and README line, paste them into Cursor and ask it to
add the verification proofs. Those values are unique and cannot be prepared safely beforehand.

## IMD ownership route

If you prefer IMD instead of direct verification, create the IMD project with the first paid job
coming from the same regular wallet verified on the Genesis profile. Do this before treating an IMD
project as the canonical submission. IMD charges for jobs; Squeekchain submission and verification
are free.

## Suggested screenshots

1. Full desktop view showing the colony, live wheel and action council.
2. Mobile action council.
3. A resolved round with its Etherscan receipt.
4. The Proof & rules page.
