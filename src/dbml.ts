/**
 * DBML iz opisa tablica (`contract.ts`), za crtanje u open-diagramu i dbdiagram.io.
 *
 * `schema.dbml` u korijenu repoa je izlaz ove funkcije; test ruši build ako se
 * razilaze, pa se dijagram ne može tiho razići od opisa. Osvježi: `npm run dbml`.
 *
 * Ovdje je samo PRIKAZ: grupe, boje, objašnjenja vrijednosti skupova, bilješke na
 * platnu i pogledi. Značenje tablica i stupaca je u `contract.ts` (`note`).
 */
import { ALL_TABLES, type Column, type TableSpec } from "./contract.js";
import * as sets from "./sets.js";

type AnyTable = TableSpec<Record<string, unknown>>;
type Sets = typeof sets;
type SetName = { [K in keyof Sets]: Sets[K] extends readonly string[] ? K : never }[keyof Sets];
type ValueNotes<K extends SetName> = Partial<Record<Sets[K][number], string>>;

/** Grupe na platnu: boja grupe = boja zaglavlja njezinih tablica i veza iz njih. */
const GROUPS = [
  {
    name: "kampanja",
    color: "#1f6f4a",
    note: "Što se financira, tko to vodi i gdje stoji novac (Safe).",
    tables: ["campaigns", "organizers", "campaign_safes", "campaign_subjects", "campaign_tiers"],
  },
  {
    name: "isporuka",
    color: "#a8660b",
    note: "Što se obećalo i što je izvedeno: javna razrada troška, plan i izvedba isplate, tijek, dokumenti.",
    tables: ["budget_lines", "milestones", "payouts", "timeline_steps", "campaign_documents"],
  },
  {
    name: "doprinosi",
    color: "#1d5fa8",
    note: "Projekcija raila (pay.domovina.ai) i lanca. Ovdje se ništa ne izmišlja; sve se može ponovo izgraditi.",
    tables: ["contributions", "contribution_events", "contribution_profiles", "campaign_stats", "subscriptions"],
  },
  {
    name: "vertikale",
    color: "#7a45b8",
    note: "Tablice 1:1 uz kampanju koje jezgra ne poznaje. Nova vrsta projekta = nova vertikala, jezgra se ne dira.",
    tables: ["campaign_energy", "campaign_community", "members"],
  },
] as const;

/** Objašnjenje vrijednosti skupa; ključ mora biti član skupa (provjerava kompilator). */
const VALUE_NOTES: { readonly [K in SetName]?: ValueNotes<K> } = {
  CAMPAIGN_TYPES: {
    donation: "dar bez protučinidbe",
    membership: "članski ulog u zajednicu (energy: community)",
    reward: "doprinos s nagradom (pinka: crowdfund)",
    tickets: "ulaznice",
  },
  CAMPAIGN_STATES: {
    draft: "uređuje se, nije javna",
    review: "čeka provjeru (pinka je nema: prikazuje se kao draft)",
    active: "prima doprinose",
    funded: "cilj postignut; isporuka teče u timeline_steps",
    closed: "završena",
    cancelled: "otkazana prije cilja",
  },
  VISIBILITIES: { private: "samo organizator", unlisted: "tko ima poveznicu", public: "u popisima" },
  CAMPAIGN_MODES: {
    integrated: "Mod 1: platforma je izvođač i nositelj",
    byo: "Mod 2: klijentov IBAN i Safe, platforma ne drži ključ",
  },
  CAMPAIGN_RAILS: { platform: "naš Monerium IBAN i Safe", client: "klijentov Monerium IBAN i Safe" },
  VERTICALS: {
    none: "samo jezgra",
    energy: "uz red u campaign_energy",
    community: "uz red u campaign_community",
  },
  PAYMENT_RAILS: { sepa: "SEPA preko Moneriuma (EURe na Safe)", onchain: "izravno na Safe", card: "kartica" },
  CONTRIBUTION_STATES: {
    pending: "intent otvoren, novac nije stigao",
    paid: "stiglo na Safe",
    failed: "nije prošlo",
    refunded: "vraćeno uplatitelju",
    expired: "intent istekao bez uplate",
  },
  PAYOUT_STATES: {
    requested: "zatraženo",
    approved: "odobreno",
    submitted: "prijedlog u Safeu, skuplja potpise",
    confirmed: "izvršeno na lancu",
    failed: "nije izvršeno",
  },
  DOCUMENT_KINDS: { contractor_quote: "ponuda izvođača (energy: installer_quote)", grid_decision: "rješenje HEP-ODS-a" },
  SITE_RIGHTS: { co_owner_consent: "suglasnost suvlasnika", building_right: "pravo građenja", lease: "zakup" },
  MEMBER_ROLES: { signer: "drži ključ Safea" },
};

