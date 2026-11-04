import { describe, expect, it } from "vitest";
import { classifyWork, resolveRound } from "./game";

describe("classifyWork", () => {
  it("maps settled work into humane game outcomes", () => {
    expect(classifyWork(0)).toBe("NAP");
    expect(classifyWork(1)).toBe("JOG");
    expect(classifyWork(499)).toBe("JOG");
    expect(classifyWork(500)).toBe("ZOOM");
  });
});

describe("resolveRound", () => {
  it("rewards resting when the wheel naps", () => {
    const result = resolveRound(0, { REST: 4, SCOUT: 1 });
    expect(result.delta.energy).toBeGreaterThan(0);
    expect(result.mood).toBe("calm");
  });

  it("reduces threat when defense wins", () => {
    const result = resolveRound(650, { DEFEND: 8, BUILD: 2 });
    expect(result.delta.threat).toBeLessThan(0);
    expect(result.title).toBe("The wheel roared");
  });

  it("is deterministic for the same canonical result", () => {
    const votes = { HARVEST: 5, BUILD: 2 } as const;
    expect(resolveRound(240, votes)).toEqual(resolveRound(240, votes));
  });
});
