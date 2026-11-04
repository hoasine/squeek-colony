import { describe, expect, it } from "vitest";
import { proofForRound, type CoreFeed } from "./squeekchain";

function feed(events: CoreFeed["events"]): CoreFeed {
  return {
    installationId: "test",
    chainId: 11155111,
    safeThroughBlock: 100,
    coreAddress: "0xcore",
    genesisTimestamp: 0,
    roundDuration: 600,
    settledThroughRound: 12,
    events,
  };
}

const batch = {
  eventName: "BatchSettled",
  transactionHash: "0xbatch",
  blockNumber: "100",
  arguments: [
    { name: "previousSettledThroughRound", value: "10" },
    { name: "settledThroughRound", value: "12" },
    { name: "activeRoundCount", value: "1" },
  ],
};

describe("proofForRound", () => {
  it("reads active work from RoundRecorded in the same transaction", () => {
    const result = proofForRound(
      feed([
        batch,
        {
          eventName: "RoundRecorded",
          transactionHash: "0xbatch",
          blockNumber: "100",
          arguments: [
            { name: "roundId", value: "11" },
            { name: "work", value: "672" },
          ],
        },
      ]),
      11,
    );
    expect(result).toEqual({
      round: 11,
      workUnits: 672,
      transactionHash: "0xbatch",
      blockNumber: 100,
    });
  });

  it("proves an omitted round in a settled range as zero work", () => {
    expect(proofForRound(feed([batch]), 12)?.workUnits).toBe(0);
  });

  it("does not guess when the covering event has left the API window", () => {
    expect(proofForRound(feed([batch]), 9)).toBeNull();
  });
});
