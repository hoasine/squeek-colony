import { z } from "zod";

const statusSchema = z.object({
  generatedAt: z.string(),
  measurement: z.object({
    freshness: z.string(),
    coreStatus: z.string(),
    rpmMilli: z.number(),
    speedMmPerSecond: z.number(),
    cumulativeWorkUnits: z.string(),
    distanceMm: z.number(),
  }),
  builder: z.object({
    anchor: z.object({
      blockHeight: z.string(),
      blockProgress: z.string(),
      settledThroughRound: z.string(),
      transactionHash: z.string(),
    }),
  }),
});

const coreEventSchema = z.object({
  eventName: z.string(),
  transactionHash: z.string(),
  blockNumber: z.string(),
  arguments: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
    }),
  ),
});

const coreSchema = z.object({
  installationId: z.string(),
  status: z.string(),
  chain: z.object({
    chainId: z.string(),
    safeThroughBlock: z.string(),
  }),
  identities: z.object({ core: z.string() }),
  configuration: z.object({
    genesisTimestamp: z.string(),
    roundDuration: z.string(),
  }),
  core: z.object({ settledThroughRound: z.string() }),
  events: z.array(coreEventSchema),
});

type CoreEvent = z.infer<typeof coreEventSchema>;

export type CoreFeed = {
  installationId: string;
  chainId: number;
  safeThroughBlock: number;
  coreAddress: string;
  genesisTimestamp: number;
  roundDuration: number;
  settledThroughRound: number;
  events: CoreEvent[];
};

export type RoundProof = {
  round: number;
  workUnits: number;
  transactionHash: string;
  blockNumber: number;
};

export type SqueekStatus = {
  online: boolean;
  source: "live" | "fallback";
  generatedAt: string;
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

const FALLBACK: SqueekStatus = {
  online: false,
  source: "fallback",
  generatedAt: new Date(0).toISOString(),
  isRunning: false,
  rpm: 0,
  speedMps: 0,
  totalWork: 0,
  distanceKm: 0,
  blockHeight: 0,
  blockProgress: 0,
  settledThroughRound: 0,
  transactionHash: null,
};

export async function getSqueekStatus(): Promise<SqueekStatus> {
  try {
    const base = process.env.SQUEEK_API_URL ?? "https://api.squeekchain.com";
    const response = await fetch(`${base}/v1/status`, {
      next: { revalidate: 10 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Squeek API returned ${response.status}`);
    const data = statusSchema.parse(await response.json());
    return {
      online: data.measurement.freshness === "online",
      source: "live",
      generatedAt: data.generatedAt,
      isRunning: data.measurement.coreStatus === "SPINNING",
      rpm: data.measurement.rpmMilli / 1_000,
      speedMps: data.measurement.speedMmPerSecond / 1_000,
      totalWork: Number(data.measurement.cumulativeWorkUnits),
      distanceKm: data.measurement.distanceMm / 1_000_000,
      blockHeight: Number(data.builder.anchor.blockHeight),
      blockProgress: Number(data.builder.anchor.blockProgress) / 1_000_000_000,
      settledThroughRound: Number(data.builder.anchor.settledThroughRound),
      transactionHash: data.builder.anchor.transactionHash,
    };
  } catch {
    return { ...FALLBACK, generatedAt: new Date().toISOString() };
  }
}

function argument(event: CoreEvent, name: string) {
  return event.arguments.find((item) => item.name === name)?.value;
}

export async function getCoreFeed(fresh = false): Promise<CoreFeed> {
  const base = process.env.SQUEEK_API_URL ?? "https://api.squeekchain.com";
  const response = await fetch(`${base}/v1/core`, {
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 10 } }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Squeek Core API returned ${response.status}`);
  const data = coreSchema.parse(await response.json());
  return {
    installationId: data.installationId,
    chainId: Number(data.chain.chainId),
    safeThroughBlock: Number(data.chain.safeThroughBlock),
    coreAddress: data.identities.core,
    genesisTimestamp: Number(data.configuration.genesisTimestamp),
    roundDuration: Number(data.configuration.roundDuration),
    settledThroughRound: Number(data.core.settledThroughRound),
    events: data.events,
  };
}

export function proofForRound(feed: CoreFeed, round: number): RoundProof | null {
  const batch = feed.events.find((event) => {
    if (event.eventName !== "BatchSettled") return false;
    const previous = Number(argument(event, "previousSettledThroughRound"));
    const settled = Number(argument(event, "settledThroughRound"));
    return previous < round && round <= settled;
  });
  if (!batch) return null;

  const recorded = feed.events.find(
    (event) =>
      event.eventName === "RoundRecorded" &&
      Number(argument(event, "roundId")) === round &&
      event.transactionHash === batch.transactionHash,
  );
  return {
    round,
    workUnits: recorded ? Number(argument(recorded, "work")) : 0,
    transactionHash: batch.transactionHash,
    blockNumber: Number(batch.blockNumber),
  };
}

export function currentRoundWindow(
  round: number,
  configuration?: { genesisTimestamp: number; roundDuration: number },
) {
  const duration = (configuration?.roundDuration ?? 600) * 1_000;
  const genesis = (configuration?.genesisTimestamp ?? 0) * 1_000;
  const startsAt = configuration
    ? genesis + round * duration
    : Math.floor(Date.now() / duration) * duration;
  return {
    id: `squeek-${round}`,
    chainRound: round,
    startsAt: new Date(startsAt),
    endsAt: new Date(startsAt + duration),
  };
}