/** Bilješke na platnu: ono što se ne vidi iz pojedine tablice. Ime je naslov. */
const STICKY_NOTES: readonly { name: string; color: string; text: string }[] = [
  {
    name: "kako_citati",
    color: "#334155",
    text: `- boja zaglavlja i veze = grupa tablice iz koje veza kreće
- žuti kutić = stupac ima bilješku (prijeđi mišem)
- novac: INTEGER centi; vrijeme: INTEGER unix ms; ID: UUIDv7 kao TEXT
- enum je u D1 TEXT + CHECK (x IN (…))
- „pinka: t.s” = isti podatak u pinka_finance (Postgres, api.domovina.ai)
- „→ …” = vrijednost pokazuje izvan ove baze (rail, lanac, registar)`,
  },
  {
    name: "tok_novca",
    color: "#1d5fa8",
    text: `uplatitelj → Monerium IBAN → EURe na Safe kampanje
rail (pay.domovina.ai) vidi uplatu → webhook_outbox → Worker jezgre
→ contributions (+ contribution_events) → campaign_stats
Isplata: milestones (plan) → payouts → prijedlog u Safeu → potpisi → tx_hash
Rail je izvor istine; ova baza je projekcija i može se ponovo izgraditi.`,
  },
  {
    name: "sukob_interesa_mod1",
    color: "#a8660b",
    text: `Platforma je ujedno izvođač koji naplaćuje. Zato:
- 2 × campaign_safes.platform_signer_count ≤ threshold
  (prag 3-od-5 → najviše jedan naš ključ)
- budget_lines je javan prije uplate, marža izvođača je zaseban red
- organizers.is_platform / campaign_energy.contractor → trajna objava`,
  },
  {
    name: "pravna_granica",
    color: "#b42318",
    text: `Ne postoji ni kao vrijednost: tokenization, realestate, token_tranche,
pozicije, prinos, udio u dobiti. Pinka ih ima; mapper ih odbija s razlogom.
members.share_basis_points = udio u energiji i glasu, nikad u dobiti.
Uplata se nikad ne opisuje kao povratna.`,
  },
  {
    name: "vertikala",
    color: "#7a45b8",
    text: `campaigns.vertical kaže koja tablica 1:1 nosi specifično.
campaign_id je ondje i primarni i strani ključ.
Koraci timeline_steps.key dolaze iz vertikale (energy: submitted → connected).`,
  },
];

/** Pogledi: isti model, manje tablica na platnu. */
const VIEWS: readonly {
  name: string;
  groups?: readonly string[];
  tables?: readonly string[];
  notes: readonly string[];
}[] = [
  { name: "jezgra", groups: ["kampanja", "isporuka"], notes: ["kako_citati", "sukob_interesa_mod1"] },
  {
    name: "novac",
    groups: ["doprinosi"],
    tables: ["campaigns", "campaign_safes", "campaign_tiers", "milestones", "payouts"],
    notes: ["tok_novca"],
  },
  {
    name: "vertikale",
    groups: ["vertikale"],
    tables: ["campaigns", "campaign_documents"],
    notes: ["vertikala", "pravna_granica"],
  },
];

const q = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

function setNameOf(values: readonly string[]): SetName | undefined {
  for (const [name, v] of Object.entries(sets)) if (v === values) return name as SetName;
  return undefined;
}

function columnLine(table: AnyTable, name: string, col: Column): string {
  const setName = col.values !== undefined ? setNameOf(col.values) : undefined;
  const type = setName !== undefined ? setName.toLowerCase() : col.sql.toLowerCase();
  const attrs: string[] = [];
  const pk = table.primaryKey.length === 1 && table.primaryKey[0] === name;
  if (pk) attrs.push("pk");
  if (!col.nullable && !pk) attrs.push("not null");
  if (col.bool === true) attrs.push(`check: \`${name} IN (0, 1)\``);
  if (col.json === true) attrs.push(`check: \`json_valid(${name})\``);
  const notes: string[] = [];
  if (col.note !== undefined) notes.push(col.note);
  const tags: string[] = [];
  if (name.endsWith("_cents")) tags.push("centi");
  else if (name.endsWith("_at")) tags.push("unix ms");
  if (col.bool === true) tags.push("boolean");
  if (col.json === true) tags.push("JSON");
  if (tags.length > 0) notes.push(tags.join(", "));
  if (col.external !== undefined) notes.push(`→ ${col.external}`);
  if (col.pinka !== undefined) notes.push(`pinka: ${col.pinka}`);
  if (notes.length > 0) attrs.push(`note: ${q(notes.join(" · "))}`);
  return `  ${name} ${type}${attrs.length > 0 ? ` [${attrs.join(", ")}]` : ""}`;
}

function tableBlock(table: AnyTable, color: string): string {
  const lines = [`Table ${table.name} [headercolor: ${color}] {`];
  for (const [name, col] of Object.entries(table.columns as Record<string, Column>)) {
    lines.push(columnLine(table, name, col));
  }
  const indexes: string[] = [];
  if (table.primaryKey.length > 1) indexes.push(`    (${table.primaryKey.join(", ")}) [pk]`);
  for (const u of table.unique ?? []) {
    const cols = u.columns.length === 1 ? u.columns[0]! : `(${u.columns.join(", ")})`;
    const note = u.where !== undefined ? `djelomični: WHERE ${u.where}` : "jedinstveno";
    indexes.push(`    ${cols} [unique, note: ${q(note)}]`);
  }
  if (indexes.length > 0) lines.push("", "  indexes {", ...indexes, "  }");
  lines.push("", `  Note: ${q(table.note)}`, "}");
  return lines.join("\n");
}

