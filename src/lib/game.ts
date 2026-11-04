export const ACTIONS = ["SCOUT", "BUILD", "HARVEST", "DEFEND", "REST"] as const;
export type ActionKind = (typeof ACTIONS)[number];
export type WheelOutcome = "NAP" | "JOG" | "ZOOM";

export const actionMeta: Record<
  ActionKind,
  { label: string; description: string; icon: string; color: string }
> = {
  SCOUT: {
    label: "Scout the mist",
    description: "Reveal paths and rare relics.",
    icon: "◎",
    color: "#b9a7ff",
  },
  BUILD: {
    label: "Raise shelter",
    description: "Turn timber into lasting progress.",
    icon: "⌂",
    color: "#ffca80",
  },
  HARVEST: {
    label: "Gather provisions",
    description: "Keep every citizen well fed.",
    icon: "✦",
    color: "#a8e6a3",
  },
  DEFEND: {
    label: "Guard the gate",
    description: "Lower threat before nightfall.",
    icon: "◇",
    color: "#ff9d8f",
  },
  REST: {
    label: "Study & recover",
    description: "Restore energy and improve morale.",
    icon: "☾",
    color: "#8bd8e8",
  },
};

export function classifyWork(workUnits: number): WheelOutcome {
  if (workUnits === 0) return "NAP";
  if (workUnits < 500) return "JOG";
  return "ZOOM";
}

type Resources = {
  food: number;
  timber: number;
  energy: number;
  morale: number;
  threat: number;
};

export type Resolution = {
  delta: Resources;
  title: string;
  body: string;
  mood: "calm" | "hopeful" | "tense" | "triumphant";
};

export function resolveRound(
  workUnits: number,
  votes: Partial<Record<ActionKind, number>>,
): Resolution {
  const outcome = classifyWork(workUnits);
  const winner = ACTIONS.reduce((best, action) =>
    (votes[action] ?? 0) > (votes[best] ?? 0) ? action : best,
  );
  const people = Math.max(1, Object.values(votes).reduce((a, b) => a + (b ?? 0), 0));
  const effort = Math.min(12, Math.ceil(Math.log2(people + 1) * 3));
  const delta: Resources = { food: -2, timber: 0, energy: -1, morale: 0, threat: 1 };

  if (winner === "SCOUT") {
    delta.timber += outcome === "NAP" ? 4 + effort : 7 + effort;
    delta.threat += outcome === "ZOOM" ? 3 : 0;
  } else if (winner === "BUILD") {
    delta.timber -= Math.min(8, 3 + effort);
    delta.morale += outcome === "JOG" ? 7 : 4;
  } else if (winner === "HARVEST") {
    delta.food += (outcome === "JOG" ? 12 : 7) + effort;
  } else if (winner === "DEFEND") {
    delta.threat -= (outcome === "ZOOM" ? 12 : 7) + effort;
    delta.energy -= 2;
  } else {
    delta.energy += (outcome === "NAP" ? 14 : 7) + effort;
    delta.morale += outcome === "NAP" ? 7 : 3;
  }

  const copy: Record<WheelOutcome, { title: string; body: string; mood: Resolution["mood"] }> = {
    NAP: {
      title: "Quiet paws, clever work",
      body: `The wheel fell silent. ${actionMeta[winner].label} continued by lantern light, and the colony found strength in the pause.`,
      mood: "calm",
    },
    JOG: {
      title: "A steady rhythm",
      body: `A measured run powered the ${actionMeta[winner].label.toLowerCase()} crew. Every small turn moved the colony forward.`,
      mood: "hopeful",
    },
    ZOOM: {
      title: "The wheel roared",
      body: `${workUnits.toLocaleString()} work units lit the valley. The ${actionMeta[winner].label.toLowerCase()} crew moved before the echoes could wake what sleeps beyond the gate.`,
      mood: "triumphant",
    },
  };

  return { delta, ...copy[outcome] };
}
