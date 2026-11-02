/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_TABLES, type Column } from "../src/contract.js";
import { DBML_GROUPS, toDbml } from "../src/dbml.js";

describe("schema.dbml", () => {
  it("jednak je izlazu toDbml() (osvježi: npm run dbml)", () => {
    const file = readFileSync(new URL("../schema.dbml", import.meta.url), "utf8");
    expect(file).toBe(toDbml());
  });

  it("svaka tablica je u točno jednoj grupi", () => {
    const grouped = DBML_GROUPS.flatMap((g) => g.tables);
    expect([...grouped].sort()).toEqual(ALL_TABLES.map((t) => t.name).sort());
  });
});

describe("strani ključevi u opisu tablica", () => {
  const byName = new Map(ALL_TABLES.map((t) => [t.name, t]));
  for (const table of ALL_TABLES) {
    for (const [name, col] of Object.entries(table.columns as Record<string, Column>)) {
      if (col.ref === undefined) continue;
      it(`${table.name}.${name} → ${col.ref} postoji i istog je tipa`, () => {
        const [rt, rc] = col.ref!.split(".") as [string, string];
        const target = byName.get(rt);
        expect(target, `tablica ${rt}`).toBeDefined();
        const targetCol = (target!.columns as Record<string, Column>)[rc];
        expect(targetCol, `stupac ${col.ref}`).toBeDefined();
        expect(targetCol!.sql).toBe(col.sql);
        expect(target!.primaryKey, "ref ide na primarni ključ").toEqual([rc]);
      });
    }
  }

  it("svaki campaign_id je strani ključ na campaigns.id", () => {
    for (const table of ALL_TABLES) {
      const col = (table.columns as Record<string, Column>)["campaign_id"];
      if (col !== undefined) expect(col.ref, table.name).toBe("campaigns.id");
    }
  });
});
