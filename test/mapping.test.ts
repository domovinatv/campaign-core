import { describe, expect, it } from "vitest";
import {
  fromEnergyDocumentKind,
  fromEnergyProjectModel,
  fromEnergyProjectState,
  fromPinkaCampaignState,
  fromPinkaCampaignType,
  fromPinkaChain,
  fromPinkaTierKind,
  toPinkaCampaignState,
  toPinkaCampaignType,
} from "../src/mapping.js";

describe("pinka → jezgra", () => {
  it("dopuštene vrste", () => {
    expect(fromPinkaCampaignType("donation")).toEqual({ ok: true, value: "donation" });
    expect(fromPinkaCampaignType("crowdfund")).toEqual({ ok: true, value: "reward" });
    expect(fromPinkaCampaignType("tickets")).toEqual({ ok: true, value: "tickets" });
  });

  it("odbija tokenization i realestate s razlogom, ne prevodi ih tiho", () => {
    for (const t of ["tokenization", "realestate"]) {
      const r = fromPinkaCampaignType(t);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/pravne granice/);
    }
    expect(fromPinkaTierKind("token_tranche").ok).toBe(false);
  });

  it("nepoznata vrijednost je greška, ne zadana vrijednost", () => {
    expect(fromPinkaCampaignType("nesto").ok).toBe(false);
    expect(fromPinkaCampaignState("review").ok).toBe(false);
    expect(fromPinkaChain("polygon").ok).toBe(false);
  });

  it("stanja i lanac", () => {
    expect(fromPinkaCampaignState("funded")).toEqual({ ok: true, value: "funded" });
    expect(fromPinkaChain(null)).toEqual({ ok: true, value: 100 });
    expect(fromPinkaChain("Gnosis")).toEqual({ ok: true, value: 100 });
  });
});

describe("jezgra → pinka", () => {
  it("članski ulog se ne smije prikazati kao donacija", () => {
    expect(toPinkaCampaignType("membership").ok).toBe(false);
    expect(toPinkaCampaignType("reward")).toEqual({ ok: true, value: "crowdfund" });
  });

  it("review je u pinki draft", () => {
    expect(toPinkaCampaignState("review")).toBe("draft");
    expect(toPinkaCampaignState("active")).toBe("active");
  });

  it("povratno preslikavanje vrsta je stabilno", () => {
    for (const t of ["donation", "reward", "tickets"] as const) {
      const p = toPinkaCampaignType(t);
      expect(p.ok).toBe(true);
      if (p.ok) expect(fromPinkaCampaignType(p.value)).toEqual({ ok: true, value: t });
    }
  });
});

describe("stari energy model → jezgra", () => {
  it("model i stanje", () => {
    expect(fromEnergyProjectModel("community")).toBe("membership");
    expect(fromEnergyProjectModel("donation")).toBe("donation");
    expect(fromEnergyProjectState("expired")).toBe("closed");
    expect(fromEnergyProjectState("building")).toBe("funded");
    expect(fromEnergyProjectState("completed")).toBe("funded");
    expect(fromEnergyProjectState("review")).toBe("review");
  });

  it("ponuda instalatera je općenita ponuda izvođača", () => {
    expect(fromEnergyDocumentKind("installer_quote")).toBe("contractor_quote");
    expect(fromEnergyDocumentKind("statute")).toBe("statute");
  });
});
