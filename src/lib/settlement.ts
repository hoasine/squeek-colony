import { ACTIONS, resolveRound, type ActionKind } from "@/lib/game";
import { db } from "@/lib/db";
import { getCoreFeed, proofForRound } from "@/lib/squeekchain";

function bounded(value: number) {
  return Math.max(0, Math.min(999, value));
}

export async function settleDueRounds() {
  const due = await db.gameRound.findMany({
    where: { settledAt: null, endsAt: { lte: new Date() } },
    include: { actions: true, colony: true },
    orderBy: { chainRound: "asc" },
    take: 6,
  });
  if (due.length === 0) return { resolved: [] as number[], pending: [] as number[] };

  const feed = await getCoreFeed(true);
  const resolved: number[] = [];
  const pending: number[] = [];

  for (const round of due) {
    if (round.chainRound > feed.settledThroughRound) {
      pending.push(round.chainRound);
      continue;
    }
    const proof = proofForRound(feed, round.chainRound);
    if (!proof) {
      pending.push(round.chainRound);
      continue;
    }
    const votes = Object.fromEntries(ACTIONS.map((action) => [action, 0])) as Record<
      ActionKind,
      number
    >;
    for (const action of round.actions) votes[action.kind as ActionKind] += 1;
    const result = resolveRound(proof.workUnits, votes);

    await db.$transaction(async (tx) => {
      await tx.colony.update({
        where: { id: round.colonyId },
        data: {
          day: { increment: 1 },
          food: bounded(round.colony.food + result.delta.food),
          timber: bounded(round.colony.timber + result.delta.timber),
          energy: bounded(round.colony.energy + result.delta.energy),
          morale: bounded(round.colony.morale + result.delta.morale),
          threat: bounded(round.colony.threat + result.delta.threat),
        },
      });
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          settledAt: new Date(),
          workUnits: proof.workUnits,
          outcome: proof.workUnits === 0 ? "NAP" : proof.workUnits < 500 ? "JOG" : "ZOOM",
          transactionHash: proof.transactionHash,
          resolution: JSON.stringify(result),
        },
      });
      await tx.chronicle.upsert({
        where: { colonyId_round: { colonyId: round.colonyId, round: round.chainRound } },
        update: {},
        create: {
          colonyId: round.colonyId,
          round: round.chainRound,
          title: result.title,
          body: result.body,
          mood: result.mood,
        },
      });
    });
    resolved.push(round.chainRound);
  }

  return { resolved, pending, safeThroughBlock: feed.safeThroughBlock, coreAddress: feed.coreAddress };
}
