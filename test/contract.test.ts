import { describe, expect, it } from "vitest";
import snapshot from "../contract/pinka-columns.json" with { type: "json" };
import { ALL_TABLES, CORE_TABLES, type Column } from "../src/contract.js";
import { CAMPAIGN_TYPES, REJECTED_PINKA_CAMPAIGN_TYPES, REJECTED_PINKA_TIER_KINDS, TIER_KINDS } from "../src/sets.js";

type PinkaTables = Record<string, readonly { name: string; type: string; nullable: boolean }[]>;
const pinka = snapshot.tables as PinkaTables;

function columnsOf(table: (typeof ALL_TABLES)[number]): [string, Column][] {
  return Object.entries(table.columns as Record<string, Column>);
}

describe("ugovor prema pinka_finance (snimka contract/pinka-columns.json)", () => {
  it("snimka je svježa: najviše 30 dana", () => {
    const ageDays = (Date.now() - Date.parse(snapshot.captured_at)) / 86_400_000;
    // Stara snimka ne štiti: preimenovanje u domovina-api bi prošlo neopaženo.
    // Osvježi: ./scripts/snapshot-pinka.sh
    expect(ageDays).toBeLessThan(30);
  });

  for (const table of ALL_TABLES) {
    for (const [name, col] of columnsOf(table)) {
      if (col.pinka === undefined) continue;
      it(`${table.name}.${name} → pinka ${col.pinka} postoji`, () => {
        const [pt, pc] = col.pinka!.split(".") as [string, string];
        const cols = pinka[pt];
        expect(cols, `tablica ${pt} nema u pinka_finance`).toBeDefined();
        expect(cols!.map((c) => c.name)).toContain(pc);
      });
    }
  }
});

describe("ugovor iznutra", () => {
  it("imena tablica su jedinstvena", () => {
    const names = ALL_TABLES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const table of ALL_TABLES) {
    it(`${table.name}: primarni i jedinstveni ključevi su stvarni stupci`, () => {
      const cols = Object.keys(table.columns);
      for (const k of table.primaryKey) expect(cols).toContain(k);
      for (const u of table.unique ?? []) for (const k of u.columns) expect(cols).toContain(k);
    });
  }

  it("svaka tablica jezgre osim samih kampanja i organizatora veže se na kampanju", () => {
    for (const table of CORE_TABLES) {
      if (table.name === "campaigns" || table.name === "organizers") continue;
      const cols = Object.keys(table.columns);
      expect(cols.includes("campaign_id") || cols.includes("contribution_id"), table.name).toBe(true);
    }
  });

  it("novac je uvijek INTEGER u centima, nikad REAL", () => {
    for (const table of ALL_TABLES) {
      for (const [name, col] of columnsOf(table)) {
        if (name.endsWith("_cents")) expect(col.sql, `${table.name}.${name}`).toBe("INTEGER");
      }
    }
  });

  it("vrijeme je INTEGER (unix ms)", () => {
    for (const table of ALL_TABLES) {
      for (const [name, col] of columnsOf(table)) {
        if (name.endsWith("_at")) expect(col.sql, `${table.name}.${name}`).toBe("INTEGER");
      }
    }
  });
});

describe("pravna granica (energy docs/03 §3, docs/19 §6.3)", () => {
  it("nijedna odbijena pinka vrsta nije u jezgri", () => {
    for (const t of REJECTED_PINKA_CAMPAIGN_TYPES) expect(CAMPAIGN_TYPES as readonly string[]).not.toContain(t);
    for (const k of REJECTED_PINKA_TIER_KINDS) expect(TIER_KINDS as readonly string[]).not.toContain(k);
  });

  it("odbijene vrste i dalje postoje u pinki, pa je odbijanje stvarno", () => {
    // Ako ih pinka ukloni, ovaj test pada i popis odbijenih se može skratiti.
    expect(pinka["token_positions"]).toBeDefined();
  });

  it("jezgra ne sadrži nijednu tablicu ni stupac iz pinkinih pozicija", () => {
    const names = ALL_TABLES.flatMap((t) => [t.name, ...Object.keys(t.columns)]);
    for (const n of names) expect(n).not.toMatch(/position|token|atoken|accrued|principal/);
  });
});
