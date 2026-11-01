import { describe, expect, it } from "vitest";
import {
  ZERO_ADDRESS,
  canAcceptContributions,
  currentDeliveryStep,
  isUsableAddress,
  isValidThreshold,
  violatesConflictInvariant,
  violatesModeSigners,
} from "../src/invariants.js";
import type { Address, TimelineStep } from "../src/types.js";

const A = "0x4924f440A12ac82F6e06B058a33d7fd8182f1944" as Address;
const B = "0xF3c4d416Fa863F0801605629097ffF07f1d46FB8" as Address;
const C = "0xC2386b03441C6104F8d40E52e74306EAE830A24B" as Address;

describe("violatesConflictInvariant (P7)", () => {
  // Isti slučajevi kao energy lib/__tests__/marketplace.test.ts prije seljenja.
  it.each([
    [3, 1, false],
    [2, 1, false],
    [2, 2, true],
    [3, 2, true],
    [5, 2, false],
    [5, 3, true],
    [1, 1, true],
    [1, 0, false],
  ])("prag %i, naših %i → krši: %s", (threshold, platform_signer_count, expected) => {
    expect(violatesConflictInvariant({ threshold, platform_signer_count })).toBe(expected);
  });
});

describe("violatesModeSigners", () => {
  it("Mod 2 ne dopušta nijedan naš ključ", () => {
    expect(violatesModeSigners("byo", { platform_signer_count: 1 })).toBe(true);
    expect(violatesModeSigners("byo", { platform_signer_count: 0 })).toBe(false);
    expect(violatesModeSigners("integrated", { platform_signer_count: 1 })).toBe(false);
  });
});

describe("adrese i prag", () => {
  it("nulta adresa nije upotrebljiva", () => {
    expect(isUsableAddress(ZERO_ADDRESS)).toBe(false);
    expect(isUsableAddress(A)).toBe(true);
    expect(isUsableAddress("0x123")).toBe(false);
    expect(isUsableAddress(null)).toBe(false);
  });

  it("prag mora biti dostižan", () => {
    expect(isValidThreshold({ threshold: 2, owners: [A, B, C] })).toBe(true);
    expect(isValidThreshold({ threshold: 4, owners: [A, B, C] })).toBe(false);
    expect(isValidThreshold({ threshold: 0, owners: [A] })).toBe(false);
  });
});

describe("canAcceptContributions", () => {
  const safe = { address: A, threshold: 2, owners: [A, B, C], platform_signer_count: 1, verified_at: 1 };
  const live = { state: "active", visibility: "unlisted" } as const;

  it("aktivna kampanja s provjerenim Safeom prima uplate", () => {
    expect(canAcceptContributions(live, safe)).toBe(true);
  });

  it("bez Safea, s nultom adresom, neprovjeren ili s našom većinom: ne", () => {
    expect(canAcceptContributions(live, null)).toBe(false);
    expect(canAcceptContributions(live, { ...safe, address: ZERO_ADDRESS })).toBe(false);
    expect(canAcceptContributions(live, { ...safe, verified_at: null })).toBe(false);
    expect(canAcceptContributions(live, { ...safe, platform_signer_count: 2 })).toBe(false);
  });

  it("samo u stanju active", () => {
    for (const state of ["draft", "review", "funded", "closed", "cancelled"] as const) {
      expect(canAcceptContributions({ ...live, state }, safe)).toBe(false);
    }
  });
});

describe("currentDeliveryStep", () => {
  const step = (key: string, sort: number, actual: number | null): TimelineStep => ({
    campaign_id: "c",
    key,
    sort,
    planned: null,
    actual,
    note: null,
  });

  it("zadnji ostvareni korak po redoslijedu, ne po vremenu upisa", () => {
    expect(currentDeliveryStep([step("funded", 1, 5), step("submitted", 0, 9), step("signed", 2, null)])).toBe(
      "funded",
    );
  });

  it("bez ostvarenih koraka: null", () => {
    expect(currentDeliveryStep([])).toBeNull();
    expect(currentDeliveryStep([step("submitted", 0, null)])).toBeNull();
  });
});