export function toDbml(): string {
  const tables = ALL_TABLES as readonly AnyTable[];
  const colorOf = new Map<string, string>();
  for (const g of GROUPS) for (const t of g.tables) colorOf.set(t, g.color);
  const rule = `// ${"=".repeat(78)}`;

  const out: string[] = [
    "// GENERIRANO iz src/contract.ts i src/dbml.ts (npm run dbml). Ne uređuj ručno: test ruši build kad se razilazi.",
    "// Prikaz: https://stepanic.github.io/open-diagram/?url=https://github.com/domovinatv/campaign-core/blob/main/schema.dbml",
    "",
    "Project campaign_core {",
    "  database_type: 'SQLite'",
    "  Note: '''",
    "    # campaign-core: jezgra kampanje na Cloudflare D1",
    "",
    "    Jedna jezgra za svaku vrstu P2P kampanje (dar, članski ulog, nagrada, ulaznice).",
    "    Ono što je specifično za vrstu projekta živi u vertikali, tablici 1:1 uz kampanju:",
    "    prva je elektrana (`campaign_energy`), druga energetska zajednica.",
    "",
    "    - Rail (pay.domovina.ai) je izvor istine za novac; doprinosi ovdje su projekcija.",
    "    - `pinka:` u bilješci stupca je isti podatak u pinka_finance (domovina.ai).",
    "    - Odluke i obrazloženje: energy.domovina.ai `docs/19`.",
    "  '''",
    "}",
  ];

  // Enumi redom prvog pojavljivanja u tablicama: redoslijed ključeva u `import * as`
  // nije isti u Nodeu (abecedno) i u vitestu (redom deklaracije).
  const used: (readonly string[])[] = [];
  for (const t of tables) {
    for (const col of Object.values(t.columns as Record<string, Column>)) {
      if (col.values !== undefined && !used.includes(col.values)) used.push(col.values);
    }
  }
  out.push("", rule, "// Zatvoreni skupovi (src/sets.ts). U D1: TEXT + CHECK (x IN (…)).", rule);
  for (const values of used) {
    const name = setNameOf(values);
    const notes = (name !== undefined ? VALUE_NOTES[name] : undefined) as Readonly<Record<string, string>> | undefined;
    out.push("", `Enum ${name?.toLowerCase() ?? "unnamed"} {`);
    for (const v of values) {
      const note = notes?.[v];
      out.push(note !== undefined ? `  ${v} [note: ${q(note)}]` : `  ${v}`);
    }
    out.push("}");
  }

  for (const g of GROUPS) {
    out.push("", rule, `// ${g.name}: ${g.note}`, rule);
    for (const name of g.tables) {
      const t = tables.find((x) => x.name === name);
      if (t !== undefined) out.push("", tableBlock(t, g.color));
    }
  }

  out.push("", rule, "// Veze. Boja = grupa tablice iz koje veza kreće. `-` = 1:1, `>` = mnogo prema jedan.", rule, "");
  for (const g of GROUPS) {
    for (const name of g.tables) {
      const t = tables.find((x) => x.name === name);
      if (t === undefined) continue;
      for (const [col, spec] of Object.entries(t.columns as Record<string, Column>)) {
        if (spec.ref === undefined) continue;
        // 1:1 kad je strani ključ cijeli primarni ključ (vertikala, Safe, agregat, profil).
        const oneToOne = t.primaryKey.length === 1 && t.primaryKey[0] === col;
        out.push(`Ref ${t.name}__${col}: ${t.name}.${col} ${oneToOne ? "-" : ">"} ${spec.ref} [color: ${g.color}]`);
      }
    }
  }

  out.push("", rule, "// Grupe, bilješke na platnu i pogledi", rule);
  for (const g of GROUPS) {
    out.push("", `TableGroup ${g.name} [color: ${g.color}] {`, ...g.tables.map((t) => `  ${t}`), `  Note: ${q(g.note)}`, "}");
  }

  for (const n of STICKY_NOTES) {
    out.push("", `Note ${n.name} [color: ${n.color}] {`, "  '''", ...n.text.split("\n").map((l) => `  ${l}`), "  '''", "}");
  }

  for (const v of VIEWS) {
    out.push("", `DiagramView ${v.name} {`);
    if (v.groups !== undefined) out.push("  TableGroups {", ...v.groups.map((g) => `    ${g}`), "  }");
    if (v.tables !== undefined) out.push("  Tables {", ...v.tables.map((t) => `    ${t}`), "  }");
    out.push("  Notes {", ...v.notes.map((n) => `    ${n}`), "  }", "}");
  }

  out.push("");
  return out.join("\n");
}

/** Za test: svaka tablica je u točno jednoj grupi. */
export const DBML_GROUPS: readonly { readonly name: string; readonly tables: readonly string[] }[] = GROUPS;
