import { createPublicClient, http, parseAbi, type Address } from "viem";
import { sepolia } from "viem/chains";
import { z } from "zod";

const CORE_ADDRESS: Address = "0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44";
const chainAbi = parseAbi([
  "function configuration() view returns ((bytes32 streamId, uint64 genesisTimestamp, uint64 roundDuration, uint64 maxWorkPerRound, uint16 maxRoundsPerBatch, address guardian, address reporter, uint32 initialWorkPerThousandBlocks, uint64 targetBlocksPerActiveRound, uint64 difficultySmoothingRounds, uint96 blockUnitsPerBlock))",
  "function state() view returns ((uint64 settledThroughRound, uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint64 blockHeight, uint96 blockProgress, uint32 workPerThousandBlocks, uint256 authorizationNonce, bool paused))",
  "event BatchSettled(bytes32 indexed digest, address indexed reporter, uint64 indexed settledThroughRound, uint256 nonce, uint64 previousSettledThroughRound, uint16 activeRoundCount, uint64 cumulativeWork, uint96 cumulativeBlockUnits)",
  "event RoundRecorded(uint64 indexed roundId, uint64 work, uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint32 workPerThousandBlocks, bytes32 dataHash)",
]);

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
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "SqueekColony/1.0" },
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 180);
      throw new Error(`Squeek API returned ${response.status}: ${detail}`);
    }
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
  } catch (error) {
    console.error("Squeek status unavailable", error);
    try {
      return (await readChainView()).status;
    } catch (chainError) {
      console.error("Squeek chain read unavailable", chainError);
      return { ...FALLBACK, generatedAt: new Date().toISOString() };
    }
  }
}

function argument(event: CoreEvent, name: string) {
  return event.arguments.find((item) => item.name === name)?.value;
}

async function getCoreFeedFromApi(): Promise<CoreFeed> {
  const base = process.env.SQUEEK_API_URL ?? "https://api.squeekchain.com";
  const response = await fetch(`${base}/v1/core`, {
    cache: "no-store",
    headers: { accept: "application/json", "user-agent": "SqueekColony/1.0" },
    signal: AbortSignal.timeout(2_500),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`Squeek Core API returned ${response.status}: ${detail}`);
  }
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

type ChainView = { status: SqueekStatus; feed: CoreFeed };

let chainCache: { at: number; value: ChainView } | null = null;
let chainRead: Promise<ChainView> | null = null;

function readChainView() {
  if (chainCache && Date.now() - chainCache.at < 20_000) return Promise.resolve(chainCache.value);
  if (!chainRead) {
    chainRead = loadChainView()
      .then((value) => {
        chainCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        chainRead = null;
      });
  }
  return chainRead;
}

async function loadChainView(): Promise<ChainView> {
  const rpc = createPublicClient({
    chain: sepolia,
    transport: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    ),
  });
  const [configuration, state, latest] = await Promise.all([
    rpc.readContract({ address: CORE_ADDRESS, abi: chainAbi, functionName: "configuration" }),
    rpc.readContract({ address: CORE_ADDRESS, abi: chainAbi, functionName: "state" }),
    rpc.getBlockNumber(),
  ]);
  const logs = await rpc.getLogs({
    address: CORE_ADDRESS,
    events: [chainAbi[2], chainAbi[3]],
    fromBlock: latest > BigInt(4000) ? latest - BigInt(4000) : BigInt(0),
    toBlock: latest,
  });
  const events: CoreEvent[] = logs.flatMap((log) =>
    log.args
      ? [
          {
            eventName: log.eventName,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
            arguments: Object.entries(log.args).map(([name, value]) => ({
              name,
              value: typeof value === "bigint" ? value.toString() : String(value),
            })),
          },
        ]
      : [],
  );
  const latestBatch = [...logs].reverse().find((log) => log.eventName === "BatchSettled");
  return {
    feed: {
      installationId: configuration.streamId,
      chainId: sepolia.id,
      safeThroughBlock: Number(latest > BigInt(12) ? latest - BigInt(12) : latest),
      coreAddress: CORE_ADDRESS,
      genesisTimestamp: Number(configuration.genesisTimestamp),
      roundDuration: Number(configuration.roundDuration),
      settledThroughRound: Number(state.settledThroughRound),
      events,
    },
    status: {
      online: true,
      source: "live",
      generatedAt: new Date().toISOString(),
      isRunning: false,
      rpm: 0,
      speedMps: 0,
      totalWork: Number(state.cumulativeWork),
      distanceKm: 0,
      blockHeight: Number(state.blockHeight),
      blockProgress: Number(state.blockProgress) / 1_000_000_000,
      settledThroughRound: Number(state.settledThroughRound),
      transactionHash: latestBatch?.transactionHash ?? null,
    },
  };
}

export async function getCoreFeed(): Promise<CoreFeed> {
  try {
    return await getCoreFeedFromApi();
  } catch (error) {
    console.error("Squeek core API unavailable", error);
    return (await readChainView()).feed;
  }
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
