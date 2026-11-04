import { db } from "@/lib/db";
import { ACTIONS, type ActionKind } from "@/lib/game";
import { currentRoundWindow, getCoreFeed, getSqueekStatus } from "@/lib/squeekchain";

const COLONY_ID = "lantern-hollow";

export async function ensureWorld() {
  const colony = await db.colony.upsert({
    where: { id: COLONY_ID },
    update: {},
    create: {
      id: COLONY_ID,
      name: "Lantern Hollow",
      buildings: JSON.stringify({
        hearth: 2,
        workshop: 1,
        watchtower: 1,
        greenhouse: 1,
      }),
      chronicles: {
        create: [
          {
            round: -3,
            title: "The first lantern",
            body: "Seven tiny paws raised a light at the valley's edge. It has not gone out since.",
            mood: "hopeful",
          },
          {
            round: -2,
            title: "Tracks beyond the fern",
            body: "Scouts found a silver trail leading north. The council marked it for another night.",
            mood: "calm",
          },
          {
            round: -1,
            title: "A rumble under root",
            body: "Something shifted beyond the old gate. The watch has doubled until the threat passes.",
            mood: "tense",
          },
        ],
      },
    },
  });

  const [status, core] = await Promise.all([
    getSqueekStatus(),
    getCoreFeed().catch(() => null),
  ]);
  const settledThroughRound = core?.settledThroughRound ?? status.settledThroughRound;
  const roundNumber = core
    ? Math.max(
        settledThroughRound + 1,
        Math.floor(
          (Date.now() / 1_000 - core.genesisTimestamp) / core.roundDuration,
        ),
      )
    : settledThroughRound + 1 || Math.floor(Date.now() / 600_000);
  const window = currentRoundWindow(
    roundNumber,
    core
      ? {
          genesisTimestamp: core.genesisTimestamp,
          roundDuration: core.roundDuration,
        }
      : undefined,
  );
  const round = await db.gameRound.upsert({
    where: { chainRound: roundNumber },
    update: {},
    create: { ...window, colonyId: colony.id },
  });
  return { colony, round, status, core };
}

export async function getWorld(playerId?: string) {
  const { colony, round, status, core } = await ensureWorld();
  const [actions, chronicles, citizens, verifiedRounds] = await Promise.all([
    db.action.findMany({
      where: { roundId: round.id },
      select: { kind: true, playerId: true },
    }),
    db.chronicle.findMany({
      where: { colonyId: colony.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.player.findMany({
      orderBy: [{ xp: "desc" }, { joinedAt: "asc" }],
      take: 8,
      select: { id: true, address: true, displayName: true, xp: true },
    }),
    db.gameRound.findMany({
      where: { colonyId: colony.id, settledAt: { not: null } },
      orderBy: { chainRound: "desc" },
      take: 5,
      select: {
        chainRound: true,
        workUnits: true,
        outcome: true,
        transactionHash: true,
        settledAt: true,
      },
    }),
  ]);

  const votes = Object.fromEntries(ACTIONS.map((action) => [action, 0])) as Record<
    ActionKind,
    number
  >;
  for (const action of actions) votes[action.kind as ActionKind] += 1;

  return {
    colony: {
      ...colony,
      buildings: JSON.parse(colony.buildings) as Record<string, number>,
    },
    round: {
      chainRound: round.chainRound,
      startsAt: round.startsAt.toISOString(),
      endsAt: round.endsAt.toISOString(),
      votes,
      totalVotes: actions.length,
      myAction: actions.find((action) => action.playerId === playerId)?.kind ?? null,
    },
    status,
    proof: core
      ? {
          installationId: core.installationId,
          chainId: core.chainId,
          coreAddress: core.coreAddress,
          safeThroughBlock: core.safeThroughBlock,
        }
      : null,
    chronicles,
    citizens,
    verifiedRounds,
  };
}
